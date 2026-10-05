import assert from 'node:assert/strict'

import { createBooking, type BookingInput } from '@/lib/bookingService'
import { recordEmailIssue } from '@/lib/bookingEffects'

import {
  email,
  failEmails,
  makeBooking,
  makeCourse,
  makeSession,
  outbox,
  payload,
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
