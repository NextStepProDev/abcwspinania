import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

import { isAdmin } from '@/lib/access'
import { ACTIVE_STATUSES, formatSessionDates } from '@/lib/bookings'
import {
  CONTRACT_RETURN_EMAIL,
  campSeason,
  contractFileName,
  type ContractData,
} from '@/lib/campContract'
import { contractPdf } from '@/lib/contractPdf'
import { privateFilesDir } from '@/lib/privateFiles'
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
import {
  campMailbox,
  campPrice,
  campSender,
  depositDueDate,
  joinNames,
  paymentDetails,
} from '@/lib/campPayment'
import {
  depositReminderWhere,
  expiredRegistrationsWhere,
  registrationReminderWhere,
} from '@/lib/expiry'
import { peselBirthDate } from '@/lib/pesel'
import type { Booking, Camp, CampRegistration, Session } from '@/payload-types'

/**
 * The camp registration form (step 2): finding the sign-up a link belongs
 * to (one link and one form for the children signed up together), saving
 * the form, sending the link, the reminder and the deletion a
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

/** The contract to download — the same key as the form (`umowa/route.ts`). */
export const contractUrl = (token: string) => tokenLink('/obozy/rejestracja/umowa', token)

export const childName = (booking: Pick<Booking, 'childFirstName' | 'childLastName'>) =>
  [booking.childFirstName, booking.childLastName].filter(Boolean).join(' ')

export interface RegistrationChild {
  booking: Booking
  registration: CampRegistration | null
}

/**
 * A registration link's sign-up: the children it was sent for (one link and
 * one form for the children signed up together, decided 21.10.2026), their
 * session and camp.
 */
export interface RegistrationContext {
  token: string
  session: Session
  camp: Camp | null
  children: RegistrationChild[]
}

/** The bookings sharing a registration token, oldest first — hidden field included. */
async function bookingsWithToken(payload: Payload, token: string, req?: Req): Promise<Booking[]> {
  const { docs } = await payload.find({
    collection: 'bookings',
    where: {
      and: [{ registrationToken: { equals: token } }, { kind: { equals: 'camp' } }],
    },
    sort: 'createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
    req,
  })
  return docs
}

/**
 * The sign-up behind a registration link, with its session and any forms
 * already sent — or null for a token that matches nothing. Only camp
 * bookings carry a token. The session is read without its `bookings` join
 * (every participant's data).
 */
export async function findByToken(
  payload: Payload,
  token: string,
): Promise<RegistrationContext | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null
  const bookings = await bookingsWithToken(payload, token)
  const sessionId = bookings[0] ? idOf(bookings[0].session) : null
  if (!sessionId) return null
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
    where: { booking: { in: bookings.map((b) => b.id) } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  return {
    token,
    session,
    camp: typeof session.camp === 'object' ? session.camp : null,
    children: bookings.map((booking) => ({
      booking,
      registration: registrations.find((r) => idOf(r.booking) === booking.id) ?? null,
    })),
  }
}

/** Children whose part of the form can be filled in: not cancelled, not waiting. */
export function openChildren(ctx: RegistrationContext): RegistrationChild[] {
  return ctx.children.filter(
    (c) => c.booking.status !== 'cancelled' && c.booking.status !== 'waitlist',
  )
}

/**
 * What the link may do now. Open from the sign-up until the camp starts — the
 * parent may correct the medication the week before (the reason for the
 * form's timing). Closed once it has started (the paper card rules then);
 * with no child left to fill in, it says why — cancelled, or waiting.
 */
export function registrationOpen(
  ctx: RegistrationContext,
  now = new Date(),
): 'open' | 'started' | 'cancelled' | 'waitlist' {
  if (Date.parse(ctx.session.startDate) <= now.getTime()) return 'started'
  if (openChildren(ctx).length > 0) return 'open'
  return ctx.children.some((c) => c.booking.status === 'waitlist') ? 'waitlist' : 'cancelled'
}

export interface RegistrationChildInput {
  pesel: string
  heightCm: number
  allergies: string
  medications: string
  diet: string
  conditions: string
  photoConsent: boolean
}

