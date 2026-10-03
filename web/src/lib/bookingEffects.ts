import type { Payload, PayloadRequest } from 'payload'

import {
  ACTIVE_STATUSES,
  availability,
  formatSessionDates,
  placeFreedForWaitlist,
  type StatusEmail,
} from '@/lib/bookings'
import { publicUrl } from '@/lib/email/links'
import type { EmailLanguage } from '@/lib/email/language'
import { bookingStatusEmail, placeFreedNotification } from '@/lib/email/templates'
import type { Booking, Session } from '@/payload-types'

/**
 * What a booking changes elsewhere — the session's spots, and emails to the
 * participant. Called from the Bookings and Sessions hooks, with their `req`
 * so the writes join the same transaction.
 */

type Req = Partial<PayloadRequest>

function idOf(value: number | { id: number } | null | undefined): number | null {
  if (value === null || value === undefined) return null
  return typeof value === 'object' ? value.id : value
}

/**
 * Recounts a session's spots from its active bookings and, when it has a
 * capacity, writes `spotsLeft` and switches `open` ↔ `waitlist` to match.
 * Cancelled and finished sessions are left alone — they are off the site,
 * and the school set them on purpose. Without a capacity nothing is written:
 * the site keeps saying "ask about places".
 */
export async function recountSession(
  payload: Payload,
  sessionId: number,
  req?: Req,
): Promise<void> {
  const session = await payload.findByID({
    collection: 'sessions',
    id: sessionId,
    depth: 0,
    joins: false,
    req,
    overrideAccess: true,
  })
  if (!session || session.capacity === null || session.capacity === undefined) return
  if (session.status !== 'open' && session.status !== 'waitlist') return

  const { totalDocs } = await payload.count({
    collection: 'bookings',
    where: {
      and: [{ session: { equals: sessionId } }, { status: { in: [...ACTIVE_STATUSES] } }],
    },
    req,
    overrideAccess: true,
  })
  const spots = availability(session.capacity, totalDocs)
  const status = spots.full ? 'waitlist' : 'open'
  if (session.spotsLeft === spots.spotsLeft && session.status === status) return

  await payload.update({
    collection: 'sessions',
    id: sessionId,
    data: { spotsLeft: spots.spotsLeft, status },
    req,
    overrideAccess: true,
    // Our own write — the Sessions hook must not recount again in response.
    context: { recountingSpots: true },
  })

  await announceFreedPlace(payload, session, spots.spotsLeft, req).catch((error) =>
    payload.logger.error({ err: error }, 'Failed to announce a freed place'),
  )
}

/**
 * Tells the school that a place freed up while people wait (a cancellation,
 * a deleted booking, a bigger capacity). Nobody is promoted automatically.
 */
async function announceFreedPlace(
  payload: Payload,
  session: Session,
  spotsLeft: number | null,
  req?: Req,
): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL
  if (!to) return
  const { docs: waiting } = await payload.find({
    collection: 'bookings',
    where: { and: [{ session: { equals: session.id } }, { status: { equals: 'waitlist' } }] },
    sort: 'createdAt',
    limit: 20,
    depth: 0,
    req,
    overrideAccess: true,
  })
  if (!placeFreedForWaitlist(session.spotsLeft, spotsLeft, waiting.length) || spotsLeft === null)
    return
  const summary = await sessionSummary(payload, session.id, 'pl', req)
  const email = placeFreedNotification({
    courseTitle: summary?.courseTitle ?? '',
    dates: summary?.dates ?? '',
    spotsLeft,
    waiting: waiting.map((b) => ({
      name: `${b.firstName} ${b.lastName}`,
      phone: b.phone,
      email: b.email,
    })),
    adminUrl: `${publicUrl()}/admin/collections/sessions/${session.id}`,
  })
  await payload.sendEmail({ to, subject: email.subject, html: email.html, text: email.text })
}

/** The course title, dates and place of a session, for an email in `lang`. */
export async function sessionSummary(
  payload: Payload,
  sessionId: number,
  lang: EmailLanguage,
  req?: Req,
): Promise<{ courseTitle: string; dates: string; location: string | null } | null> {
  const session = (await payload.findByID({
    collection: 'sessions',
    id: sessionId,
    depth: 1,
    // Not the `bookings` join — every participant on the date.
    joins: false,
    req,
    overrideAccess: true,
  })) as Session | null
  if (!session) return null
  const course = typeof session.course === 'object' ? session.course : null
  const camp = typeof session.camp === 'object' ? session.camp : null
  return {
    courseTitle: course?.title ?? camp?.title ?? '',
    dates: formatSessionDates(lang, session.startDate, session.endDate),
    location: session.location || course?.location || null,
  }
}

/** Tells the participant their booking was confirmed, paid or cancelled. */
export async function sendStatusEmail(
  payload: Payload,
  booking: Booking,
  status: StatusEmail,
  req?: Req,
): Promise<void> {
  const sessionId = idOf(booking.session)
  if (!sessionId) return
  const lang = booking.language === 'en' ? 'en' : 'pl'
  const summary = await sessionSummary(payload, sessionId, lang, req)
  if (!summary) return
  const email = bookingStatusEmail(lang, status, {
    firstName: booking.firstName,
    ...summary,
    accountUrl: idOf(booking.customer) ? `${publicUrl()}/konto` : null,
  })
  await payload.sendEmail({
    to: booking.email,
    // A reply goes to the school, not to an address with no mailbox.
    replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

/**
 * Attaches the bookings made WITHOUT an account to the account with the same
 * address. Called only once that address is PROVEN (a login, a confirmed
 * address, a password set from an emailed link) — never from a form — so
 * typing someone's address into a booking can never land it in their account
 * view, or theirs in yours.
 */
export async function claimBookings(
  payload: Payload,
  customer: { id: number; email: string },
  req?: Req,
): Promise<void> {
  await payload.update({
    collection: 'bookings',
    where: {
      and: [{ email: { equals: customer.email.toLowerCase() } }, { customer: { exists: false } }],
    },
    data: { customer: customer.id },
    req,
    overrideAccess: true,
    context: { skipStatusEmail: true },
  })
}

export { idOf }
