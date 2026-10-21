import assert from 'node:assert/strict'

import { createCampBookings, type CampBookingInput } from '@/lib/bookingService'

import { cleanup, email, makeCamp, makeSession, payload, removeWhere, test } from './harness'

/**
 * Signing children up for a camp (`createCampBookings`): one booking per
 * child under the course booking's lock, siblings on one address, the
 * duplicate check by child.
 */

function input(
  sessionId: number,
  campId: number,
  parent: string,
  children: string[],
): CampBookingInput {
  return {
    sessionId,
    campId,
    contact: { firstName: parent, lastName: 'Test', email: email(parent), phone: '+48600100200' },
    children: children.map((name) => ({ firstName: name, lastName: 'Test' })),
    notes: null,
    language: 'pl',
    customerId: null,
    wantsAccount: false,
  }
}

async function bookingsOf(parent: string) {
  const { docs } = await payload.find({
    collection: 'bookings',
    where: { email: { equals: email(parent) } },
    sort: 'createdAt',
    depth: 0,
    limit: 20,
    overrideAccess: true,
    showHiddenFields: true,
  })
  return docs
}

test('siblings on one address get a camp booking each, named after the child', async () => {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true })
  const result = await createCampBookings(
    payload,
    input(session.id, camp.id, 'siblings', ['Zosia', 'Staś']),
  )
  assert.equal(result.kind, 'done')
  const docs = await bookingsOf('siblings')
  assert.deepEqual(
    docs.map((b) => [b.kind, b.childFirstName, b.firstName]),
    [
      ['camp', 'Zosia', 'siblings'],
      ['camp', 'Staś', 'siblings'],
    ],
  )
  assert.match(docs[0].label ?? '', /^Zosia Test · /)
  // One key to their one registration form, stored — and not handed out.
  assert.ok(docs[0].registrationToken)
  assert.equal(docs[0].registrationToken, docs[1].registrationToken)
  const plain = await payload.findByID({
    collection: 'bookings',
    id: docs[0].id,
    depth: 0,
    overrideAccess: true,
  })
  assert.equal(plain.registrationToken, undefined)
})

test('the same children again add nothing; a new sibling is added', async () => {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true })
  const first = input(session.id, camp.id, 'again', ['Zosia', 'Staś'])
  await Promise.all([1, 2, 3].map(() => createCampBookings(payload, first)))
  assert.equal((await bookingsOf('again')).length, 2, 'a triple click books each child once')

  const more = await createCampBookings(payload, {
    ...first,
    children: [
      { firstName: ' zosia ', lastName: 'TEST' },
      { firstName: 'Ala', lastName: 'Test' },
    ],
  })
  assert.ok(more.kind === 'done')
  assert.deepEqual(
    more.children.map((c) => c.created),
    [false, true],
  )
  assert.equal(more.children[0].registrationToken, null, 'no new link for a booked child')
  assert.equal((await bookingsOf('again')).length, 3)
})

test('two children for the last place: the first gets it, the second the waiting list', async () => {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true, capacity: 1 })
  const result = await createCampBookings(
    payload,
    input(session.id, camp.id, 'lastplace', ['Zosia', 'Staś']),
  )
  assert.ok(result.kind === 'done')
  assert.deepEqual(
    result.children.map((c) => c.status),
    ['new', 'waitlist'],
  )
  const after = await payload.findByID({
    collection: 'sessions',
    id: session.id,
    joins: false,
    overrideAccess: true,
  })
  assert.equal(after.spotsLeft, 0)
})

test('a child on the waiting list gets no form link; the one with a place does', async () => {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true, capacity: 1 })
  const result = await createCampBookings(
    payload,
    input(session.id, camp.id, 'splitlink', ['Zosia', 'Staś']),
  )
  assert.ok(result.kind === 'done')
  assert.ok(result.children[0].registrationToken)
  assert.equal(result.children[1].registrationToken, null)
})

test('"together or the waiting list": siblings who do not all fit wait together', async () => {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true, capacity: 1 })
  const result = await createCampBookings(payload, {
    ...input(session.id, camp.id, 'together', ['Zosia', 'Staś']),
    togetherOrWaitlist: true,
  })
  assert.ok(result.kind === 'done')
  assert.deepEqual(
    result.children.map((c) => c.status),
    ['waitlist', 'waitlist'],
  )
  const after = await payload.findByID({
    collection: 'sessions',
    id: session.id,
    joins: false,
    overrideAccess: true,
  })
  assert.equal(after.spotsLeft, 1, 'the place stays free for someone else')
})

test('"together" changes nothing when there are places for all', async () => {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true, capacity: 2 })
  const result = await createCampBookings(payload, {
    ...input(session.id, camp.id, 'togetherfits', ['Zosia', 'Staś']),
    togetherOrWaitlist: true,
  })
  assert.ok(result.kind === 'done')
  assert.deepEqual(
    result.children.map((c) => c.status),
    ['new', 'new'],
  )
})

test('no camp booking on a draft camp, a trip, a past turnus or another camp’s session', async () => {
  const draft = await makeCamp({ published: false })
  const draftSession = await makeSession(draft.id, { camp: true })
  assert.equal(
    (await createCampBookings(payload, input(draftSession.id, draft.id, 'draft', ['A']))).kind,
    'unavailable',
  )

  const trip = await makeCamp({ kind: 'trip' })
  const tripSession = await makeSession(trip.id, { camp: true })
  assert.equal(
    (await createCampBookings(payload, input(tripSession.id, trip.id, 'trip', ['A']))).kind,
    'unavailable',
  )

  const camp = await makeCamp()
  const past = await makeSession(camp.id, { camp: true, daysAhead: -3 })
  assert.equal(
    (await createCampBookings(payload, input(past.id, camp.id, 'past', ['A']))).kind,
    'unavailable',
  )

  const other = await makeCamp()
  const otherSession = await makeSession(other.id, { camp: true })
  assert.equal(
    (await createCampBookings(payload, input(otherSession.id, camp.id, 'mismatch', ['A']))).kind,
    'unavailable',
  )
})

test('"create an account" on a camp sign-up makes one account for the parent', async () => {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true })
  const sign = {
    ...input(session.id, camp.id, 'campaccount', ['Zosia', 'Staś']),
    wantsAccount: true,
  }
  cleanup(() => removeWhere('customers', { email: { equals: sign.contact.email } }))
  const result = await createCampBookings(payload, sign)
  assert.ok(result.kind === 'done' && result.newAccount)
  assert.equal(result.newAccount.firstName, 'campaccount')
  const docs = await bookingsOf('campaccount')
  assert.ok(docs.every((b) => b.customer === result.newAccount!.id))
})
