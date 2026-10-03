import crypto from 'node:crypto'

import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'
import { sql } from '@payloadcms/db-postgres'

import { ACTIVE_STATUSES, availability, newBookingStatus, type BookingStatus } from '@/lib/bookings'
import { accountConsentForStorage, bookingConsentForStorage } from '@/lib/consent'
import type { EmailLanguage } from '@/lib/email/language'
import type { Booking, Course, Customer, Session } from '@/payload-types'

/**
 * Creating a booking — the part that must happen ALL AT ONCE.
 *
 * ⚠️ Why a transaction with a lock: counting the free places and saving the
 * booking are two steps. Measured 03.10.2026 without the lock: five people
 * booking the last place at the same moment ALL got it — each counted "1
 * free" before any of them saved. The same race let a double click book one
 * person twice. Now every booking for a session takes a Postgres advisory
 * lock on that session inside its transaction: the next booking for the same
 * session waits until this one is committed, then counts again. Bookings for
 * different sessions do not wait for each other.
 *
 * Kept out of the server action so it can be exercised in parallel from a
 * script (the action needs a browser request); the action does the
 * request-bound parts — who is logged in, the form, the emails after commit.
 */

/** Namespaces for `pg_advisory_xact_lock(int, int)` — any fixed numbers, distinct (7303: `broadcastSender.ts`). */
const LOCK_SESSION = 7301
const LOCK_EMAIL = 7302

interface Tx {
  execute: (query: unknown) => Promise<unknown>
}

/** The open transaction of `req`, to run raw SQL in it. */
export async function txOf(payload: Payload, req: Partial<PayloadRequest>): Promise<Tx> {
  const id = await req.transactionID
  const sessions = (payload.db as unknown as { sessions: Record<string, { db: Tx }> }).sessions
  const tx = id !== undefined ? sessions[String(id)]?.db : undefined
  if (!tx) throw new Error('No transaction to lock in')
  return tx
}

export interface BookingInput {
  sessionId: number
  /** The course whose page the form was on — the session must belong to it. */
  courseId: number
  contact: { firstName: string; lastName: string; email: string; phone: string }
  notes: string | null
  language: EmailLanguage
  /** The logged-in participant, if any. */
  customerId: number | null
  /** "Create an account for me" — only without a login. */
  wantsAccount: boolean
}

export type BookingResult =
  | { kind: 'unavailable' }
  | { kind: 'duplicate' }
  | {
      kind: 'created'
      booking: Booking
      status: BookingStatus
      session: Session
      course: Course
      /** Set when this booking created an account (it needs its set-password email). */
      newAccount: Customer | null
      /** An account already existed for the address but is not confirmed yet. */
      unconfirmedAccount: Customer | null
    }

function startOfTodayUtc(): number {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime()
}

export async function createBooking(payload: Payload, input: BookingInput): Promise<BookingResult> {
  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    const tx = await txOf(payload, req)
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${LOCK_SESSION}, ${input.sessionId})`)

    // --- the session: this course's, published, bookable, not yet started ---
    const session = await payload
      .findByID({
        collection: 'sessions',
        id: input.sessionId,
        depth: 1,
        joins: false,
        req,
        overrideAccess: true,
      })
      .catch(() => null)
    const course = session && typeof session.course === 'object' ? session.course : null
    const bookable =
      session &&
      course &&
      course.id === input.courseId &&
      course._status === 'published' &&
      (session.status === 'open' || session.status === 'waitlist') &&
      Date.parse(session.startDate) >= startOfTodayUtc()
    if (!session || !course || !bookable) {
      await commitTransaction(req)
      return { kind: 'unavailable' }
    }

    // --- one person, one booking per session (a double click included) ---
    const duplicate = await payload.count({
      collection: 'bookings',
      where: {
        and: [
          { session: { equals: session.id } },
          { email: { equals: input.contact.email } },
          { status: { not_equals: 'cancelled' } },
        ],
      },
      req,
      overrideAccess: true,
    })
    if (duplicate.totalDocs > 0) {
      await commitTransaction(req)
      return { kind: 'duplicate' }
    }

    // --- the waiting list when the session is full: counted UNDER the lock ---
    const active = await payload.count({
      collection: 'bookings',
      where: {
        and: [{ session: { equals: session.id } }, { status: { in: [...ACTIVE_STATUSES] } }],
      },
      req,
      overrideAccess: true,
    })
    const status = newBookingStatus(
      availability(session.capacity, active.totalDocs),
      session.status,
    )

    // --- an account, when asked for and none exists ---
    let accountId = input.customerId
    let newAccount: Customer | null = null
    let unconfirmedAccount: Customer | null = null
    if (!input.customerId && input.wantsAccount) {
      // The same address booking two sessions at once must not try to create
      // two accounts — the second would hit the unique email and fail.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(${LOCK_EMAIL}, hashtext(${input.contact.email}))`,
      )
      const { docs } = await payload.find({
        collection: 'customers',
        where: { email: { equals: input.contact.email } },
        limit: 1,
        depth: 0,
        req,
        overrideAccess: true,
      })
      if (!docs[0]) {
        newAccount = await payload.create({
          collection: 'customers',
          data: {
            ...input.contact,
            // Never used to log in: the person sets their own from the email,
            // which also confirms the address.
            password: crypto.randomBytes(32).toString('hex'),
            language: input.language,
            consentText: accountConsentForStorage(),
            consentDate: new Date().toISOString(),
          },
          req,
          overrideAccess: true,
          disableVerificationEmail: true,
        })
        accountId = newAccount.id
      } else if (!docs[0]._verified) {
        // An account waits for confirmation: its owner gets a fresh link (sent
        // by the action). It is NOT attached here — a form proves nothing;
        // confirming the address will claim the booking.
        unconfirmedAccount = docs[0]
      }
      // A confirmed account: nothing here — its owner's next login claims
      // the booking (`claimBookings`).
    }

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        session: session.id,
        status,
        ...input.contact,
        notes: input.notes || undefined,
        customer: accountId ?? undefined,
        language: input.language,
        consentText: bookingConsentForStorage(),
        consentDate: new Date().toISOString(),
      },
      req,
      overrideAccess: true,
    })

    await commitTransaction(req)
    return { kind: 'created', booking, status, session, course, newAccount, unconfirmedAccount }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
