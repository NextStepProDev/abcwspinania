'use server'

import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

import { RESET_LINK_HOURS } from '@/collections/Customers'
import { sendVerificationLink } from '@/lib/accountEmails'
import { getCurrentCustomer } from '@/lib/auth'
import { MAX_CHILDREN, formatSessionDates } from '@/lib/bookings'
import { recordEmailIssue, sessionSummary } from '@/lib/bookingEffects'
import { createCampBookings } from '@/lib/bookingService'
import { campMailbox } from '@/lib/campPayment'
import { registrationUrl } from '@/lib/campRegistration'
import { DEFAULT_LANGUAGE, type EmailLanguage } from '@/lib/email/language'
import { publicUrl, tokenLink } from '@/lib/email/links'
import {
  campBookingReceivedEmail,
  newAccountFromBookingEmail,
  newCampBookingNotification,
} from '@/lib/email/templates'
import {
  isValid,
  looksLikeBot,
  normalizePhone,
  validateCampBooking,
  type CampBookingErrors,
  type ChildData,
} from '@/lib/validation'
import type { Customer } from '@/payload-types'

/**
 * Camp booking — from `/obozy/[slug]/zapis`: the parent signs up one or more
 * children, one booking each. The course action's shape
 * (`kursy/[slug]/zapis/actions.ts`): the request-bound parts here, the
 * locked transaction in `createCampBookings`, the emails after the commit.
 *
 * Camp mail goes to and from `CAMP_EMAIL` (obozy@, decided 20.10.2026): the
 * school is notified there, and the parent's replies — the signed contract
 * among them — land there too.
 */

export interface CampBookingState {
  status: 'idle' | 'done' | 'error'
  errors?: CampBookingErrors
  message?: string
  values?: Record<string, string>
  /** Sent back on an error, so the children typed in stay on the form. */
  children?: ChildData[]
  /** On success, per child: on the waiting list or with a place. */
  booked?: { name: string; waitlist: boolean }[]
  accountEmail?: boolean
  loginExpired?: boolean
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '')
}

function pick(email: { subject: string; html: string; text: string }) {
  return { subject: email.subject, html: email.html, text: email.text }
}

/**
 * The children as the form sends them: `childFirstName` and `childLastName`
 * once per child, in order. A row added and left wholly empty is dropped —
 * nobody should have to delete it to send the form.
 */
function childrenOf(formData: FormData): ChildData[] {
  const firstNames = formData.getAll('childFirstName').map(String)
  const lastNames = formData.getAll('childLastName').map(String)
  return firstNames
    .map((firstName, i) => ({ firstName, lastName: lastNames[i] ?? '' }))
    .filter((c) => c.firstName.trim() || c.lastName.trim())
}

/** As on a course: the set-password link for a new account, or a fresh confirmation link. */
async function sendAccountEmails(
  payload: Payload,
  bookingId: number,
  language: EmailLanguage,
  newAccount: Customer | null,
  unconfirmedAccount: Customer | null,
) {
  if (newAccount) {
    try {
      const token = await payload.forgotPassword({
        collection: 'customers',
        data: { email: newAccount.email },
        disableEmail: true,
      })
      if (token) {
        await payload.sendEmail({
          to: newAccount.email,
          ...pick(
            newAccountFromBookingEmail(language, {
              firstName: newAccount.firstName,
              url: tokenLink('/konto/ustaw-haslo', token),
              validHours: RESET_LINK_HOURS,
            }),
          ),
        })
      }
    } catch (error) {
      await recordEmailIssue(payload, bookingId, 'Link do ustawienia hasła (nowe konto)', error)
    }
  }
  if (unconfirmedAccount) {
    await sendVerificationLink(payload, unconfirmedAccount).catch((error) =>
      console.error('Failed to resend a confirmation link from a camp booking:', error),
    )
  }
}

