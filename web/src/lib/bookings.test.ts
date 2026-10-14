import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ACTIVE_STATUSES,
  anonymizedLabel,
  availability,
  formatSessionDates,
  isUpcoming,
  newBookingStatus,
  signUpPath,
  statusEmailFor,
} from '@/lib/bookings'
import { isValid, validateBooking } from '@/lib/validation'

// --- spots ------------------------------------------------------------------

test('spots left are the capacity minus the active bookings', () => {
  assert.deepEqual(availability(10, 3), { spotsLeft: 7, full: false })
  assert.deepEqual(availability(10, 10), { spotsLeft: 0, full: true })
})

test('more bookings than places never shows a negative number', () => {
  // The school can add bookings by hand past the capacity (a friend joins).
  assert.deepEqual(availability(8, 9), { spotsLeft: 0, full: true })
})

test('without a capacity nothing is counted — the site keeps saying "ask"', () => {
  assert.deepEqual(availability(null, 4), { spotsLeft: null, full: false })
  assert.deepEqual(availability(undefined, 0), { spotsLeft: null, full: false })
})

test('waiting list and cancelled bookings do not take a place', () => {
  assert.deepEqual([...ACTIVE_STATUSES].sort(), ['confirmed', 'deposit', 'new', 'paid'])
})

test('a booking on a full session lands on the waiting list', () => {
  assert.equal(newBookingStatus({ spotsLeft: 0, full: true }, 'open'), 'waitlist')
  assert.equal(newBookingStatus({ spotsLeft: 3, full: false }, 'open'), 'new')
  assert.equal(newBookingStatus({ spotsLeft: null, full: false }, 'open'), 'new')
})

test('with a capacity the count decides; the hand-set status only without one', () => {
  // A capacity makes the status follow the count (lib/bookingEffects.ts) —
  // a hand-set "waiting list" with places free would be switched back to
  // "open" by the recount right after this booking, so the next person
  // would get a place this one did not.
  assert.equal(newBookingStatus({ spotsLeft: 3, full: false }, 'waitlist'), 'new')
  // No capacity: nothing is counted, the school's status is all there is.
  assert.equal(newBookingStatus({ spotsLeft: null, full: false }, 'waitlist'), 'waitlist')
})

// --- "Moje konto": upcoming vs archive ---------------------------------------

const now = new Date('2026-10-10T12:00:00.000Z')

test('a session counts as upcoming until its last day is over', () => {
  assert.equal(isUpcoming({ startDate: '2026-10-12T00:00:00.000Z' }, now), true)
  assert.equal(isUpcoming({ startDate: '2026-10-01T00:00:00.000Z' }, now), false)
  // Running right now: started yesterday, ends tomorrow.
  const running = { startDate: '2026-10-09T00:00:00.000Z', endDate: '2026-10-11T00:00:00.000Z' }
  assert.equal(isUpcoming(running, now), true)
  // Its last day is today — still upcoming until the day ends (UTC dates).
  assert.equal(isUpcoming({ startDate: '2026-10-10T00:00:00.000Z' }, now), true)
})

// --- emails on status change -------------------------------------------------

test('the participant is told about confirmation, payment and cancellation only', () => {
  assert.equal(statusEmailFor('new', 'confirmed'), 'confirmed')
  assert.equal(statusEmailFor('waitlist', 'confirmed'), 'confirmed')
  assert.equal(statusEmailFor('confirmed', 'paid'), 'paid')
  assert.equal(statusEmailFor('deposit', 'paid'), 'paid')
  assert.equal(statusEmailFor('confirmed', 'cancelled'), 'cancelled')
  // Internal steps and no-ops send nothing.
  assert.equal(statusEmailFor('confirmed', 'deposit'), null)
  assert.equal(statusEmailFor('new', 'waitlist'), null)
  assert.equal(statusEmailFor('paid', 'paid'), null)
  assert.equal(statusEmailFor('cancelled', 'cancelled'), null)
})

test('"paid" emails only before the course starts — cash on the first day gets no email', () => {
  // A session from 20 October, stored the way the panel stores Polish
  // midnight (22:00 UTC the day before) and as plain UTC midnight.
  for (const start of ['2026-10-19T22:00:00.000Z', '2026-10-20T00:00:00.000Z']) {
    // The evening before (Polish time): still before the course.
    assert.equal(
      statusEmailFor('confirmed', 'paid', start, new Date('2026-10-19T19:00:00Z')),
      'paid',
    )
    // 00:30 on the first day in Poland (22:30 UTC the day before): started.
    assert.equal(statusEmailFor('confirmed', 'paid', start, new Date('2026-10-19T22:30:00Z')), null)
    // During and after the course: started.
    assert.equal(statusEmailFor('deposit', 'paid', start, new Date('2026-10-21T10:00:00Z')), null)
    assert.equal(statusEmailFor('deposit', 'paid', start, new Date('2026-11-05T10:00:00Z')), null)
  }
})

