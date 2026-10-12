import assert from 'node:assert/strict'

import type { PayloadRequest } from 'payload'

import { processBroadcasts, recipientsOf, sendHandler, summaryHandler } from '@/lib/broadcastSender'
import { stalePendingNewsletterWhere } from '@/lib/expiry'
import { confirmSubscription, subscribe } from '@/lib/newsletter'

import {
  cleanup,
  email,
  failEmails,
  http,
  makeAdmin,
  makeBooking,
  makeCourse,
  makeSession,
  outbox,
  removeWhere,
  payload,
  richText,
  tag,
  test,
} from './harness'

/**
 * Newsletter (double opt-in) and broadcasts ("Wysyłki"). The send endpoint
 * is called IN this process with a school account on the request, not over
 * HTTP: it starts the queue, and only here are the emails caught.
 */

cleanup(() => removeWhere('newsletter', { email: { contains: tag } }))

async function entryOf(address: string) {
  const { docs } = await payload.find({
    collection: 'newsletter',
    where: { email: { equals: address } },
    limit: 1,
    overrideAccess: true,
  })
  return docs[0]
}

function schoolRequest(id: number, adminEmail: string) {
  return {
    payload,
    user: { collection: 'users', email: adminEmail },
    routeParams: { id },
  } as unknown as PayloadRequest
}

/**
 * "Wyślij" starts the queue by itself, so a tick may already be running: a
 * second call returns at once (the queue lets one tick run at a time). Ticks
 * again until the broadcast leaves `sending` or the pause is set.
 */
