import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import { resendVerification } from '@/app/(frontend)/konto/actions'

import {
  cleanup,
  email,
  http,
  makeAdmin,
  makeBooking,
  makeCourse,
  makeCustomer,
  makeSession,
  outbox,
  payload,
  removeWhere,
  richText,
  test,
} from './harness'
import { newToken } from '@/lib/newsletter'
import { saveAccountDetails } from '@/lib/accountDetails'

/**
 * Participant accounts over HTTP — what a person sees on the pages the
 * account emails link to.
 */

async function unconfirmedAccount(name: string, sentAt: Date) {
  const customer = await payload.create({
    collection: 'customers',
    data: {
      email: email(name),
      password: 'integration-test-password',
      firstName: name,
      lastName: 'Test',
      phone: '+48600100200',
      language: 'pl',
      consentText: 'test',
      consentDate: new Date().toISOString(),
      _verified: false,
    } as never,
    overrideAccess: true,
    disableVerificationEmail: true,
  })
  cleanup(() => removeWhere('customers', { id: { equals: customer.id } }))
  // The same write path the site uses (`sendVerificationLink`).
  const token = crypto.randomBytes(20).toString('hex')
  await payload.db.updateOne({
    collection: 'customers',
    id: customer.id,
    data: { _verificationToken: token, verificationSentAt: sentAt.toISOString() },
  })
  return { id: customer.id, token }
}

test('the confirmation link still says "confirmed" when opened again', async () => {
  // Reported 10.10.2026: the account was confirmed, yet the page said the
  // link did not work — a second opening (a reload, a mail scanner, a double
  // click) found the token already gone.
  const { id, token } = await unconfirmedAccount('confirm-twice', new Date())
  const first = await (await http(`/konto/potwierdz?token=${token}`)).text()
  assert.match(first, /Adres potwierdzony/)
  const second = await (await http(`/konto/potwierdz?token=${token}`)).text()
  assert.match(second, /Adres potwierdzony/, 'second opening')
  const account = await payload.findByID({ collection: 'customers', id, overrideAccess: true })
  assert.equal(account._verified, true)
})

test('an expired confirmation link confirms nothing', async () => {
  const { id, token } = await unconfirmedAccount(
    'confirm-late',
    new Date(Date.now() - 3 * 86_400_000),
  )
  const page = await (await http(`/konto/potwierdz?token=${token}`)).text()
  assert.match(page, /Ten link wygasł/)
  const account = await payload.findByID({ collection: 'customers', id, overrideAccess: true })
  assert.equal(account._verified, false)
})

test('"Wyślij link ponownie" on a confirmed address sends the "already confirmed" email', async () => {
  // Reported 10.10.2026: it sent nothing, while the page said a link was sent.
  const customer = await makeCustomer('resend-confirmed')
  const form = new FormData()
  form.set('email', customer.email)
  const answer = await resendVerification({ status: 'idle' }, form)
  assert.equal(answer.status, 'done')
  const mail = outbox.filter((m) => m.to === customer.email)
  assert.equal(mail.length, 1)
  assert.match(mail[0].subject, /Masz już konto/)
  assert.match(mail[0].text, /już potwierdzony/)
})

