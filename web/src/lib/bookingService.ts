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

import {
  ACTIVE_STATUSES,
  availability,
  childKey,
  newBookingStatus,
  type BookingStatus,
} from '@/lib/bookings'
import {
  accountConsentForStorage,
  bookingConsentForStorage,
  campBookingConsentForStorage,
} from '@/lib/consent'
import type { EmailLanguage } from '@/lib/email/language'
import type { Booking, Camp, Course, Customer, Session } from '@/payload-types'

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

/** Namespaces for `pg_advisory_xact_lock(int, int)` — any fixed numbers, distinct (7303, 7304: `broadcastSender.ts`). */
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

/** What "create an account for me" did — see `accountFor`. */
interface AccountOutcome {
  accountId: number | null
  /** Set when this booking created an account (it needs its set-password email). */
  newAccount: Customer | null
  /** An account already existed for the address but is not confirmed yet. */
  unconfirmedAccount: Customer | null
}

export type BookingResult =
  | { kind: 'unavailable' }
  | {
      kind: 'duplicate'
      /** The person's first booking for the session — the one that stays. */
      booking: Booking
      /** As in `created`; the account is made from `booking`'s details. */
      newAccount: Customer | null
      unconfirmedAccount: Customer | null
    }
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

/**
 * "Create an account for me": an account for the address when none exists.
 * Runs inside the booking's transaction, under a lock on the address.
 */
async function accountFor(
  payload: Payload,
  req: Partial<PayloadRequest>,
  tx: Tx,
  contact: BookingInput['contact'],
  language: EmailLanguage,
): Promise<AccountOutcome> {
  // The same address booking two sessions at once must not try to create
  // two accounts — the second would hit the unique email and fail.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${LOCK_EMAIL}, hashtext(${contact.email}))`)
  const { docs } = await payload.find({
    collection: 'customers',
    where: { email: { equals: contact.email } },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })
  if (!docs[0]) {
    const newAccount = await payload.create({
      collection: 'customers',
      data: {
        ...contact,
        // Never used to log in: the person sets their own from the email,
        // which also confirms the address.
        password: crypto.randomBytes(32).toString('hex'),
        language,
        consentText: accountConsentForStorage(),
        consentDate: new Date().toISOString(),
      },
      req,
      overrideAccess: true,
      disableVerificationEmail: true,
    })
    return { accountId: newAccount.id, newAccount, unconfirmedAccount: null }
  }
  // An account waits for confirmation: its owner gets a fresh link (sent by
  // the action). It is NOT attached here — a form proves nothing;
  // confirming the address will claim the booking.
  if (!docs[0]._verified) return { accountId: null, newAccount: null, unconfirmedAccount: docs[0] }
  // A confirmed account: nothing here — its owner's next login claims the
  // booking (`claimBookings`).
  return { accountId: null, newAccount: null, unconfirmedAccount: null }
}

