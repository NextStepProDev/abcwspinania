import test from 'node:test'
import assert from 'node:assert/strict'

import { CAMP_SENDER_NAME, mailboxFor, sameDomain, senderFor } from '@/lib/email/mailboxes'

const school = {
  EMAIL_FROM: 'biuro@abcwspinania.info',
  ADMIN_NOTIFY_EMAIL: 'biuro@abcwspinania.info',
  COURSE_EMAIL: 'kursy@abcwspinania.info',
  CAMP_EMAIL: 'obozy@abcwspinania.info',
}

test('after the switch each kind has its own mailbox: sender, replies and notifications', () => {
  assert.equal(mailboxFor('course', school), 'kursy@abcwspinania.info')
  assert.equal(mailboxFor('camp', school), 'obozy@abcwspinania.info')
  assert.equal(mailboxFor('general', school), 'biuro@abcwspinania.info')
  assert.deepEqual(senderFor('course', school), {
    name: 'ABC Wspinania',
    address: 'kursy@abcwspinania.info',
  })
  assert.deepEqual(senderFor('camp', school), {
    name: CAMP_SENDER_NAME,
    address: 'obozy@abcwspinania.info',
  })
  assert.equal(senderFor('general', school).address, 'biuro@abcwspinania.info')
})

test('an empty mailbox falls back to the general one — locally and in CI nothing changes', () => {
  const testing = { EMAIL_FROM: 'zapisy@szkolawspinaczkowa.pl', ADMIN_NOTIFY_EMAIL: 'me@gmail.com' }
  for (const kind of ['course', 'camp', 'general'] as const) {
    assert.equal(mailboxFor(kind, testing), 'me@gmail.com')
    assert.equal(senderFor(kind, testing).address, 'zapisy@szkolawspinaczkowa.pl')
  }
  assert.equal(senderFor('camp', testing).name, CAMP_SENDER_NAME, 'the camp name stays')
  assert.equal(mailboxFor('course', {}), undefined)
})

test('a mailbox outside the authenticated domain never becomes the sender', () => {
  // CAMP_EMAIL set before the school's domain is authenticated in Brevo — or
  // a private Gmail typed into web/.env: Brevo would refuse such a sender.
  const early = {
    EMAIL_FROM: 'zapisy@szkolawspinaczkowa.pl',
    ADMIN_NOTIFY_EMAIL: 'me@gmail.com',
    CAMP_EMAIL: 'obozy@abcwspinania.info',
    COURSE_EMAIL: 'me+kursy@gmail.com',
  }
  assert.equal(senderFor('camp', early).address, 'zapisy@szkolawspinaczkowa.pl')
  assert.equal(senderFor('course', early).address, 'zapisy@szkolawspinaczkowa.pl')
  // Replies and notifications still go there — a mailbox, not a sender.
  assert.equal(mailboxFor('camp', early), 'obozy@abcwspinania.info')
})

test('the same domain ignores case and spaces, and nothing else passes', () => {
  assert.ok(sameDomain('Obozy@ABCWspinania.info ', 'biuro@abcwspinania.info'))
  assert.ok(!sameDomain('obozy@abcwspinania.info.evil.pl', 'biuro@abcwspinania.info'))
  assert.ok(!sameDomain('abcwspinania.info', 'biuro@abcwspinania.info'))
  assert.ok(!sameDomain(undefined, 'biuro@abcwspinania.info'))
})