async function drainQueue(id: number) {
  for (let i = 0; i < 50; i++) {
    await processBroadcasts(payload)
    const b = await payload.findByID({
      collection: 'broadcasts',
      id,
      joins: false,
      overrideAccess: true,
    })
    if (b.status !== 'sending' || b.pausedUntil) return b
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('the queue did not finish in 5 s')
}

async function makeBroadcast(data: Record<string, unknown>) {
  const broadcast = await payload.create({
    collection: 'broadcasts',
    data: { subject: `Test ${tag}`, content: richText('Treść testowa.'), ...data } as never,
    overrideAccess: true,
  })
  // A broadcast still "sending" refuses deletion, so it is closed first;
  // `beforeDelete` then takes the deliveries with it.
  cleanup(async () => {
    await payload.update({
      collection: 'broadcasts',
      id: broadcast.id,
      data: { status: 'sent' },
      context: { broadcastQueue: true },
      overrideAccess: true,
    })
    await payload.delete({ collection: 'broadcasts', id: broadcast.id, overrideAccess: true })
  })
  return broadcast
}

// --- newsletter -----------------------------------------------------------------

test('newsletter: sign-up waits for the click; a second sign-up within minutes sends nothing', async () => {
  const address = email('nl')
  outbox.length = 0
  await subscribe(payload, address, 'pl')
  const entry = await entryOf(address)
  assert.equal(entry.status, 'pending')
  assert.match(entry.token ?? '', /^[0-9a-f]{64}$/)
  assert.equal(outbox.filter((m) => m.to === address).length, 1)
  assert.match(outbox[0].text, new RegExp(`/newsletter/potwierdz\\?token=${entry.token}`))

  await subscribe(payload, address, 'pl')
  assert.equal(outbox.filter((m) => m.to === address).length, 1, 'a second confirmation went out')
})

test('newsletter: a failed confirmation email can be retried at once', async () => {
  const address = email('nl-retry')
  failEmails(new Error('fetch failed'))
  await assert.rejects(subscribe(payload, address, 'pl'))
  failEmails(null)
  outbox.length = 0
  await subscribe(payload, address, 'pl')
  assert.equal(outbox.filter((m) => m.to === address).length, 1)
})

test('newsletter: opening the confirmation page confirms nothing; the button does', async () => {
  const address = email('nl-confirm')
  await subscribe(payload, address, 'pl')
  const { token } = await entryOf(address)
  const page = await (await http(`/newsletter/potwierdz?token=${token}`)).text()
  assert.match(page, /Potwierdzam zapis/)
  assert.match(page, /noindex/)
  assert.equal((await entryOf(address)).status, 'pending')

  assert.equal(await confirmSubscription(payload, token!), 'confirmed')
  const entry = await entryOf(address)
  assert.equal(entry.status, 'subscribed')
  assert.ok(entry.confirmedAt)

  // Signing up again while subscribed: nothing changes, old unsubscribe links keep working.
  await subscribe(payload, address, 'en')
  assert.equal((await entryOf(address)).token, token)
})

test('newsletter: one-click unsubscribe from the mail client, and the same answer for a bad token', async () => {
  const address = email('nl-out')
  await subscribe(payload, address, 'pl')
  const { token } = await entryOf(address)
  await confirmSubscription(payload, token!)

  const response = await http(`/api/newsletter/unsubscribe?token=${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'List-Unsubscribe=One-Click',
  })
  assert.equal(response.status, 200)
  const entry = await entryOf(address)
  assert.equal(entry.status, 'unsubscribed')
  assert.ok(entry.unsubscribedAt)
  assert.equal(
    (await http('/api/newsletter/unsubscribe?token=nope', { method: 'POST' })).status,
    200,
  )
})

test('newsletter: the daily sweep picks only stale pending sign-ups', async () => {
  const fresh = email('nl-fresh')
  await subscribe(payload, fresh, 'pl')
  const old = await payload.create({
    collection: 'newsletter',
    data: {
      email: email('nl-old'),
      status: 'pending',
      consentText: 'test',
      consentDate: new Date(Date.now() - 9 * 86_400_000).toISOString(),
      confirmationSentAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
    },
    overrideAccess: true,
  })
  const { docs } = await payload.find({
    collection: 'newsletter',
    where: { and: [stalePendingNewsletterWhere(new Date()), { email: { contains: tag } }] },
    limit: 100,
    overrideAccess: true,
  })
  assert.deepEqual(
    docs.map((d) => d.id),
    [old.id],
  )
})

// --- broadcasts -------------------------------------------------------------------

test('broadcasts: who gets one — places only, or with the waiting list; one per address', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id)
  await makeBooking(session.id, 'bc-a', { status: 'confirmed' })
  await makeBooking(session.id, 'bc-b', { status: 'new', language: 'en' })
  await makeBooking(session.id, 'bc-c', { status: 'waitlist' })
  await makeBooking(session.id, 'bc-d', { status: 'cancelled' })

  const places = await recipientsOf(payload, {
    audience: 'session',
    session: session.id,
    includeWaitlist: false,
  })
  assert.deepEqual(places.map((r) => r.email).sort(), [email('bc-a'), email('bc-b')])
  const withWaiting = await recipientsOf(payload, {
    audience: 'session',
    session: session.id,
    includeWaitlist: true,
  })
  assert.equal(withWaiting.length, 3)

  const upcoming = await recipientsOf(payload, {
    audience: 'upcoming',
    session: null,
    includeWaitlist: false,
  })
  assert.ok(upcoming.some((r) => r.email === email('bc-a')))
  assert.ok(!upcoming.some((r) => r.email === email('bc-c')))
})

test('broadcasts: two "Wyślij" clicks at once queue it once, and the queue sends it', async () => {
  const admin = await makeAdmin()
  const course = await makeCourse()
  const session = await makeSession(course.id)
  await makeBooking(session.id, 'q-a')
  await makeBooking(session.id, 'q-b', { language: 'en' })
  const broadcast = await makeBroadcast({
    audience: 'session',
    session: session.id,
    subjectEn: `Test EN ${tag}`,
    contentEn: richText('English body.'),
  })

  const draft = await (await summaryHandler(schoolRequest(broadcast.id, admin.email))).json()
  assert.deepEqual([draft.recipients, draft.english, draft.hasEnglish], [2, 1, true])

  outbox.length = 0
  const responses = await Promise.all([
    sendHandler(schoolRequest(broadcast.id, admin.email)),
    sendHandler(schoolRequest(broadcast.id, admin.email)),
  ])
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409])
  const { totalDocs } = await payload.count({
    collection: 'broadcast-deliveries',
    where: { broadcast: { equals: broadcast.id } },
    overrideAccess: true,
  })
  assert.equal(totalDocs, 2)

  const sent = await drainQueue(broadcast.id)
  assert.equal(sent.status, 'sent')
  assert.equal(sent.sentCount, 2)
  assert.ok(outbox.some((m) => m.to === email('q-a') && m.subject === `Test ${tag}`))
  assert.ok(outbox.some((m) => m.to === email('q-b') && m.subject === `Test EN ${tag}`))
  // A booking message is service information, not marketing: no unsubscribe header.
  assert.ok(outbox.every((m) => !m.headers?.['List-Unsubscribe']))

  await assert.rejects(
    payload.update({
      collection: 'broadcasts',
      id: broadcast.id,
      data: { subject: 'zmiana' },
      overrideAccess: true,
    }),
    /już wysłana/,
  )
})

test('broadcasts: a copy from "Zduplikuj" cannot go out until someone saves it', async () => {
  // Found in testing 12.10.2026: the copy is saved at once, so one click on
  // "Wyślij" sent the same message a second time.
  const admin = await makeAdmin()
  const course = await makeCourse()
  const session = await makeSession(course.id)
  await makeBooking(session.id, 'copy-a')
  const original = await makeBroadcast({ audience: 'session', session: session.id })
  await sendHandler(schoolRequest(original.id, admin.email))
  await drainQueue(original.id)

  const copy = await payload.duplicate({
    collection: 'broadcasts',
    id: original.id,
    overrideAccess: true,
  })
  cleanup(() => payload.delete({ collection: 'broadcasts', id: copy.id, overrideAccess: true }))
  assert.equal(copy.status, 'draft')
  assert.equal(copy.subject, `Test ${tag}`)
  assert.equal(original.copyUnreviewed, false, 'a new broadcast is not a copy')

  const before = await (await summaryHandler(schoolRequest(copy.id, admin.email))).json()
  assert.equal(before.unreviewedCopy, true)
  const refused = await sendHandler(schoolRequest(copy.id, admin.email))
  assert.equal(refused.status, 409, 'an unreviewed copy must not be queued')
  const { totalDocs } = await payload.count({
    collection: 'broadcast-deliveries',
    where: { broadcast: { equals: copy.id } },
    overrideAccess: true,
  })
  assert.equal(totalDocs, 0)

  // Saving it — or "Sprawdzone", the same write from the panel — is the decision.
  const saved = await payload.update({
    collection: 'broadcasts',
    id: copy.id,
    data: { subject: copy.subject },
    overrideAccess: true,
  })
  assert.equal(saved.copyUnreviewed, false)
  const after = await (await summaryHandler(schoolRequest(copy.id, admin.email))).json()
  assert.equal(after.unreviewedCopy, false)
})

test('broadcasts: the daily limit pauses the queue and keeps the recipients', async () => {
  const admin = await makeAdmin()
  const course = await makeCourse()
  const session = await makeSession(course.id)
  await makeBooking(session.id, 'lim-a')
  const broadcast = await makeBroadcast({ audience: 'session', session: session.id })

  failEmails(new Error('Brevo refused the email: 402 {"code":"not_enough_credits"}'))
  await sendHandler(schoolRequest(broadcast.id, admin.email))
  const paused = await drainQueue(broadcast.id)
  assert.equal(paused.status, 'sending')
  assert.ok(paused.pausedUntil && Date.parse(paused.pausedUntil) > Date.now())
  const { docs } = await payload.find({
    collection: 'broadcast-deliveries',
    where: { broadcast: { equals: broadcast.id } },
    overrideAccess: true,
  })
  assert.deepEqual(
    docs.map((d) => d.status),
    ['pending'],
  )
  // Leave nothing for the real queue of a running server to send.
  await payload.update({
    collection: 'broadcast-deliveries',
    where: { broadcast: { equals: broadcast.id } },
    data: { status: 'failed' },
    overrideAccess: true,
  })
})

test('broadcasts: a newsletter goes to confirmed addresses only, with one-click unsubscribe', async () => {
  const admin = await makeAdmin()
  const yes = email('nl-yes')
  await subscribe(payload, yes, 'pl')
  await confirmSubscription(payload, (await entryOf(yes)).token!)
  await subscribe(payload, email('nl-pending'), 'pl')

  const recipients = await recipientsOf(payload, {
    audience: 'newsletter',
    session: null,
    includeWaitlist: false,
  })
  const ours = recipients.map((r) => r.email)
  assert.ok(ours.includes(yes), 'a confirmed address is missing')
  assert.ok(!ours.includes(email('nl-pending')), 'an unconfirmed address would get it')
  assert.ok(!ours.includes(email('nl-out')), 'an unsubscribed address would get it')

  // Sending a newsletter here would reach every confirmed address in this
  // database, so the email itself is checked through the test send.
  const broadcast = await makeBroadcast({ audience: 'newsletter' })
  outbox.length = 0
  const { testHandler } = await import('@/lib/broadcastSender')
  const response = await testHandler(schoolRequest(broadcast.id, admin.email))
  assert.equal(response.status, 200)
  assert.match(outbox[0].subject, /^\[PRÓBA\] /)
  assert.match(outbox[0].text, /Wypisz się z newslettera/)
  assert.equal(outbox[0].to, admin.email)
})

test('broadcasts: one broken broadcast does not stop the queue for the others', async () => {
  const admin = await makeAdmin()
  const course = await makeCourse()
  const gone = await makeSession(course.id)
  const kept = await makeSession(course.id)
  await makeBooking(gone.id, 'stuck-a')
  await makeBooking(kept.id, 'flow-a')
  const stuck = await makeBroadcast({ audience: 'session', session: gone.id })
  const flowing = await makeBroadcast({ audience: 'session', session: kept.id })

  // Queued while the first one's session still existed…
  failEmails(new Error('Brevo refused the email: 402 {"code":"not_enough_credits"}'))
  await sendHandler(schoolRequest(stuck.id, admin.email))
  await drainQueue(stuck.id)
  failEmails(null)
  // …then the session went (Postgres empties the optional `session`), and the pause ran out.
  await payload.db.updateOne({
    collection: 'broadcasts',
    id: stuck.id,
    data: { session: null, pausedUntil: null },
  })

  outbox.length = 0
  await sendHandler(schoolRequest(flowing.id, admin.email))
  const done = await drainQueue(flowing.id)
  assert.equal(done.status, 'sent', 'the queue stopped at the broken broadcast')
  assert.ok(outbox.some((m) => m.to === email('flow-a')))

  // The stuck one finishes too, with the general note instead of an empty session label.
  const finished = await drainQueue(stuck.id)
  assert.equal(finished.status, 'sent')
  const note = outbox.find((m) => m.to === email('stuck-a'))
  assert.ok(note, 'the broadcast without a session was not sent')
  assert.doesNotMatch(note.text, /masz zapis na: \./)
})

test('broadcasts: a database hiccup at the start of a tick does not stop the queue for good', async () => {
  const admin = await makeAdmin()
  const course = await makeCourse()
  const session = await makeSession(course.id)
  await makeBooking(session.id, 'hiccup-a')
  const broadcast = await makeBroadcast({ audience: 'session', session: session.id })

  // The next tick cannot even open its transaction…
  const begin = payload.db.beginTransaction
  payload.db.beginTransaction = async () => {
    throw new Error('connection terminated')
  }
  await processBroadcasts(payload).catch(() => undefined)
  payload.db.beginTransaction = begin

  // …and the one after it still runs.
  outbox.length = 0
  await sendHandler(schoolRequest(broadcast.id, admin.email))
  const done = await drainQueue(broadcast.id)
  assert.equal(done.status, 'sent')
  assert.ok(outbox.some((m) => m.to === email('hiccup-a')))
})