const NO_ACCOUNT: AccountOutcome = { accountId: null, newAccount: null, unconfirmedAccount: null }

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
    const { docs: earlier } = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { session: { equals: session.id } },
          { email: { equals: input.contact.email } },
          { status: { not_equals: 'cancelled' } },
        ],
      },
      sort: 'createdAt',
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })
    if (earlier[0]) {
      const first = earlier[0]
      // Booked before without an account, now again WITH "create an account":
      // still one booking, but the account is made — from the FIRST booking's
      // details, not this form's (decided 17.10.2026; until then the tick was
      // dropped and the page promised an email that never came). Not attached
      // here: setting the password claims the booking (`claimBookings`).
      // A first booking that already HAS an account (a double click on a
      // form with the tick) is left alone — its email went out with it.
      const accounts =
        !input.customerId && input.wantsAccount && !first.customer
          ? await accountFor(
              payload,
              req,
              tx,
              {
                firstName: first.firstName,
                lastName: first.lastName,
                email: input.contact.email,
                phone: first.phone,
              },
              first.language ?? input.language,
            )
          : NO_ACCOUNT
      await commitTransaction(req)
      return {
        kind: 'duplicate',
        booking: first,
        newAccount: accounts.newAccount,
        unconfirmedAccount: accounts.unconfirmedAccount,
      }
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
    const {
      accountId: newAccountId,
      newAccount,
      unconfirmedAccount,
    } = !input.customerId && input.wantsAccount
      ? await accountFor(payload, req, tx, input.contact, input.language)
      : NO_ACCOUNT
    const accountId = input.customerId ?? newAccountId

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        kind: 'course',
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

// --- Camp bookings -------------------------------------------------------------

export interface CampBookingInput {
  sessionId: number
  /** The camp whose page the form was on — the session must belong to it. */
  campId: number
  /** The PARENT — the booking's contact, as on a course. */
  contact: BookingInput['contact']
  /** One booking each; checked by `validateCampBooking`. */
  children: { firstName: string; lastName: string }[]
  notes: string | null
  language: EmailLanguage
  customerId: number | null
  wantsAccount: boolean
}

export interface CampChildResult {
  booking: Booking
  status: BookingStatus
  /** The key of the child's registration form link — only on a new booking. */
  registrationToken: string | null
  /** False: this child was already booked on the session from this address. */
  created: boolean
}

export type CampBookingResult =
  | { kind: 'unavailable' }
  | {
      kind: 'done'
      session: Session
      camp: Camp
      /** In the form's order. */
      children: CampChildResult[]
      newAccount: Customer | null
      unconfirmedAccount: Customer | null
    }

/**
 * Signing children up for a camp — the course booking's rules, per child:
 * the same lock on the session, so siblings and a stranger booking the last
 * places at once are counted one after another; each child gets a place
 * while there is one, the rest the waiting list.
 *
 * Siblings share the parent's address, so the duplicate check is the address
 * AND the child's name (`childKey`): the same child again (a double click, a
 * second try) keeps its first booking, another name is a new one.
 */
export async function createCampBookings(
  payload: Payload,
  input: CampBookingInput,
): Promise<CampBookingResult> {
  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    const tx = await txOf(payload, req)
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${LOCK_SESSION}, ${input.sessionId})`)

    // --- the session: this camp's (a camp, not a trip), published, bookable ---
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
    const camp = session && typeof session.camp === 'object' ? session.camp : null
    const bookable =
      session &&
      camp &&
      camp.id === input.campId &&
      camp.kind === 'camp' &&
      camp._status === 'published' &&
      (session.status === 'open' || session.status === 'waitlist') &&
      Date.parse(session.startDate) >= startOfTodayUtc()
    if (!session || !camp || !bookable) {
      await commitTransaction(req)
      return { kind: 'unavailable' }
    }

    const { docs: earlier } = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { session: { equals: session.id } },
          { email: { equals: input.contact.email } },
          { status: { not_equals: 'cancelled' } },
        ],
      },
      sort: 'createdAt',
      limit: 100,
      depth: 0,
      req,
      overrideAccess: true,
    })
    const booked = new Map(earlier.map((b) => [childKey(b.childFirstName, b.childLastName), b]))

    // An account as on a course: from the FIRST booking's details when this
    // address booked the session before, and never next to one that already
    // has an account (its email went out with it).
    const first = earlier[0]
    const accounts =
      !input.customerId && input.wantsAccount && !earlier.some((b) => b.customer)
        ? await accountFor(
            payload,
            req,
            tx,
            first
              ? {
                  firstName: first.firstName,
                  lastName: first.lastName,
                  email: input.contact.email,
                  phone: first.phone,
                }
              : input.contact,
            first?.language ?? input.language,
          )
        : NO_ACCOUNT
    const accountId = input.customerId ?? accounts.accountId

    const children: CampChildResult[] = []
    for (const child of input.children) {
      const key = childKey(child.firstName, child.lastName)
      const existing = booked.get(key)
      if (existing) {
        children.push({
          booking: existing,
          status: existing.status as BookingStatus,
          registrationToken: null,
          created: false,
        })
        continue
      }
      // Counted again for each child: the one before may have taken the last place.
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
      const registrationToken = crypto.randomBytes(32).toString('hex')
      const booking = await payload.create({
        collection: 'bookings',
        data: {
          kind: 'camp',
          session: session.id,
          status,
          ...input.contact,
          childFirstName: child.firstName,
          childLastName: child.lastName,
          notes: input.notes || undefined,
          customer: accountId ?? undefined,
          language: input.language,
          consentText: campBookingConsentForStorage(),
          consentDate: new Date().toISOString(),
          registrationToken,
          registrationSentAt: new Date().toISOString(),
        },
        req,
        overrideAccess: true,
      })
      booked.set(key, booking)
      children.push({ booking, status, registrationToken, created: true })
    }

    await commitTransaction(req)
    return {
      kind: 'done',
      session,
      camp,
      children,
      newAccount: accounts.newAccount,
      unconfirmedAccount: accounts.unconfirmedAccount,
    }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
