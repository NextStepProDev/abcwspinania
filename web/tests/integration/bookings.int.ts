import assert from 'node:assert/strict'

import { createBooking, type BookingInput } from '@/lib/bookingService'
import { recordEmailIssue } from '@/lib/bookingEffects'
import { anonymizeExpiredBookings } from '@/lib/accountCleanup'
import { idOf } from '@/lib/bookingEffects'

import {
  cleanup,
  email,
  failEmails,
  makeBooking,
  makeCustomer,
  makeCourse,
  makeSession,
  outbox,
  payload,
  removeWhere,
  test,
} from './harness'

/**
 * Booking a course: the locked transaction (`lib/bookingService.ts`), the
 * spot count, and what happens to the emails around it.
 */

function input(sessionId: number, courseId: number, name: string): BookingInput {
  return {
    sessionId,
    courseId,
    contact: { firstName: name, lastName: 'Test', email: email(name), phone: '+48600100200' },
    notes: null,
    language: 'pl',
    customerId: null,
    wantsAccount: false,
  }
}

test('five people at once for the last place: one gets it, four the waiting list', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id, { capacity: 1 })
  const results = await Promise.all(
    ['a', 'b', 'c', 'd', 'e'].map((n) =>
      createBooking(payload, input(session.id, course.id, `race-${n}`)),
    ),
  )
  const statuses = results.map((r) => (r.kind === 'created' ? r.status : r.kind)).sort()
  assert.deepEqual(statuses, ['new', 'waitlist', 'waitlist', 'waitlist', 'waitlist'])
  const after = await payload.findByID({
    collection: 'sessions',
    id: session.id,
    joins: false,
    overrideAccess: true,
  })
  assert.equal(after.spotsLeft, 0)
  assert.equal(after.status, 'waitlist')
})

test('a double click books once', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id)
  const same = input(session.id, course.id, 'double')
  const results = await Promise.all([1, 2, 3].map(() => createBooking(payload, same)))
  assert.deepEqual(results.map((r) => r.kind).sort(), ['created', 'duplicate', 'duplicate'])
  const { totalDocs } = await payload.count({
    collection: 'bookings',
    where: { email: { equals: email('double') } },
    overrideAccess: true,
  })
  assert.equal(totalDocs, 1)
})

test('booked without an account, then again with "create an account": the account comes from the first booking', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id)
  const first = input(session.id, course.id, 'reaccount')
  cleanup(() => removeWhere('customers', { email: { equals: first.contact.email } }))
  assert.equal((await createBooking(payload, first)).kind, 'created')

  const again = await createBooking(payload, {
    ...first,
    contact: { ...first.contact, firstName: 'Inna', lastName: 'Osoba', phone: '+48600999999' },
    wantsAccount: true,
  })
  assert.equal(again.kind, 'duplicate')
  assert.ok(again.kind === 'duplicate' && again.newAccount, 'an account was made')
  assert.equal(again.newAccount.firstName, 'reaccount')
  assert.equal(again.newAccount.lastName, 'Test')
  assert.equal(again.newAccount.phone, '+48600100200')
  const { totalDocs } = await payload.count({
    collection: 'bookings',
    where: { email: { equals: first.contact.email } },
    overrideAccess: true,
  })
  assert.equal(totalDocs, 1)
})

test('a double click with "create an account": one account, one email', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id)
  const same = { ...input(session.id, course.id, 'doubleaccount'), wantsAccount: true }
  cleanup(() => removeWhere('customers', { email: { equals: same.contact.email } }))
  const first = await createBooking(payload, same)
  assert.ok(first.kind === 'created' && first.newAccount)
  const second = await createBooking(payload, same)
  assert.equal(second.kind, 'duplicate')
  // Neither a second account nor a confirmation link on top of the set-password one.
  assert.ok(second.kind === 'duplicate' && !second.newAccount && !second.unconfirmedAccount)
})

test('no booking on a draft course, a past date or another course’s session', async () => {
  const draft = await makeCourse(false)
  const draftSession = await makeSession(draft.id)
  assert.equal(
    (await createBooking(payload, input(draftSession.id, draft.id, 'draft'))).kind,
    'unavailable',
  )

  const course = await makeCourse()
  const past = await makeSession(course.id, { daysAhead: -3 })
  assert.equal(
    (await createBooking(payload, input(past.id, course.id, 'past'))).kind,
    'unavailable',
  )

  const other = await makeCourse()
  const otherSession = await makeSession(other.id)
  assert.equal(
    (await createBooking(payload, input(otherSession.id, course.id, 'mismatch'))).kind,
    'unavailable',
  )
})

