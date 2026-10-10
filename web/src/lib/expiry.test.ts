import test from 'node:test'
import assert from 'node:assert/strict'

import { expiredBookingsWhere } from '@/lib/expiry'

/**
 * Bookings are kept five years from the end of the year the course took
 * place in (privacy policy). The cutoff is midnight of 1 January in Polish
 * time: the year a course belongs to is the year on the school's calendar.
 */
const cutoffOf = (where: ReturnType<typeof expiredBookingsWhere>) =>
  JSON.stringify(where).match(/"less_than":"([^"]+)"/)?.[1]

test('on 1 January 2032 the bookings of courses that ended in 2026 go', () => {
  // 00:30 in Poland on 1 January is still 31 December in UTC.
  const where = expiredBookingsWhere(new Date('2031-12-31T23:30:00Z'))
  assert.equal(cutoffOf(where), '2026-12-31T23:00:00.000Z')
})

test('all through 2031 the courses of 2026 stay', () => {
  const where = expiredBookingsWhere(new Date('2031-12-31T22:00:00Z')) // 23:00 in Poland
  assert.equal(cutoffOf(where), '2025-12-31T23:00:00.000Z')
})

test('a course ending on New Year’s Day belongs to the new year', () => {
  // Stored as midnight in Poland = 23:00 UTC of the day before; it must not
  // count as the old year and go a year early.
  const endedNewYearsDay = Date.parse('2026-12-31T23:00:00.000Z')
  const where = expiredBookingsWhere(new Date('2032-06-01T12:00:00Z'))
  assert.ok(endedNewYearsDay >= Date.parse(cutoffOf(where)!))
})

test('a date without an end counts by its start', () => {
  const where = JSON.stringify(expiredBookingsWhere(new Date('2032-06-01T12:00:00Z')))
  assert.match(where, /"session.endDate":\{"less_than"/)
  assert.match(where, /"session.endDate":\{"exists":false\}/)
  assert.match(where, /"session.startDate":\{"less_than"/)
})

test('a booking on an account stays while the account exists', () => {
  // Decided 10.10.2026: the account shows its own history ("Archiwum"),
  // kept as long as the person keeps the account. Deleting the account
  // unlinks the bookings, and the five-year rule takes them from there.
  const where = JSON.stringify(expiredBookingsWhere(new Date('2032-06-01T12:00:00Z')))
  assert.match(where, /"customer":\{"exists":false\}/)
})

test('a booking already anonymized is not touched again', () => {
  const where = JSON.stringify(expiredBookingsWhere(new Date('2032-06-01T12:00:00Z')))
  assert.match(where, /"anonymizedAt":\{"exists":false\}/)
})
