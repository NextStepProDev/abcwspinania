import { getPayload } from 'payload'
import config from '@payload-config'

import { isUpcoming, type BookingStatus } from '@/lib/bookings'
import { formatDateRange } from '@/lib/format'
import type { Session } from '@/payload-types'

/** One booking as the participant sees it in "Moje konto". */
export interface BookingRow {
  id: number
  title: string
  dates: string
  /** For ordering the upcoming list — the display string does not sort. */
  start: number
  status: BookingStatus
}

/**
 * The participant's own bookings, split into upcoming and archive (past
 * sessions and cancellations). The id comes from the login, never from the
 * address bar.
 *
 * Sessions are read separately with `joins: false`: populated through the
 * booking, a session would carry its `bookings` join — every OTHER
 * participant's name and phone on that date.
 */
export async function bookingsOf(customerId: number) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'bookings',
    where: { customer: { equals: customerId } },
    depth: 0,
    limit: 200,
    sort: '-createdAt',
    overrideAccess: true,
  })
  const idOf = (s: number | Session) => (typeof s === 'object' ? s.id : s)
  const sessionIds = [...new Set(docs.map((b) => idOf(b.session)))]
  const sessions = sessionIds.length
    ? (
        await payload.find({
          collection: 'sessions',
          where: { id: { in: sessionIds } },
          depth: 1,
          joins: false,
          limit: sessionIds.length,
          overrideAccess: true,
        })
      ).docs
    : []
  const byId = new Map(sessions.map((s) => [s.id, s]))

  const now = new Date()
  const upcoming: BookingRow[] = []
  const archive: BookingRow[] = []
  for (const booking of docs) {
    const session = byId.get(idOf(booking.session))
    if (!session) continue
    const course = typeof session.course === 'object' ? session.course : null
    const camp = typeof session.camp === 'object' ? session.camp : null
    const row: BookingRow = {
      id: booking.id,
      title: course?.title ?? camp?.title ?? 'Termin',
      dates: formatDateRange(session.startDate, session.endDate),
      start: Date.parse(session.startDate),
      status: booking.status as BookingStatus,
    }
    if (booking.status !== 'cancelled' && isUpcoming(session, now)) upcoming.push(row)
    else archive.push(row)
  }
  upcoming.sort((a, b) => a.start - b.start)
  return { upcoming, archive }
}
