import crypto from 'node:crypto'

import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

import { isAdmin } from '@/lib/access'
import { ACTIVE_STATUSES, formatSessionDates, type BookingStatus } from '@/lib/bookings'
import { idOf, recordEmailIssue } from '@/lib/bookingEffects'
import {
  campActivitiesConsentForStorage,
  campRegistrationConsentForStorage,
  photoConsentForStorage,
} from '@/lib/consent'
import type { EmailLanguage } from '@/lib/email/language'
import { publicUrl, tokenLink } from '@/lib/email/links'
import {
  depositReminderEmail,
  registrationLinkEmail,
  registrationNotification,
  registrationReceivedEmail,
  type RegistrationLinkReason,
} from '@/lib/email/templates'
import { campMailbox, campPrice, depositDueDate, paymentDetails } from '@/lib/campPayment'
import {
  depositReminderWhere,
  expiredRegistrationsWhere,
  registrationReminderWhere,
} from '@/lib/expiry'
import { peselBirthDate } from '@/lib/pesel'
import type { Booking, Camp, CampRegistration, Session } from '@/payload-types'

/**
 * The camp registration form (step 2): finding the booking a link belongs
 * to, saving the form, sending the link, the reminder and the deletion a
 * month after the camp. The page and its action are in
 * `app/(frontend)/obozy/rejestracja/`.
 *
 * The link's token is the only key: the form needs no account (decided
 * 20.10.2026), so the token is never shown in the panel or an API response
 * (`hidden` on the booking) and is checked here, on the server, every time.
 */

type Req = Partial<PayloadRequest>

function pick(email: { subject: string; html: string; text: string }) {
  return { subject: email.subject, html: email.html, text: email.text }
}

export const registrationUrl = (token: string) => tokenLink('/obozy/rejestracja', token)

export const childName = (booking: Pick<Booking, 'childFirstName' | 'childLastName'>) =>
  [booking.childFirstName, booking.childLastName].filter(Boolean).join(' ')

export interface RegistrationContext {
  booking: Booking
  session: Session
  camp: Camp | null
  registration: CampRegistration | null
}

/**
 * The booking behind a registration link, with its session and any form
 * already sent — or null for a token that matches nothing. Only camp
 * bookings carry a token. The session is read without its `bookings` join
 * (every participant's data).
 */
