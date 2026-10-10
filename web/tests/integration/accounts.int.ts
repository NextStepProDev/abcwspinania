import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import { resendVerification } from '@/app/(frontend)/konto/actions'

import { cleanup, email, http, makeCustomer, outbox, payload, removeWhere, test } from './harness'

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