test('the school erases everything about one person, only after typing the address again', async () => {
  const admin = await makeAdmin()
  const person = await makeCustomer('erase-me')
  const other = await makeCustomer('erase-me-not')
  const course = await makeCourse()
  const session = await makeSession(course.id)
  const own = await makeBooking(session.id, 'erase-me', { customer: person.id })
  const loose = await makeBooking(session.id, 'erase-me') // made without logging in
  const kept = await makeBooking(session.id, 'erase-me-not', { customer: other.id })
  // Contains the address but is not it — `like` finds it, the exact check must not.
  const lookalike = await makeBooking(session.id, 'erase-me-lookalike', {
    email: `a${person.email}`,
  })
  const message = await payload.create({
    collection: 'messages',
    data: {
      name: 'Erase Me',
      email: person.email.toUpperCase(), // typed by hand, in capitals
      message: 'Pytanie',
      consentText: 'test',
      consentDate: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  })
  cleanup(() => removeWhere('messages', { id: { equals: message.id } }))
  const subscription = await payload.create({
    collection: 'newsletter',
    data: {
      email: person.email,
      status: 'subscribed',
      token: newToken(),
      language: 'pl',
      consentText: 'test',
      consentDate: new Date().toISOString(),
    },
    overrideAccess: true,
  })
  cleanup(() => removeWhere('newsletter', { id: { equals: subscription.id } }))
  // The table the panel does not show: who a sent broadcast went to.
  const broadcast = await payload.create({
    collection: 'broadcasts',
    data: { subject: 'Test', content: richText('Treść.'), audience: 'newsletter' } as never,
    overrideAccess: true,
  })
  cleanup(() =>
    payload.delete({ collection: 'broadcasts', id: broadcast.id, overrideAccess: true }),
  )
  const [delivery, otherDelivery] = await Promise.all(
    [person.email, other.email].map((address) =>
      payload.create({
        collection: 'broadcast-deliveries',
        data: { broadcast: broadcast.id, email: address, language: 'pl' } as never,
        overrideAccess: true,
      }),
    ),
  )

  const summary = await (
    await http(`/api/customers/erase?email=${encodeURIComponent(person.email)}`, {
      token: admin.token,
    })
  ).json()
  assert.equal(summary.account?.email, person.email)
  assert.equal(summary.bookings, 2)
  assert.equal(summary.messages, 1)
  assert.equal(summary.newsletter, 1)
  assert.equal(summary.deliveries, 1)

  // A participant may not ask, and a wrong confirmation erases nothing.
  const asParticipant = await http('/api/customers/erase', {
    method: 'POST',
    token: other.token,
    body: JSON.stringify({ email: person.email, confirm: person.email }),
  })
  assert.equal(asParticipant.status, 403)
  const mistyped = await http('/api/customers/erase', {
    method: 'POST',
    token: admin.token,
    body: JSON.stringify({ email: person.email, confirm: 'someone@else.pl' }),
  })
  assert.equal(mistyped.status, 400)
  assert.equal(
    (
      await payload.count({
        collection: 'bookings',
        where: { id: { in: [own.id, loose.id] } },
        overrideAccess: true,
      })
    ).totalDocs,
    2,
  )

  const erased = await http('/api/customers/erase', {
    method: 'POST',
    token: admin.token,
    body: JSON.stringify({ email: person.email, confirm: ` ${person.email.toUpperCase()} ` }),
  })
  assert.equal(erased.status, 200)

  const count = async (
    collection: 'customers' | 'bookings' | 'messages' | 'newsletter' | 'broadcast-deliveries',
    ids: number[],
  ) =>
    (await payload.count({ collection, where: { id: { in: ids } }, overrideAccess: true }))
      .totalDocs
  assert.equal(await count('customers', [person.id]), 0)
  assert.equal(await count('bookings', [own.id, loose.id]), 0)
  assert.equal(await count('messages', [message.id]), 0)
  assert.equal(await count('newsletter', [subscription.id]), 0)
  assert.equal(await count('broadcast-deliveries', [delivery.id]), 0)
  assert.equal(await count('broadcast-deliveries', [otherDelivery.id]), 1)
  // Somebody else's account and bookings — also one whose address contains
  // this one — are untouched.
  assert.equal(await count('customers', [other.id]), 1)
  assert.equal(await count('bookings', [kept.id, lookalike.id]), 2)
})

test('the school downloads a copy of one person’s data — no secrets in it', async () => {
  const admin = await makeAdmin()
  const person = await makeCustomer('copy-me')
  const course = await makeCourse()
  const session = await makeSession(course.id)
  await makeBooking(session.id, 'copy-me', { customer: person.id, notes: 'Bez glutenu' })
  const subscription = await payload.create({
    collection: 'newsletter',
    data: {
      email: person.email,
      status: 'subscribed',
      token: newToken(),
      language: 'pl',
      consentText: 'zgoda na newsletter',
      consentDate: new Date().toISOString(),
    },
    overrideAccess: true,
  })
  cleanup(() => removeWhere('newsletter', { id: { equals: subscription.id } }))

  const asParticipant = await http(
    `/api/customers/person-data?email=${encodeURIComponent(person.email)}`,
    { token: person.token },
  )
  assert.equal(asParticipant.status, 403)

  // By default the readable document the person gets back (12.10.2026).
  const page = await http(
    `/api/customers/person-data?email=${encodeURIComponent(person.email.toUpperCase())}`,
    { token: admin.token },
  )
  assert.equal(page.status, 200)
  assert.match(page.headers.get('content-type') ?? '', /text\/html/)
  assert.match(page.headers.get('content-disposition') ?? '', /attachment;.*\.html"/)
  const document = await page.text()
  assert.match(document, /Twoje dane w ABC Wspinania/)
  assert.match(document, /Bez glutenu/)
  assert.doesNotMatch(document, new RegExp(subscription.token as string))

  // `format=json` — the same data for moving it to another company.
  const response = await http(
    `/api/customers/person-data?email=${encodeURIComponent(person.email.toUpperCase())}&format=json`,
    { token: admin.token },
  )
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-disposition') ?? '', /attachment;.*\.json"/)
  const text = await response.text()
  const copy = JSON.parse(text)
  assert.equal(copy.account.email, person.email)
  assert.equal(copy.bookings.length, 1)
  assert.equal(copy.bookings[0].notes, 'Bez glutenu')
  assert.ok(copy.bookings[0].session, 'which course and date')
  assert.equal(copy.newsletter.length, 1)
  // Passwords, tokens and sessions are not the person's data — they are keys.
  assert.doesNotMatch(text, /"(hash|salt|token|_verificationToken|resetPasswordToken|sessions)"/)
  assert.doesNotMatch(text, new RegExp(subscription.token as string))
})

test('"Twoje dane": the account and its upcoming bookings change; cancelled and past ones stay', async () => {
  const customer = await makeCustomer('details')
  const course = await makeCourse()
  const ahead = await makeSession(course.id)
  const later = await makeSession(course.id)
  const past = await makeSession(course.id, { daysAhead: -40 })
  const mine = { customer: customer.id, email: customer.email }
  const upcoming = await makeBooking(ahead.id, 'details', mine)
  const cancelled = await makeBooking(later.id, 'details', { ...mine, status: 'cancelled' })
  const old = await makeBooking(past.id, 'details', mine)
  const spotsBefore = (
    await payload.findByID({
      collection: 'sessions',
      id: ahead.id,
      joins: false,
      overrideAccess: true,
    })
  ).spotsLeft
  outbox.length = 0

  const details = { firstName: 'Aleksandra', lastName: 'Nowak-Kowalska', phone: '+48700200300' }
  assert.equal(await saveAccountDetails(payload, customer.id, details), 1)

  const account = await payload.findByID({
    collection: 'customers',
    id: customer.id,
    overrideAccess: true,
  })
  assert.deepEqual(
    { firstName: account.firstName, lastName: account.lastName, phone: account.phone },
    details,
  )
  const read = (id: number) =>
    payload.findByID({ collection: 'bookings', id, depth: 0, overrideAccess: true })
  const now = await read(upcoming.id)
  assert.deepEqual({ firstName: now.firstName, lastName: now.lastName, phone: now.phone }, details)
  assert.match(now.label ?? '', /^Aleksandra Nowak-Kowalska/, 'the panel label follows the name')
  assert.equal(now.status, upcoming.status, 'the status is untouched')
  for (const kept of [cancelled, old]) {
    const doc = await read(kept.id)
    assert.equal(doc.firstName, 'details')
    assert.equal(doc.phone, '+48600100200')
  }
  const spotsAfter = (
    await payload.findByID({
      collection: 'sessions',
      id: ahead.id,
      joins: false,
      overrideAccess: true,
    })
  ).spotsLeft
  assert.equal(spotsAfter, spotsBefore)
  assert.equal(outbox.length, 0, 'nobody is emailed')
})