export async function bookCamp(
  _previous: CampBookingState,
  formData: FormData,
): Promise<CampBookingState> {
  const children = childrenOf(formData)
  const data = {
    sessionId: field(formData, 'sessionId'),
    firstName: field(formData, 'firstName'),
    lastName: field(formData, 'lastName'),
    email: field(formData, 'email'),
    phone: field(formData, 'phone'),
    notes: field(formData, 'notes'),
    consent: formData.get('consent') === 'on',
    children,
  }
  const wantsAccount = formData.get('createAccount') === 'on'
  const campId = Number(field(formData, 'campId'))
  const values = {
    sessionId: data.sessionId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    notes: data.notes,
    consent: data.consent ? 'on' : '',
    createAccount: wantsAccount ? 'on' : '',
  }

  if (looksLikeBot(field(formData, 'website'))) return { status: 'done', booked: [] }

  const customer = await getCurrentCustomer()
  if (!customer && formData.get('asCustomer') === '1') {
    return {
      status: 'error',
      values,
      children,
      loginExpired: true,
      message: 'Sesja wygasła — zaloguj się ponownie, a potem wyślij zapis jeszcze raz.',
    }
  }

  const errors = validateCampBooking(data, Boolean(customer), MAX_CHILDREN)
  if (!isValid(errors)) {
    return { status: 'error', errors, values, children, message: 'Popraw zaznaczone pola.' }
  }

  try {
    const payload = await getPayload({ config })
    const contact = customer
      ? {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email.toLowerCase(),
          phone: customer.phone,
        }
      : {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim().toLowerCase(),
          phone: normalizePhone(data.phone),
        }
    const language = customer?.language ?? DEFAULT_LANGUAGE

    const result = await createCampBookings(payload, {
      sessionId: Number(data.sessionId),
      campId,
      contact,
      children: children.map((c) => ({
        firstName: c.firstName.trim(),
        lastName: c.lastName.trim(),
      })),
      notes: data.notes.trim() || null,
      language,
      customerId: customer?.id ?? null,
      wantsAccount: !customer && wantsAccount,
    })

    if (result.kind === 'unavailable') {
      return {
        status: 'error',
        values,
        children,
        errors: { sessionId: 'Ten turnus nie jest już dostępny. Wybierz inny.' },
      }
    }

    // --- emails, each on its own: the bookings are committed ---
    const { session, camp, newAccount, unconfirmedAccount } = result
    const created = result.children.filter((c) => c.created)
    const summary = await sessionSummary(payload, session.id, language).catch(() => null)
    const dates = summary?.dates ?? formatSessionDates(language, session.startDate, session.endDate)
    const mailbox = campMailbox()

    for (const child of created) {
      const { booking } = child
      const waitlist = child.status === 'waitlist'
      await payload
        .sendEmail({
          to: contact.email,
          replyTo: mailbox,
          ...pick(
            campBookingReceivedEmail(language, {
              firstName: contact.firstName,
              childName: `${booking.childFirstName} ${booking.childLastName}`,
              campTitle: summary?.courseTitle ?? camp.title,
              dates,
              location: summary?.location,
              registrationUrl:
                !waitlist && child.registrationToken
                  ? registrationUrl(child.registrationToken)
                  : null,
              accountUrl: booking.customer ? `${publicUrl()}/konto` : null,
              waitlist,
            }),
          ),
        })
        .catch((error) =>
          recordEmailIssue(
            payload,
            booking.id,
            waitlist ? 'Mail „lista rezerwowa”' : 'Potwierdzenie zapisu z linkiem do formularza',
            error,
          ),
        )
    }

    // The account's email once per sign-up, noted on its first booking.
    const anchor = created[0]?.booking ?? result.children[0]?.booking
    if (anchor) {
      await sendAccountEmails(
        payload,
        anchor.id,
        anchor.language ?? language,
        newAccount,
        unconfirmedAccount,
      )
    }

    if (mailbox && created.length > 0) {
      const parent = `${contact.firstName} ${contact.lastName}`
      await payload
        .sendEmail({
          to: mailbox,
          replyTo: { name: parent, address: contact.email },
          ...pick(
            newCampBookingNotification({
              name: parent,
              email: contact.email,
              phone: contact.phone,
              campTitle: camp.title,
              dates: formatSessionDates('pl', session.startDate, session.endDate),
              children: created.map((c) => ({
                name: `${c.booking.childFirstName} ${c.booking.childLastName}`,
                waitlist: c.status === 'waitlist',
              })),
              notes: data.notes.trim() || null,
              hasAccount: Boolean(anchor?.customer),
              adminUrl: `${publicUrl()}/admin/collections/bookings?${new URLSearchParams({
                'where[session][equals]': String(session.id),
                'where[kind][equals]': 'camp',
              }).toString()}`,
            }),
          ),
        })
        .catch((error) => console.error('Failed to send the camp booking notification:', error))
    }

    // The same children again (a double click) answer as the first time:
    // they ARE booked, and another answer would tell anyone typing an
    // address who signed up.
    return {
      status: 'done',
      booked: result.children.map((c) => ({
        name: `${c.booking.childFirstName} ${c.booking.childLastName}`,
        waitlist: c.status === 'waitlist',
      })),
      accountEmail: !customer && wantsAccount,
    }
  } catch (error) {
    console.error('Failed to store a camp booking:', error)
    return {
      status: 'error',
      values,
      children,
      message: 'Nie udało się zapisać. Spróbuj ponownie za chwilę albo zadzwoń.',
    }
  }
}