test('a cancellation frees the place and tells the school who is waiting', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id, { capacity: 1 })
  const first = await createBooking(payload, input(session.id, course.id, 'first'))
  await createBooking(payload, input(session.id, course.id, 'waiting'))
  assert.equal(first.kind, 'created')
  outbox.length = 0
  await payload.update({
    collection: 'bookings',
    id: first.kind === 'created' ? first.booking.id : 0,
    data: { status: 'cancelled' },
    overrideAccess: true,
  })
  const after = await payload.findByID({
    collection: 'sessions',
    id: session.id,
    joins: false,
    overrideAccess: true,
  })
  assert.equal(after.spotsLeft, 1)
  assert.equal(after.status, 'open')
  assert.ok(
    outbox.some((m) => m.to === email('first') && /anulowany/.test(m.subject)),
    'no cancellation email',
  )
  if (process.env.ADMIN_NOTIFY_EMAIL) {
    const notice = outbox.find((m) => /Zwolniło się miejsce/.test(m.subject))
    assert.ok(notice, 'no "place freed" email to the school')
    assert.match(notice.text, new RegExp(email('waiting')))
  }
})

test('a phone booking without an address is counted, and nobody is emailed about it', async () => {
  // Decided 12.10.2026: the school may add someone who gave only a phone.
  const course = await makeCourse()
  const session = await makeSession(course.id, { capacity: 1 })
  const phone = await makeBooking(session.id, 'phone', { status: 'new', email: '' })
  await makeBooking(session.id, 'phone-waiting', { status: 'waitlist', email: '  ' })
  assert.equal(phone.email ?? null, null, 'an empty field is stored as no address')

  outbox.length = 0
  await payload.update({
    collection: 'bookings',
    id: phone.id,
    data: { status: 'confirmed' },
    overrideAccess: true,
  })
  const saved = await payload.findByID({
    collection: 'bookings',
    id: phone.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.equal(outbox.length, 0, 'a status email went out with no address')
  assert.equal(saved.emailIssue ?? null, null, 'no address is not a failed email')

  await payload.update({
    collection: 'bookings',
    id: phone.id,
    data: { status: 'cancelled' },
    overrideAccess: true,
  })
  assert.ok(!outbox.some((m) => /anulowany/.test(m.subject)))
  if (process.env.ADMIN_NOTIFY_EMAIL) {
    // The school still hears about the freed place, with the phone to call.
    const notice = outbox.find((m) => /Zwolniło się miejsce/.test(m.subject))
    assert.ok(notice, 'no "place freed" email to the school')
    assert.match(notice.text, /phone-waiting Test, \+48600100200/)
    assert.doesNotMatch(notice.text, /null|undefined/)
  }
})

test('a status email that fails is noted on the booking, in words, and can be ticked off', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id)
  const booking = await makeBooking(session.id, 'lost', { status: 'new' })

  failEmails(new Error('Brevo refused the email: 402 {"code":"not_enough_credits"}'))
  const started = Date.now()
  await payload.update({
    collection: 'bookings',
    id: booking.id,
    data: { status: 'confirmed' },
    overrideAccess: true,
  })
  assert.ok(Date.now() - started < 10_000, 'the save waited on its own row lock')
  let saved = await payload.findByID({
    collection: 'bookings',
    id: booking.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.equal(saved.status, 'confirmed')
  assert.match(saved.emailIssue ?? '', /^Mail „miejsce potwierdzone” — .*dzienny limit/)
  assert.equal(saved.emailIssueHandled, false)

  // A second failure on the same open issue is added, not replacing the first.
  await recordEmailIssue(
    payload,
    booking.id,
    'Link do ustawienia hasła (nowe konto)',
    new Error('fetch failed'),
  )
  saved = await payload.findByID({
    collection: 'bookings',
    id: booking.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.match(saved.emailIssue ?? '', /miejsce potwierdzone.*; Link do ustawienia hasła/)

  // Ticked off, then a new failure: a fresh note, open again.
  await payload.update({
    collection: 'bookings',
    id: booking.id,
    data: { emailIssueHandled: true },
    overrideAccess: true,
  })
  failEmails(new Error('Brevo refused the email: 400 {"message":"email is not valid"}'))
  await payload.update({
    collection: 'bookings',
    id: booking.id,
    data: { status: 'cancelled' },
    overrideAccess: true,
  })
  saved = await payload.findByID({
    collection: 'bookings',
    id: booking.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.match(saved.emailIssue ?? '', /^Mail „zapis anulowany” — Brevo odrzucił ten adres/)
  assert.equal(saved.emailIssueHandled, false)
})

test('deleting an account keeps its bookings, unlinked', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id)
  const customer = await payload.create({
    collection: 'customers',
    data: {
      email: email('leaving'),
      password: 'integration-test-password',
      firstName: 'Leaving',
      lastName: 'Test',
      phone: '+48600100200',
      consentText: 'test',
      consentDate: new Date().toISOString(),
    } as never,
    overrideAccess: true,
    disableVerificationEmail: true,
  })
  const booking = await makeBooking(session.id, 'leaving', { customer: customer.id })
  await payload.delete({ collection: 'customers', id: customer.id, overrideAccess: true })
  const after = await payload.findByID({
    collection: 'bookings',
    id: booking.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.equal(after.customer ?? null, null)
  assert.equal(after.status, 'confirmed')
})

test('bookings are anonymized five years after their course’s year; newer ones and accounts’ stay', async () => {
  const course = await makeCourse()
  // Over six years ago, left "open" with a waiting list (see the note on
  // `skipRecount` in `anonymizeExpiredBookings`).
  const old = await makeSession(course.id, { capacity: 1, daysAhead: -6 * 366 })
  const recent = await makeSession(course.id, { daysAhead: -3 * 365 })
  const expired = await makeBooking(old.id, 'retention-old', { notes: 'Jem bez glutenu' })
  const waiting = await makeBooking(old.id, 'retention-waiting', { status: 'waitlist' })
  const kept = await makeBooking(recent.id, 'retention-recent')
  const owner = await makeCustomer('retention-owner')
  const onAccount = await makeBooking(old.id, 'retention-owner', { customer: owner.id })
  const before = outbox.length

  await anonymizeExpiredBookings()

  const byId = async (id: number) =>
    payload.findByID({ collection: 'bookings', id, depth: 0, overrideAccess: true })
  // The trace stays for statistics: which date, how many, what status.
  for (const id of [expired.id, waiting.id]) {
    const b = await byId(id)
    assert.ok(b.anonymizedAt, `booking ${id} marked`)
    assert.equal(idOf(b.session), old.id)
    for (const field of ['firstName', 'lastName', 'email', 'phone', 'consentText'] as const)
      assert.equal(b[field], '', `${field} cleared`)
    assert.equal(b.notes ?? null, null)
    assert.doesNotMatch(b.label ?? '', /retention/)
  }
  assert.equal((await byId(waiting.id)).status, 'waitlist')
  // Newer bookings and an account's own history are left as they were.
  assert.equal((await byId(kept.id)).anonymizedAt ?? null, null)
  const own = await byId(onAccount.id)
  assert.equal(own.anonymizedAt ?? null, null)
  assert.equal(own.email, email('retention-owner'))
  assert.equal(outbox.length, before, 'no email')

  // A second sweep finds nothing left to do.
  const markedAt = (await byId(expired.id)).anonymizedAt
  await anonymizeExpiredBookings()
  assert.equal((await byId(expired.id)).anonymizedAt, markedAt)

  // Out of the panel's list and the dashboard's counts, still in the database.
  const listed = await payload.find({
    collection: 'bookings',
    where: { and: [{ session: { equals: old.id } }, { anonymizedAt: { exists: false } }] },
    depth: 0,
    overrideAccess: true,
  })
  assert.deepEqual(
    listed.docs.map((b) => b.id),
    [onAccount.id],
  )
})

test('a booking carries its session’s start for the list order, also after the dates change', async () => {
  const course = await makeCourse()
  const later = await makeSession(course.id, { daysAhead: 40 })
  const sooner = await makeSession(course.id, { daysAhead: 10 })
  const a = await makeBooking(later.id, 'order-later')
  const b = await makeBooking(sooner.id, 'order-sooner')
  assert.equal(a.sessionStart, later.startDate)
  assert.equal(b.sessionStart, sooner.startDate)

  // The list sorts by it (`defaultSort`): the sooner session first.
  const { docs } = await payload.find({
    collection: 'bookings',
    where: { id: { in: [a.id, b.id] } },
    sort: 'sessionStart',
    depth: 0,
    overrideAccess: true,
  })
  assert.deepEqual(
    docs.map((d) => d.id),
    [b.id, a.id],
  )

  // The school moves the later session ahead of the other one.
  const moved = new Date(Date.now() + 5 * 86_400_000).toISOString()
  await payload.update({
    collection: 'sessions',
    id: later.id,
    data: { startDate: moved },
    overrideAccess: true,
  })
  const after = await payload.findByID({
    collection: 'bookings',
    id: a.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.equal(after.sessionStart, moved)
})