export async function findByToken(
  payload: Payload,
  token: string,
): Promise<RegistrationContext | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null
  const { docs } = await payload.find({
    collection: 'bookings',
    where: {
      and: [{ registrationToken: { equals: token } }, { kind: { equals: 'camp' } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  const booking = docs[0]
  const sessionId = booking ? idOf(booking.session) : null
  if (!booking || !sessionId) return null
  const session = await payload
    .findByID({
      collection: 'sessions',
      id: sessionId,
      depth: 1,
      joins: false,
      overrideAccess: true,
    })
    .catch(() => null)
  if (!session) return null
  const { docs: registrations } = await payload.find({
    collection: 'camp-registrations',
    where: { booking: { equals: booking.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return {
    booking,
    session,
    camp: typeof session.camp === 'object' ? session.camp : null,
    registration: registrations[0] ?? null,
  }
}

/**
 * What the link may do now. Open from the sign-up until the camp starts — the
 * parent may correct the medication the week before (the reason for the
 * form's timing). Closed once it has started (the paper card rules then),
 * for a cancelled booking and while the child waits for a place.
 */
export function registrationOpen(
  ctx: RegistrationContext,
  now = new Date(),
): 'open' | 'started' | 'cancelled' | 'waitlist' {
  const status = ctx.booking.status as BookingStatus
  if (status === 'cancelled') return 'cancelled'
  if (status === 'waitlist') return 'waitlist'
  if (Date.parse(ctx.session.startDate) <= now.getTime()) return 'started'
  return 'open'
}

export interface RegistrationInput {
  pesel: string
  heightCm: number
  allergies: string
  medications: string
  diet: string
  conditions: string
  photoConsent: boolean
  invoiceRequested: boolean
}

/**
 * Saves the form: the registration row (created or replaced) and, on the
 * booking, what outlives the camp — the birth date from the PESEL, the photo
 * consent (ticked: its clause; unticked: withdrawn) and the invoice request.
 * One transaction: the parent never sees half a save. Returns whether this
 * was the first save (the emails differ) and the deposit's deadline — set
 * on the first save, `DEPOSIT_DAYS` from now: the payment details go out
 * with this save's email.
 */
export async function saveRegistration(
  payload: Payload,
  ctx: RegistrationContext,
  input: RegistrationInput,
): Promise<{ first: boolean; depositDueAt: string | null }> {
  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    const now = new Date().toISOString()
    const data = {
      booking: ctx.booking.id,
      pesel: input.pesel.trim(),
      heightCm: input.heightCm,
      allergies: input.allergies.trim() || null,
      medications: input.medications.trim() || null,
      diet: input.diet.trim() || null,
      conditions: input.conditions.trim() || null,
      activitiesConsentText: campActivitiesConsentForStorage(),
      consentText: campRegistrationConsentForStorage(),
      consentDate: now,
    }
    // Looked up again inside the transaction: two tabs sending the form at
    // once must not both create a row (the field is unique — the second
    // would fail with a database error instead of updating).
    const { docs } = await payload.find({
      collection: 'camp-registrations',
      where: { booking: { equals: ctx.booking.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const existing = docs[0]
    // Kept when it is already set — a correction of the form does not move
    // the deadline (and the school may have moved it by hand).
    const dueAt =
      ctx.booking.depositDueAt ?? (existing ? null : depositDueDate(new Date()).toISOString())
    if (existing) {
      await payload.update({
        collection: 'camp-registrations',
        id: existing.id,
        data,
        overrideAccess: true,
        req,
      })
    } else {
      await payload.create({ collection: 'camp-registrations', data, overrideAccess: true, req })
    }

    const birthDate = peselBirthDate(input.pesel)
    await payload.update({
      collection: 'bookings',
      id: ctx.booking.id,
      data: {
        // Noon UTC, the way Payload stores a day-only date.
        childBirthDate: birthDate ? `${birthDate}T12:00:00.000Z` : ctx.booking.childBirthDate,
        photoConsent: input.photoConsent,
        photoConsentText: input.photoConsent ? photoConsentForStorage() : null,
        invoiceRequested: input.invoiceRequested,
        registeredAt: ctx.booking.registeredAt ?? now,
        depositDueAt: dueAt,
      },
      overrideAccess: true,
      req,
      context: { skipRecount: true, skipStatusEmail: true },
    })
    await commitTransaction(req)
    return { first: !existing, depositDueAt: dueAt }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

/** The emails after a save: the parent on the first one, the school on every one. */
export async function sendRegistrationEmails(
  payload: Payload,
  ctx: RegistrationContext,
  token: string,
  saved: { first: boolean; depositDueAt: string | null },
): Promise<void> {
  const { first } = saved
  const { booking, session, camp } = ctx
  const lang = (booking.language ?? 'pl') as EmailLanguage
  const name = childName(booking)
  const campTitle = camp?.title ?? ''
  const mailbox = campMailbox()
  if (first && booking.email) {
    await payload
      .sendEmail({
        to: booking.email,
        replyTo: mailbox,
        ...pick(
          registrationReceivedEmail(lang, {
            firstName: booking.firstName,
            childName: name,
            campTitle,
            dates: formatSessionDates(lang, session.startDate, session.endDate),
            url: registrationUrl(token),
            payment: paymentDetails(
              lang,
              name,
              campPrice(session.price, camp?.price),
              saved.depositDueAt,
            ),
          }),
        ),
      })
      .catch((error) =>
        recordEmailIssue(
          payload,
          booking.id,
          'Potwierdzenie formularza z danymi do przelewu',
          error,
        ),
      )
  }
  if (mailbox) {
    await payload
      .sendEmail({
        to: mailbox,
        ...pick(
          registrationNotification({
            childName: name,
            parent: `${booking.firstName} ${booking.lastName}`,
            campTitle,
            dates: formatSessionDates('pl', session.startDate, session.endDate),
            updated: !first,
            adminUrl: `${publicUrl()}/admin/collections/bookings/${booking.id}`,
          }),
        ),
      })
      .catch((error) => console.error('Failed to send the registration notification:', error))
  }
}

/**
 * Emails the parent the registration link — from the panel ("Wyślij link"),
 * when the child moves up from the waiting list, or as the reminder. The
 * token stays the one already sent (an older email's link keeps working); a
 * booking made in the panel gets its first one here. Written through the
 * database adapter: the token field is hidden, and a save through the
 * collection would run its hooks again from inside one of them.
 *
 * Returns false when there is nobody to write to.
 */
export async function sendRegistrationLink(
  payload: Payload,
  bookingId: number,
  reason: RegistrationLinkReason,
  req?: Req,
): Promise<boolean> {
  const booking = (await payload.findByID({
    collection: 'bookings',
    id: bookingId,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
    req,
  })) as Booking
  if (!booking.email || booking.kind !== 'camp') return false
  const sessionId = idOf(booking.session)
  const session = sessionId
    ? await payload
        .findByID({
          collection: 'sessions',
          id: sessionId,
          depth: 1,
          joins: false,
          overrideAccess: true,
          req,
        })
        .catch(() => null)
    : null
  const token = booking.registrationToken || crypto.randomBytes(32).toString('hex')
  const now = new Date().toISOString()
  await payload.db.updateOne({
    collection: 'bookings',
    id: booking.id,
    data: {
      registrationToken: token,
      registrationSentAt: reason === 'reminder' ? booking.registrationSentAt : now,
      registrationReminderAt: reason === 'reminder' ? now : null,
    },
    req,
  })
  const lang = (booking.language ?? 'pl') as EmailLanguage
  const camp = session && typeof session.camp === 'object' ? session.camp : null
  try {
    await payload.sendEmail({
      to: booking.email,
      replyTo: campMailbox(),
      ...pick(
        registrationLinkEmail(lang, reason, {
          firstName: booking.firstName,
          childName: childName(booking),
          campTitle: camp?.title ?? '',
          dates: session ? formatSessionDates(lang, session.startDate, session.endDate) : '',
          url: registrationUrl(token),
        }),
      ),
    })
  } catch (error) {
    await recordEmailIssue(
      payload,
      booking.id,
      reason === 'reminder'
        ? 'Przypomnienie o formularzu rejestracyjnym'
        : 'Link do formularza rejestracyjnego',
      error,
      req,
    )
  }
  return true
}

/**
 * Whether a status change gives the child a place it did not have — the
 * moment the parent needs the form (the sign-up email had no link for a
 * child on the waiting list).
 */
export function movedUpFromWaitlist(
  previous: string | null | undefined,
  next: string | null | undefined,
): boolean {
  return (
    previous === 'waitlist' &&
    (ACTIVE_STATUSES as readonly (string | null | undefined)[]).includes(next)
  )
}

// --- the daily sweep -------------------------------------------------------------

/** One reminder per booking whose form is still empty (`registrationReminderWhere`). */
export async function sendRegistrationReminders(payload: Payload): Promise<void> {
  const { docs } = await payload.find({
    collection: 'bookings',
    where: registrationReminderWhere(new Date()),
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { kind: true },
  })
  for (const { id } of docs) {
    await sendRegistrationLink(payload, id, 'reminder').catch((error) =>
      payload.logger.warn({ err: error }, `Registration reminder for booking ${id} failed`),
    )
  }
  if (docs.length) payload.logger.info(`Sent ${docs.length} registration form reminder(s)`)
}

/**
 * One reminder per camp booking whose deposit is late
 * (`depositReminderWhere`), with the payment details again. Marked BEFORE the
 * send: a reminder that failed is noted on the booking for the school, and
 * the next day does not send it twice.
 */
export async function sendDepositReminders(payload: Payload): Promise<void> {
  const { docs } = await payload.find({
    collection: 'bookings',
    where: depositReminderWhere(new Date()),
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  for (const booking of docs) {
    try {
      await payload.db.updateOne({
        collection: 'bookings',
        id: booking.id,
        data: { depositReminderAt: new Date().toISOString() },
      })
      const sessionId = idOf(booking.session)
      const session = sessionId
        ? await payload
            .findByID({
              collection: 'sessions',
              id: sessionId,
              depth: 1,
              joins: false,
              overrideAccess: true,
            })
            .catch(() => null)
        : null
      const camp = session && typeof session.camp === 'object' ? session.camp : null
      const lang = (booking.language ?? 'pl') as EmailLanguage
      const name = childName(booking)
      await payload
        .sendEmail({
          to: booking.email!,
          replyTo: campMailbox(),
          ...pick(
            depositReminderEmail(lang, {
              firstName: booking.firstName,
              childName: name,
              campTitle: camp?.title ?? '',
              dates: session ? formatSessionDates(lang, session.startDate, session.endDate) : '',
              payment: paymentDetails(
                lang,
                name,
                campPrice(session?.price, camp?.price),
                booking.depositDueAt ?? null,
              ),
            }),
          ),
        })
        .catch((error) => recordEmailIssue(payload, booking.id, 'Przypomnienie o zaliczce', error))
    } catch (error) {
      payload.logger.warn({ err: error }, `Deposit reminder for booking ${booking.id} failed`)
    }
  }
  if (docs.length) payload.logger.info(`Sent ${docs.length} deposit reminder(s)`)
}

/**
 * Deletes registration forms a month after their camp
 * (`CAMP_HEALTH_RETENTION_MONTHS`) — the PESEL and the health data, as the
 * consent clause and the privacy policy promise.
 */
export async function deleteExpiredRegistrations(payload: Payload): Promise<void> {
  const { docs, errors } = await payload.delete({
    collection: 'camp-registrations',
    where: expiredRegistrationsWhere(new Date()),
    overrideAccess: true,
    // Only the count is used — the deleted rows' health data stays unread.
    select: { label: true },
  })
  if (docs.length) payload.logger.info(`Deleted ${docs.length} camp registration form(s)`)
  if (errors.length) {
    payload.logger.warn({ errors }, `Could not delete ${errors.length} registration form(s)`)
  }
}

// --- the panel's "Wyślij link" (`Bookings.endpoints`) ---------------------------

export async function registrationLinkHandler(req: PayloadRequest): Promise<Response> {
  if (!isAdmin({ req })) {
    return Response.json({ error: 'Tylko dla konta szkoły.' }, { status: 403 })
  }
  const id = Number(req.routeParams?.id)
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: 'Nie ma takiego zapisu.' }, { status: 404 })
  }
  const booking = await req.payload
    .findByID({ collection: 'bookings', id, depth: 0, overrideAccess: true, disableErrors: true })
    .catch(() => null)
  if (!booking) return Response.json({ error: 'Nie ma takiego zapisu.' }, { status: 404 })
  if (booking.kind !== 'camp') {
    return Response.json(
      { error: 'Formularz rejestracyjny jest tylko przy obozie.' },
      { status: 400 },
    )
  }
  if (!booking.email) {
    return Response.json(
      { error: 'Zapis nie ma adresu e-mail — nie ma gdzie wysłać linku.' },
      { status: 400 },
    )
  }
  await sendRegistrationLink(req.payload, id, 'again')
  return Response.json({ ok: true, email: booking.email })
}