export interface RegistrationInput {
  address: { street: string; postcode: string; city: string }
  invoiceRequested: boolean
  /** The invoice goes to a company; null for one in the parent's name. */
  invoiceCompany: { name: string; nip: string; address: string } | null
  /** By booking id — one entry per child the form showed. */
  children: Record<number, RegistrationChildInput>
}

export interface SavedRegistration {
  /** No child of this sign-up had sent the form before — the payment email goes out. */
  first: boolean
  /** The deposit's deadline, the same for the whole sign-up. */
  depositDueAt: string | null
  /** The children saved, in the form's order. */
  bookings: Booking[]
}

/**
 * Saves the form for the whole sign-up: a registration row per child
 * (created or replaced) and, on each booking, what outlives the camp — the
 * parent's address, the birth date from the PESEL, the photo consent
 * (ticked: its clause; unticked: withdrawn) and the invoice request. One
 * transaction: the parent never sees half a save.
 *
 * The deposit's deadline is set on the first save, `DEPOSIT_DAYS` from now —
 * the payment details go out with this save's email — and kept on a
 * correction (the school may also have moved it by hand).
 */
export async function saveRegistration(
  payload: Payload,
  ctx: RegistrationContext,
  input: RegistrationInput,
): Promise<SavedRegistration> {
  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    const now = new Date().toISOString()
    const open = openChildren(ctx).filter((c) => input.children[c.booking.id])
    // Looked up again inside the transaction: two tabs sending the form at
    // once must not both create a row (the field is unique — the second
    // would fail with a database error instead of updating).
    const { docs: existing } = await payload.find({
      collection: 'camp-registrations',
      where: { booking: { in: open.map((c) => c.booking.id) } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const first = existing.length === 0
    const dueAt =
      ctx.children.map((c) => c.booking.depositDueAt).find(Boolean) ??
      (first ? depositDueDate(new Date()).toISOString() : null)

    const saved: Booking[] = []
    for (const { booking } of open) {
      const child = input.children[booking.id]!
      const data = {
        booking: booking.id,
        pesel: child.pesel.trim(),
        heightCm: child.heightCm,
        allergies: child.allergies.trim() || null,
        medications: child.medications.trim() || null,
        diet: child.diet.trim() || null,
        conditions: child.conditions.trim() || null,
        activitiesConsentText: campActivitiesConsentForStorage(),
        consentText: campRegistrationConsentForStorage(),
        consentDate: now,
      }
      const row = existing.find((r) => idOf(r.booking) === booking.id)
      if (row) {
        await payload.update({
          collection: 'camp-registrations',
          id: row.id,
          data,
          overrideAccess: true,
          req,
        })
      } else {
        await payload.create({ collection: 'camp-registrations', data, overrideAccess: true, req })
      }
      const birthDate = peselBirthDate(child.pesel)
      saved.push(
        await payload.update({
          collection: 'bookings',
          id: booking.id,
          data: {
            addressStreet: input.address.street.trim(),
            addressPostcode: input.address.postcode.trim(),
            addressCity: input.address.city.trim(),
            // Noon UTC, the way Payload stores a day-only date.
            childBirthDate: birthDate ? `${birthDate}T12:00:00.000Z` : booking.childBirthDate,
            photoConsent: child.photoConsent,
            photoConsentText: child.photoConsent ? photoConsentForStorage() : null,
            invoiceRequested: input.invoiceRequested,
            invoiceCompanyName: input.invoiceCompany?.name.trim() || null,
            invoiceNip: input.invoiceCompany?.nip || null,
            invoiceCompanyAddress: input.invoiceCompany?.address.trim() || null,
            registeredAt: booking.registeredAt ?? now,
            depositDueAt: booking.depositDueAt ?? dueAt,
          },
          overrideAccess: true,
          req,
          context: { skipRecount: true, skipStatusEmail: true },
        }),
      )
    }
    await commitTransaction(req)
    return { first, depositDueAt: dueAt, bookings: saved }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

/** The organiser's stamp and signature from "Ustawienia obozów", or null when none is uploaded. */
async function contractSignature(
  payload: Payload,
): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' } | null> {
  const config = await payload
    .findGlobal({ slug: 'camp-config', depth: 1, overrideAccess: true })
    .catch(() => null)
  const file = config?.contractSignature
  if (!file || typeof file !== 'object' || !file.filename) return null
  const bytes = await readFile(path.join(privateFilesDir(), path.basename(file.filename))).catch(
    () => null,
  )
  if (!bytes) return null
  return { bytes, type: file.mimeType === 'image/png' ? 'png' : 'jpg' }
}

/**
 * The contract for the children of one sign-up (`campContract.ts`): the
 * parent from the first of them (the address is copied onto each), every
 * child with its turnus, the price and the day of concluding. Null when the
 * turnus has no price — a contract must state one.
 */
export async function buildContract(
  payload: Payload,
  input: {
    bookings: Booking[]
    session: Session
    camp: Camp | null
    concludedOn: Date
    price: number | null
  },
): Promise<{ bytes: Uint8Array; fileName: string; signed: boolean } | null> {
  const lead = input.bookings[0]
  if (!lead || input.price === null) return null
  const season = campSeason(input.session.startDate)
  const turnus = [
    formatSessionDates('pl', input.session.startDate, input.session.endDate),
    input.camp?.title,
  ]
    .filter(Boolean)
    .join(' · ')
  const data: ContractData = {
    concludedOn: input.concludedOn,
    season,
    parent: {
      name: `${lead.firstName} ${lead.lastName}`,
      address: [
        lead.addressStreet,
        [lead.addressPostcode, lead.addressCity].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join(', '),
      phone: lead.phone,
      email: lead.email ?? '',
    },
    children: input.bookings.map((b) => ({ name: childName(b), turnus })),
    price: input.price,
    ownSleepingBags: Boolean(input.camp?.ownSleepingBags),
  }
  const signature = await contractSignature(payload)
  const bytes = await contractPdf(data, signature)
  return { bytes, fileName: contractFileName(season, lead.lastName), signed: Boolean(signature) }
}

/**
 * The emails after a save: the parent on the first one — the payment
 * details for the whole sign-up, one transfer — and the school on every one.
 */
export async function sendRegistrationEmails(
  payload: Payload,
  ctx: RegistrationContext,
  saved: SavedRegistration,
): Promise<{ contractAttached: boolean }> {
  const { session, camp } = ctx
  const lead = saved.bookings[0]
  if (!lead) return { contractAttached: false }
  let contractAttached = false
  const lang = (lead.language ?? 'pl') as EmailLanguage
  const names = saved.bookings.map(childName)
  const campTitle = camp?.title ?? ''
  const mailbox = campMailbox()
  if (saved.first && lead.email) {
    // The contract goes with the payment details: the day it is sent is the
    // day it is concluded, and the deposit's 7 days count from it. A failed
    // contract must not stop the payment email — the school hears about it.
    const price = campPrice(session.price, camp?.price)
    const sentAt = new Date()
    const contract = await buildContract(payload, {
      bookings: saved.bookings,
      session,
      camp,
      concludedOn: sentAt,
      price,
    }).catch((error) => {
      payload.logger.error({ err: error }, 'Failed to build a camp contract')
      return null
    })
    if (contract) {
      contractAttached = true
      // Deleting the file in "Pliki prywatne" empties the setting by itself —
      // without this the contracts would go unsigned and nobody would know.
      if (!contract.signed) {
        await recordEmailIssue(
          payload,
          lead.id,
          'Umowa poszła bez podpisu organizatora',
          'w „Ustawieniach obozów” nie ma pieczątki z podpisem; wybierz ją tam i wyślij rodzicowi umowę pobraną z zapisu',
        )
      }
      for (const booking of saved.bookings) {
        await payload.db.updateOne({
          collection: 'bookings',
          id: booking.id,
          data: { contractSentAt: sentAt.toISOString(), contractPrice: price },
        })
      }
    } else {
      await recordEmailIssue(
        payload,
        lead.id,
        'Umowa nie poszła z danymi do przelewu',
        price === null
          ? 'turnus nie ma ceny w panelu; wpisz ją i pobierz umowę z zapisu'
          : 'nie udało się utworzyć umowy; pobierz ją z zapisu',
      )
    }
    await payload
      .sendEmail({
        to: lead.email,
        from: campSender(),
        replyTo: mailbox,
        ...(contract
          ? { attachments: [{ filename: contract.fileName, content: contract.bytes }] }
          : {}),
        ...pick(
          registrationReceivedEmail(lang, {
            firstName: lead.firstName,
            childName: joinNames(lang, names),
            campTitle,
            dates: formatSessionDates(lang, session.startDate, session.endDate),
            url: registrationUrl(ctx.token),
            payment: paymentDetails(lang, names, price, saved.depositDueAt),
            contractAttached: Boolean(contract),
            contractEmail: CONTRACT_RETURN_EMAIL,
          }),
        ),
      })
      .catch((error) =>
        recordEmailIssue(payload, lead.id, 'Potwierdzenie formularza z danymi do przelewu', error),
      )
  }
  if (mailbox) {
    await payload
      .sendEmail({
        from: campSender(),
        to: mailbox,
        ...pick(
          registrationNotification({
            childName: joinNames('pl', names),
            parent: `${lead.firstName} ${lead.lastName}`,
            campTitle,
            dates: formatSessionDates('pl', session.startDate, session.endDate),
            updated: !saved.first,
            adminUrl: `${publicUrl()}/admin/collections/bookings/${lead.id}`,
          }),
        ),
      })
      .catch((error) => console.error('Failed to send the registration notification:', error))
  }
  return { contractAttached }
}

/**
 * Emails the parent the registration link — from the panel ("Wyślij link"),
 * when a child moves up from the waiting list, or as the reminder. The link
 * is the sign-up's: the email names every child it opens, and the token
 * stays the one already sent (an older email's link keeps working). A child
 * with none — added in the panel, or moved up from the waiting list — gets
 * a token of its own: its own form and, later, its own contract.
 *
 * Written through the database adapter: the token field is hidden, and a
 * save through the collection would run its hooks again from inside one of
 * them. Returns false when there is nobody to write to.
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
  const token = booking.registrationToken || crypto.randomBytes(32).toString('hex')
  const group = booking.registrationToken ? await bookingsWithToken(payload, token, req) : [booking]
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
  const now = new Date().toISOString()
  for (const member of group) {
    await payload.db.updateOne({
      collection: 'bookings',
      id: member.id,
      data: {
        registrationToken: token,
        registrationSentAt: reason === 'reminder' ? member.registrationSentAt : now,
        registrationReminderAt: reason === 'reminder' ? now : null,
      },
      req,
    })
  }
  const named = group.filter((b) => b.status !== 'cancelled' && b.status !== 'waitlist')
  const lang = (booking.language ?? 'pl') as EmailLanguage
  const camp = session && typeof session.camp === 'object' ? session.camp : null
  try {
    await payload.sendEmail({
      to: booking.email,
      from: campSender(),
      replyTo: campMailbox(),
      ...pick(
        registrationLinkEmail(lang, reason, {
          firstName: booking.firstName,
          childName: joinNames(lang, (named.length ? named : [booking]).map(childName)),
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

/**
 * One reminder per sign-up whose form is still empty
 * (`registrationReminderWhere`) — siblings share a link, so they share the
 * reminder too.
 */
export async function sendRegistrationReminders(payload: Payload): Promise<void> {
  const { docs } = await payload.find({
    collection: 'bookings',
    where: registrationReminderWhere(new Date()),
    pagination: false,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
    select: { registrationToken: true },
  })
  const seen = new Set<string>()
  let sent = 0
  for (const { id, registrationToken } of docs) {
    if (registrationToken && seen.has(registrationToken)) continue
    if (registrationToken) seen.add(registrationToken)
    sent += 1
    await sendRegistrationLink(payload, id, 'reminder').catch((error) =>
      payload.logger.warn({ err: error }, `Registration reminder for booking ${id} failed`),
    )
  }
  if (sent) payload.logger.info(`Sent ${sent} registration form reminder(s)`)
}

/**
 * One reminder per sign-up whose deposit is late (`depositReminderWhere`),
 * with the payment details again — for the children still owing it, one
 * transfer. Marked BEFORE the send: a reminder that failed is noted on the
 * booking for the school, and the next day does not send it twice.
 */
export async function sendDepositReminders(payload: Payload): Promise<void> {
  const { docs } = await payload.find({
    collection: 'bookings',
    where: depositReminderWhere(new Date()),
    pagination: false,
    sort: 'createdAt',
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  // Siblings of one sign-up share its token; a booking without one stands alone.
  const groups = new Map<string, Booking[]>()
  for (const booking of docs) {
    const key = booking.registrationToken || `booking-${booking.id}`
    groups.set(key, [...(groups.get(key) ?? []), booking])
  }
  for (const group of groups.values()) {
    const lead = group[0]!
    try {
      for (const booking of group) {
        await payload.db.updateOne({
          collection: 'bookings',
          id: booking.id,
          data: { depositReminderAt: new Date().toISOString() },
        })
      }
      const sessionId = idOf(lead.session)
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
      const lang = (lead.language ?? 'pl') as EmailLanguage
      const names = group.map(childName)
      await payload
        .sendEmail({
          to: lead.email!,
          from: campSender(),
          replyTo: campMailbox(),
          ...pick(
            depositReminderEmail(lang, {
              firstName: lead.firstName,
              childName: joinNames(lang, names),
              campTitle: camp?.title ?? '',
              dates: session ? formatSessionDates(lang, session.startDate, session.endDate) : '',
              payment: paymentDetails(
                lang,
                names,
                campPrice(session?.price, camp?.price),
                lead.depositDueAt ?? null,
              ),
            }),
          ),
        })
        .catch((error) => recordEmailIssue(payload, lead.id, 'Przypomnienie o zaliczce', error))
    } catch (error) {
      payload.logger.warn({ err: error }, `Deposit reminder for booking ${lead.id} failed`)
    }
  }
  if (groups.size) payload.logger.info(`Sent ${groups.size} deposit reminder(s)`)
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

// --- the contract to download -------------------------------------------------------

/**
 * The contract of the sign-up `booking` belongs to, as sent — the children
 * sharing its link that have a place, the price and the day stored when it
 * went out. Before it went out, a preview with today's date and the current
 * price (the school may look at it in the panel). Null without a price.
 */
export async function contractOf(
  payload: Payload,
  booking: Booking,
): Promise<{ bytes: Uint8Array; fileName: string; signed: boolean } | null> {
  const sessionId = idOf(booking.session)
  if (!sessionId) return null
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
  const camp = typeof session.camp === 'object' ? session.camp : null
  const group = booking.registrationToken
    ? await bookingsWithToken(payload, booking.registrationToken)
    : [booking]
  const bookings = group.filter((b) => b.status !== 'cancelled' && b.status !== 'waitlist')
  return buildContract(payload, {
    bookings: bookings.length ? bookings : [booking],
    session,
    camp,
    concludedOn: booking.contractSentAt ? new Date(booking.contractSentAt) : new Date(),
    price:
      typeof booking.contractPrice === 'number'
        ? booking.contractPrice
        : campPrice(session.price, camp?.price),
  })
}

export function pdfResponse(contract: { bytes: Uint8Array; fileName: string }): Response {
  return new Response(Buffer.from(contract.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      // ASCII only by construction (`contractFileName`).
      'Content-Disposition': `attachment; filename="${contract.fileName}"`,
      // Personal data: never in a shared cache.
      'Cache-Control': 'private, no-store',
    },
  })
}

/** GET /api/bookings/:id/contract — the school's copy, from the booking's page. */
export async function contractHandler(req: PayloadRequest): Promise<Response> {
  if (!isAdmin({ req })) return Response.json({ error: 'Tylko dla konta szkoły.' }, { status: 403 })
  const id = Number(req.routeParams?.id)
  const booking = Number.isInteger(id)
    ? await req.payload
        .findByID({
          collection: 'bookings',
          id,
          depth: 0,
          overrideAccess: true,
          showHiddenFields: true,
          disableErrors: true,
        })
        .catch(() => null)
    : null
  if (!booking || booking.kind !== 'camp') {
    return Response.json({ error: 'Nie ma takiego zapisu obozowego.' }, { status: 404 })
  }
  const contract = await contractOf(req.payload, booking)
  if (!contract) {
    return Response.json(
      { error: 'Umowy nie da się utworzyć — turnus nie ma ceny w panelu.' },
      { status: 400 },
    )
  }
  return pdfResponse(contract)
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
