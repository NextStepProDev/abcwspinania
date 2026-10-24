import test from 'node:test'
import assert from 'node:assert/strict'

import { expiredBookingsWhere, finishedSessionsWhere, msUntilDailySweep } from '@/lib/expiry'

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

/**
 * Past sessions go "finished" by themselves (decided 12.10.2026). A last day
 * may be stored as UTC midnight or as Polish midnight (23:00 / 22:00 UTC the
 * day before) — neither may turn "finished" while the course still runs.
 */
const finishedCutoff = (now: string) =>
  JSON.stringify(finishedSessionsWhere(new Date(now))).match(/"less_than":"([^"]+)"/)?.[1]

test('a session is not finished on its last day, whichever way the day is stored', () => {
  const cutoff = Date.parse(finishedCutoff('2026-10-15T21:30:00Z')!) // 23:30 in Poland, 15 Oct
  assert.ok(Date.parse('2026-10-15T00:00:00.000Z') >= cutoff)
  assert.ok(Date.parse('2026-10-14T22:00:00.000Z') >= cutoff)
})

test('a session is finished within two days after its last day', () => {
  const cutoff = Date.parse(finishedCutoff('2026-10-17T06:00:00Z')!)
  assert.ok(Date.parse('2026-10-15T00:00:00.000Z') < cutoff)
  assert.ok(Date.parse('2026-10-14T22:00:00.000Z') < cutoff)
})

test('only open and waitlisted sessions change; a cancelled one stays cancelled', () => {
  const where = JSON.stringify(finishedSessionsWhere(new Date('2026-10-17T06:00:00Z')))
  assert.match(where, /"status":\{"in":\["open","waitlist"\]\}/)
})

test('a session without an end date counts by its start', () => {
  const where = JSON.stringify(finishedSessionsWhere(new Date('2026-10-17T06:00:00Z')))
  assert.match(where, /"endDate":\{"exists":false\}/)
  assert.match(where, /"startDate":\{"less_than"/)
})

// --- camp registration forms ---------------------------------------------------

import {
  CAMP_HEALTH_RETENTION_MONTHS,
  expiredRegistrationsWhere,
  registrationReminderWhere,
} from '@/lib/expiry'
import { CAMP_REGISTRATION_CONSENT_TEXT } from '@/lib/consent'

const registrationCutoff = (now: string) =>
  JSON.stringify(expiredRegistrationsWhere(new Date(now))).match(/"less_than":"([^"]+)"/)?.[1]

test('a camp’s health data goes a month after its last day, not before', () => {
  // A camp ending 3 July (stored as Polish midnight, 22:00 UTC on 2 July).
  const lastDay = Date.parse('2027-07-02T22:00:00.000Z')
  assert.ok(lastDay >= Date.parse(registrationCutoff('2027-08-03T12:00:00Z')!), 'kept on 3 August')
  assert.ok(lastDay < Date.parse(registrationCutoff('2027-08-05T12:00:00Z')!), 'gone by 5 August')
})

test('a camp without an end date counts by its start for the health data too', () => {
  const where = JSON.stringify(expiredRegistrationsWhere(new Date('2027-08-05T12:00:00Z')))
  assert.match(where, /"booking.session.endDate":\{"exists":false\}/)
  assert.match(where, /"booking.session.startDate":\{"less_than"/)
})

test('the consent clause states the same health-data period as the sweep', () => {
  assert.equal(CAMP_HEALTH_RETENTION_MONTHS, 1)
  assert.match(CAMP_REGISTRATION_CONSENT_TEXT, /miesiąc po zakończeniu obozu/)
})

test('the registration reminder goes once, to a parent with a place and no form yet', () => {
  const where = JSON.stringify(registrationReminderWhere(new Date('2027-05-10T12:00:00Z')))
  assert.match(where, /"registrationSentAt":\{"less_than":"2027-05-06T12:00:00.000Z"\}/)
  assert.match(where, /"registeredAt":\{"exists":false\}/)
  assert.match(where, /"registrationReminderAt":\{"exists":false\}/)
  assert.doesNotMatch(where, /waitlist|cancelled/)
})

test('the daily sweep runs at 8:00 in Poland — later the same morning', () => {
  // 6:30 in Poland (winter, UTC+1).
  const now = new Date('2026-11-10T05:30:00Z')
  assert.equal(
    new Date(now.getTime() + msUntilDailySweep(now)).toISOString(),
    '2026-11-10T07:00:00.000Z',
  )
})

test('after 8:00 the next sweep is tomorrow morning, not right away', () => {
  // A deploy at 23:40 must not send reminders to parents at night.
  const now = new Date('2026-07-10T21:40:00Z') // 23:40 in Poland (summer, UTC+2)
  assert.equal(
    new Date(now.getTime() + msUntilDailySweep(now)).toISOString(),
    '2026-07-11T06:00:00.000Z',
  )
})

test('exactly at 8:00 the next sweep is a day later', () => {
  const now = new Date('2026-07-11T06:00:00Z')
  assert.equal(
    new Date(now.getTime() + msUntilDailySweep(now)).toISOString(),
    '2026-07-12T06:00:00.000Z',
  )
})

test('across the clock change the sweep stays at 8:00 Polish time', () => {
  // Night of 25 October 2026: clocks go back from 3:00 to 2:00.
  const now = new Date('2026-10-25T00:30:00Z') // 2:30 summer time
  assert.equal(
    new Date(now.getTime() + msUntilDailySweep(now)).toISOString(),
    '2026-10-25T07:00:00.000Z',
  )
  const spring = new Date('2027-03-28T00:30:00Z') // 1:30 winter time, clocks go forward at 2:00
  assert.equal(
    new Date(spring.getTime() + msUntilDailySweep(spring)).toISOString(),
    '2027-03-28T06:00:00.000Z',
  )
})

test('a timer that fires a moment early does not run the sweep twice', () => {
  // Timers may fire a millisecond before the wall clock says 8:00.
  const now = new Date('2026-07-11T05:59:59.999Z')
  assert.equal(
    new Date(now.getTime() + msUntilDailySweep(now)).toISOString(),
    '2026-07-12T06:00:00.000Z',
  )
})
