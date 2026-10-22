import type { Payload, PayloadRequest } from 'payload'

import {
  ACTIVE_STATUSES,
  availability,
  formatSessionDates,
  placeFreedForWaitlist,
  type StatusEmail,
} from '@/lib/bookings'
import { emailFailureReason } from '@/lib/broadcasts'
import { campMailbox, campPrice, campSender, joinNames, paymentDetails } from '@/lib/campPayment'
import { publicUrl } from '@/lib/email/links'
import type { EmailLanguage } from '@/lib/email/language'
import { bookingStatusEmail, campStatusEmail, placeFreedNotification } from '@/lib/email/templates'
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
      email: b.email ?? null,
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
): Promise<{
  courseTitle: string
  dates: string
  location: string | null
  /** The session's own price, else its course's or camp's; null when none. */
  price: number | null
} | null> {
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
    location: session.location || course?.location || camp?.location || null,
    price: campPrice(session.price, course?.price ?? camp?.price),
  }
}

/**
 * Tells the participant their booking was confirmed, paid or cancelled — and,
 * on a camp, that the deposit arrived (`statusEmailForKind`).
 */
/**
 * The children of `booking`'s sign-up that have a place — those sharing its
 * registration link (the token is hidden, so read again with it), the
 * booking itself included and in sign-up order. Alone without a link.
 */
async function depositSiblings(payload: Payload, booking: Booking, req?: Req): Promise<Booking[]> {
  const own = (await payload.findByID({
    collection: 'bookings',
    id: booking.id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
    req,
  })) as Booking
  if (!own.registrationToken) return [own]
  const { docs } = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { registrationToken: { equals: own.registrationToken } },
        { status: { not_in: ['cancelled', 'waitlist'] } },
      ],
    },
    sort: 'createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return docs.length ? docs : [own]
}

/**
 * A sibling's deposit email waits for the last child of the sign-up
 * (`sendStatusEmail`). When that child drops out instead — cancelled, or
 * moved to the waiting list — nothing would ever send it: this does, for the
 * siblings left. Only when the child was the one not yet paid for.
 */
export async function sendWaitingDepositEmail(
  payload: Payload,
  booking: Booking,
  previousStatus: string | null | undefined,
  req?: Req,
): Promise<void> {
  if (booking.kind !== 'camp') return
  if (previousStatus !== 'new' && previousStatus !== 'confirmed') return
  if (booking.status !== 'cancelled' && booking.status !== 'waitlist') return
  // Never fails the save it follows: a status change must not be undone by an email.
  let first: Booking | undefined
  try {
    const siblings = (await depositSiblings(payload, booking, req)).filter(
      (b) => b.id !== booking.id,
    )
    if (siblings.some((b) => b.status === 'new' || b.status === 'confirmed')) return
    first = siblings.find((b) => b.status === 'deposit')
    if (!first) return
    await sendStatusEmail(payload, first, 'deposit', req)
  } catch (error) {
    if (first) await recordEmailIssue(payload, first.id, 'Mail „zaliczka wpłynęła”', error, req)
    else payload.logger.error({ err: error }, 'Failed to check a waiting deposit email')
  }
}

export async function sendStatusEmail(
  payload: Payload,
  booking: Booking,
  status: StatusEmail,
  req?: Req,
): Promise<void> {
  // A phone booking may have no address: nothing to send, and nothing to
  // note as "not delivered" — the school knows it calls this person.
  if (!booking.email) return
  const sessionId = idOf(booking.session)
  if (!sessionId) return
  const lang = booking.language === 'en' ? 'en' : 'pl'
  const summary = await sessionSummary(payload, sessionId, lang, req)
  if (!summary) return
  const accountUrl = idOf(booking.customer) ? `${publicUrl()}/konto` : null
  const camp = booking.kind === 'camp'
  // A camp email speaks to the parent about the child; the course one says
  // "kurs" and has no deposit email.
  const childName = [booking.childFirstName, booking.childLastName].filter(Boolean).join(' ')
  // Siblings signed up together pay their deposits in one transfer, and the
  // school marks each child: one email, once the LAST of them is marked
  // (Mateusz, 22.10.2026), naming those with a deposit and their balance.
  let children = [childName]
  if (camp && status === 'deposit') {
    const siblings = await depositSiblings(payload, booking, req)
    if (siblings.some((b) => b.status === 'new' || b.status === 'confirmed')) return
    // A child already paid in full is neither in it nor in its balance.
    children = siblings
      .filter((b) => b.status === 'deposit')
      .map((b) => [b.childFirstName, b.childLastName].filter(Boolean).join(' '))
  }
  const email = camp
    ? campStatusEmail(lang, status, {
        firstName: booking.firstName,
        childName: joinNames(lang, children),
        campTitle: summary.courseTitle,
        dates: summary.dates,
        location: summary.location,
        payment: status === 'deposit' ? paymentDetails(lang, children, summary.price, null) : null,
        accountUrl,
      })
    : bookingStatusEmail(lang, status as 'confirmed' | 'paid' | 'cancelled', {
        firstName: booking.firstName,
        ...summary,
        accountUrl,
      })
  await payload.sendEmail({
    to: booking.email,
    // A reply goes to the school, not to an address with no mailbox.
    ...(camp ? { from: campSender() } : {}),
    replyTo: (camp ? campMailbox() : process.env.ADMIN_NOTIFY_EMAIL) || undefined,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

/**
 * Notes on the booking that an email to the participant did not go out, so
 * the school learns it from the panel (the "Maile, które nie doszły" tile)
 * instead of never. These emails have no queue: the booking is saved, the
 * email is not retried — the school gets in touch itself and ticks
 * "Załatwione".
 *
 * Pass the `req` of the save in progress: the booking row is locked by that
 * transaction, and a write from another connection would wait for it
 * forever. Never throws — a note about a lost email must not lose the save.
 */
export async function recordEmailIssue(
  payload: Payload,
  bookingId: number,
  what: string,
  error: unknown,
  req?: Req,
): Promise<void> {
  payload.logger.error({ err: error }, `Email to a participant failed: ${what}`)
  try {
    // Two emails failing for one booking (the confirmation and the account
    // link) must both show: an issue not yet handled is added to, not replaced.
    const current = await payload.findByID({
      collection: 'bookings',
      id: bookingId,
      depth: 0,
      req,
      overrideAccess: true,
    })
    // A string is the reason itself — a problem of ours, not of the sending.
    const line = `${what} — ${typeof error === 'string' ? error : emailFailureReason(error)}`
    const open = current.emailIssue && !current.emailIssueHandled ? current.emailIssue : null
    await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: {
        emailIssue: (open ? `${open}; ${line}` : line).slice(0, 1000),
        emailIssueAt: new Date().toISOString(),
        emailIssueHandled: false,
      },
      // Only these three fields change: no status email, no recount.
      context: { skipStatusEmail: true, skipRecount: true },
      req,
      overrideAccess: true,
    })
  } catch (writeError) {
    payload.logger.error({ err: writeError }, 'Could not note a failed email on the booking')
  }
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
