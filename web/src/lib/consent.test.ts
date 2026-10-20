import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ACCOUNT_CONSENT_TEXT,
  BOOKING_CONSENT_TEXT,
  CAMP_BOOKING_CONSENT_TEXT,
  CONSENT_TEXT,
  NEWSLETTER_CONSENT_TEXT,
} from '@/lib/consent'
import { CONTROLLER } from '@/lib/legal'

/**
 * Every clause must name who is legally responsible for the data. "ABC
 * Wspinania" alone is the school's name, not a legal entity — the clauses
 * said only that until 06.10.2026.
 */
const CLAUSES = {
  contact: CONSENT_TEXT,
  newsletter: NEWSLETTER_CONSENT_TEXT,
  account: ACCOUNT_CONSENT_TEXT,
  booking: BOOKING_CONSENT_TEXT,
  campBooking: CAMP_BOOKING_CONSENT_TEXT,
}

test('every consent clause names the legal controller, not just the brand', () => {
  for (const [name, text] of Object.entries(CLAUSES)) {
    assert.ok(text.includes(CONTROLLER.person), `${name}: no controller name`)
    assert.ok(text.includes(CONTROLLER.businessName), `${name}: no business name`)
    assert.doesNotMatch(
      text,
      /Administratorem danych jest ABC Wspinania\./,
      `${name}: brand as controller`,
    )
  }
})

test('every consent clause points to the privacy policy', () => {
  for (const [name, text] of Object.entries(CLAUSES)) {
    assert.match(text, /polityce prywatności/, `${name}: no pointer to the policy`)
  }
})

test('contact messages expire twelve months after they were sent', async () => {
  const { expiredMessagesWhere } = await import('@/lib/expiry')
  assert.deepEqual(expiredMessagesWhere(new Date('2027-10-06T12:00:00Z')), {
    createdAt: { less_than: '2026-10-06T12:00:00.000Z' },
  })
})
