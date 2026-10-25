import test from 'node:test'
import assert from 'node:assert/strict'

import { takeToken, type Bucket } from '@/lib/rateLimit'

const LIMIT = { capacity: 20, perMinute: 10 }
const T0 = Date.parse('2026-10-25T12:00:00Z')

function spend(buckets: Map<string, Bucket>, key: string, times: number, now = T0) {
  return Array.from({ length: times }, () => takeToken(buckets, key, LIMIT, now))
}

test('a burst up to the capacity goes through, the next request is refused', () => {
  const buckets = new Map<string, Bucket>()
  assert.ok(spend(buckets, '1.2.3.4', 20).every(Boolean))
  assert.equal(takeToken(buckets, '1.2.3.4', LIMIT, T0), false)
})

test('the budget comes back with time, never above the capacity', () => {
  const buckets = new Map<string, Bucket>()
  spend(buckets, 'a', 21)
  // Six seconds give one request back at ten a minute.
  assert.equal(takeToken(buckets, 'a', LIMIT, T0 + 6_000), true)
  assert.equal(takeToken(buckets, 'a', LIMIT, T0 + 6_000), false)
  // An hour later: a full bucket again, not six hundred requests.
  const later = T0 + 3_600_000
  assert.ok(spend(buckets, 'a', 20, later).every(Boolean))
  assert.equal(takeToken(buckets, 'a', LIMIT, later), false)
})

test('each address has its own budget', () => {
  const buckets = new Map<string, Bucket>()
  spend(buckets, 'a', 21)
  assert.equal(takeToken(buckets, 'b', LIMIT, T0), true)
})

test('refilled buckets are dropped once there are many, spent ones stay', () => {
  const buckets = new Map<string, Bucket>()
  for (let i = 0; i <= 5000; i++) takeToken(buckets, `ip-${i}`, LIMIT, T0)
  spend(buckets, 'busy', 21, T0 + 600_000)
  takeToken(buckets, 'new', LIMIT, T0 + 600_000)
  assert.ok(buckets.size < 10, `kept ${buckets.size}`)
  assert.equal(takeToken(buckets, 'busy', LIMIT, T0 + 600_000), false)
})

test('a clock set back does not drain the budget', () => {
  const buckets = new Map<string, Bucket>()
  spend(buckets, 'a', 10)
  // NTP stepping the clock back an hour must not count as "minus 600 tokens".
  assert.ok(spend(buckets, 'a', 10, T0 - 3_600_000).every(Boolean))
})