test('only "paid" depends on the start — confirmation and cancellation always email', () => {
  const started = { start: '2026-10-20T00:00:00.000Z', now: new Date('2026-10-21T10:00:00Z') }
  assert.equal(statusEmailFor('new', 'confirmed', started.start, started.now), 'confirmed')
  assert.equal(statusEmailFor('confirmed', 'cancelled', started.start, started.now), 'cancelled')
})

test('without a known start, "paid" still counts as emailing — the safe side for the question', () => {
  assert.equal(statusEmailFor('confirmed', 'paid', null), 'paid')
  assert.equal(statusEmailFor('confirmed', 'paid', 'not a date'), 'paid')
})

// --- dates in emails ---------------------------------------------------------

test('session dates read naturally in both languages', () => {
  const from = '2027-06-26T00:00:00.000Z'
  const to = '2027-07-03T00:00:00.000Z'
  assert.equal(formatSessionDates('pl', from, to), '26 czerwca – 3 lipca 2027')
  assert.equal(formatSessionDates('en', from, to), '26 June – 3 July 2027')
  assert.equal(formatSessionDates('en', '2027-05-04T00:00:00.000Z'), '4 May 2027')
})

test('English dates are read in UTC too — no day lost west of Greenwich', () => {
  // A calendar date stored as UTC midnight must not become the 25th anywhere.
  assert.match(formatSessionDates('en', '2027-06-26T00:00:00.000Z'), /^26 June/)
})

// --- the booking form --------------------------------------------------------

const booking = {
  sessionId: '12',
  firstName: 'Ola',
  lastName: 'Nowak',
  email: 'ola@example.com',
  phone: '+48600100200',
  notes: '',
  consent: true,
}

test('a complete booking from a visitor without an account passes', () => {
  assert.ok(isValid(validateBooking(booking, false)))
})

test('a visitor without an account must give every contact field', () => {
  const errors = validateBooking(
    { ...booking, firstName: '', lastName: '', email: 'x', phone: '600' },
    false,
  )
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'firstName', 'lastName', 'phone'])
})

test('a logged-in participant only picks the session and consents', () => {
  // Contact details come from the account, not from the form.
  const errors = validateBooking(
    { ...booking, firstName: '', lastName: '', email: '', phone: '' },
    true,
  )
  assert.ok(isValid(errors))
})

test('a session must be chosen and consent given in every case', () => {
  assert.ok(validateBooking({ ...booking, sessionId: '' }, true).sessionId)
  assert.ok(validateBooking({ ...booking, sessionId: 'abc' }, true).sessionId)
  assert.ok(validateBooking({ ...booking, consent: false }, true).consent)
})

test('notes are optional but bounded', () => {
  assert.ok(isValid(validateBooking({ ...booking, notes: 'Mam własną uprząż.' }, false)))
  assert.ok(validateBooking({ ...booking, notes: 'a'.repeat(2001) }, false).notes)
})

// --- a place frees up while people wait ---------------------------------------

import { placeFreedForWaitlist } from '@/lib/bookings'

test('the school hears about a freed place only when someone is waiting', () => {
  assert.equal(placeFreedForWaitlist(0, 1, 2), true, 'full → one free, two waiting')
  assert.equal(placeFreedForWaitlist(1, 2, 1), true, 'more places while someone waits')
  assert.equal(placeFreedForWaitlist(0, 1, 0), false, 'nobody waiting')
  assert.equal(placeFreedForWaitlist(1, 0, 3), false, 'a place taken, not freed')
  assert.equal(placeFreedForWaitlist(2, 2, 3), false, 'no change')
  assert.equal(placeFreedForWaitlist(null, 3, 3), false, 'the first count is not a freed place')
})

test('a course date signs up on its booking form, with that date chosen', () => {
  assert.equal(
    signUpPath({ id: 42, courseSlug: 'kurs-skalny', campSlug: null }),
    '/kursy/kurs-skalny/zapis?session=42',
  )
})

test('a camp date asks through the contact form until camps take bookings', () => {
  assert.equal(
    signUpPath({ id: 7, courseSlug: null, campSlug: 'oboz-letni' }),
    '/kontakt?camp=oboz-letni',
  )
  assert.equal(signUpPath({ id: 7, courseSlug: null, campSlug: null }), '/kontakt')
})

test('an anonymized booking keeps its date in the label, not the name', () => {
  assert.equal(
    anonymizedLabel('Ola Nowak · 4–9 maj 2027 · Kurs PZA'),
    'zanonimizowany · 4–9 maj 2027 · Kurs PZA',
  )
  assert.equal(anonymizedLabel('Ola Nowak'), 'zanonimizowany')
  assert.equal(anonymizedLabel(null), 'zanonimizowany')
})
