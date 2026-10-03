'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

import { RESET_LINK_HOURS } from '@/collections/Customers'
import { sendVerificationLink } from '@/lib/accountEmails'
import { getCurrentCustomer } from '@/lib/auth'
import { formatSessionDates } from '@/lib/bookings'
import { sessionSummary } from '@/lib/bookingEffects'
import { createBooking } from '@/lib/bookingService'
import { pickLanguage } from '@/lib/email/language'
import { publicUrl, tokenLink } from '@/lib/email/links'
import {
  bookingReceivedEmail,
  newAccountFromBookingEmail,
  newBookingNotification,
} from '@/lib/email/templates'
import {
  isValid,
  looksLikeBot,
  normalizePhone,
  validateBooking,
  type BookingErrors,
} from '@/lib/validation'

/**
 * Course booking — from `/kursy/[slug]/zapis`.
 *
 * This action does the request-bound parts: who is logged in, the form's
 * validation, and the emails once the booking is committed. The booking
 * itself — the checks on the session, the count of free places, the save —
 * happens in ONE locked transaction in `lib/bookingService.ts`; see there
 * why (five simultaneous bookings for one place all got it before the lock).
 *
 * The booking is committed FIRST; the emails after it, each on its own. A
 * failed email is logged and the person still has their place.
 */

export interface BookingState {
  status: 'idle' | 'done' | 'error'
  errors?: BookingErrors
  message?: string
  values?: Record<string, string>
  /** Set on success: the booking went onto the waiting list. */
  waitlist?: boolean
  /**
   * Set on success when "create an account" was ticked. Deliberately ONE
   * flag for "a new account" and "an existing unconfirmed one got a fresh
   * link": a different message would tell whoever typed the address whether
   * it already has an account.
   */
  accountEmail?: boolean
  /** The form was shown to a logged-in participant whose login has since expired. */
  loginExpired?: boolean
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '')
}

function pick(email: { subject: string; html: string; text: string }) {
  return { subject: email.subject, html: email.html, text: email.text }
}

export async function bookCourse(
  _previous: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const data = {
    sessionId: field(formData, 'sessionId'),
    firstName: field(formData, 'firstName'),
    lastName: field(formData, 'lastName'),
    email: field(formData, 'email'),
    phone: field(formData, 'phone'),
    notes: field(formData, 'notes'),
    consent: formData.get('consent') === 'on',
  }
  const wantsAccount = formData.get('createAccount') === 'on'
  const courseId = Number(field(formData, 'courseId'))
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

  if (looksLikeBot(field(formData, 'website'))) return { status: 'done' }

  const customer = await getCurrentCustomer()
  // Rendered for a logged-in participant (no contact fields on the page), but
  // the login is gone by now — expired, or logged out in another tab. Without
  // this, validation would demand fields the person cannot see.
  if (!customer && formData.get('asCustomer') === '1') {
    return {
      status: 'error',
      values,
      loginExpired: true,
      message: 'Sesja wygasła — zaloguj się ponownie, a potem wyślij zapis jeszcze raz.',
    }
  }

  const errors = validateBooking(data, Boolean(customer))
  if (!isValid(errors)) {
    return { status: 'error', errors, values, message: 'Popraw zaznaczone pola.' }
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
    const language = customer?.language ?? pickLanguage((await headers()).get('accept-language'))

    const result = await createBooking(payload, {
      sessionId: Number(data.sessionId),
      courseId,
      contact,
      notes: data.notes.trim() || null,
      language,
      customerId: customer?.id ?? null,
      wantsAccount: !customer && wantsAccount,
    })

    if (result.kind === 'unavailable') {
      return {
        status: 'error',
        values,
        errors: { sessionId: 'Ten termin nie jest już dostępny. Wybierz inny.' },
      }
    }
    // The same person on the same session again: answered as a success —
    // they ARE booked, and a different answer would tell anyone typing an
    // address whether that person signed up for this course.
    if (result.kind === 'duplicate') return { status: 'done', accountEmail: wantsAccount }

    // --- emails, each on its own: the booking is committed ---
    const { booking, session, course, newAccount, unconfirmedAccount } = result
    const waitlist = result.status === 'waitlist'
    const summary = await sessionSummary(payload, session.id, language).catch(() => null)
    const accountUrl = booking.customer ? `${publicUrl()}/konto` : null

    await payload
      .sendEmail({
        to: contact.email,
        replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
        ...pick(
          bookingReceivedEmail(language, {
            firstName: contact.firstName,
            courseTitle: summary?.courseTitle ?? course.title,
            dates:
              summary?.dates ?? formatSessionDates(language, session.startDate, session.endDate),
            location: summary?.location,
            accountUrl,
            waitlist,
          }),
        ),
      })
      .catch((error) => console.error('Failed to send the booking confirmation:', error))

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
        console.error('Failed to send the new-account email:', error)
      }
    }
    if (unconfirmedAccount) {
      await sendVerificationLink(payload, unconfirmedAccount).catch((error) =>
        console.error('Failed to resend a confirmation link from a booking:', error),
      )
    }

    const notify = process.env.ADMIN_NOTIFY_EMAIL
    if (notify) {
      await payload
        .sendEmail({
          to: notify,
          replyTo: { name: `${contact.firstName} ${contact.lastName}`, address: contact.email },
          ...pick(
            newBookingNotification({
              name: `${contact.firstName} ${contact.lastName}`,
              email: contact.email,
              phone: contact.phone,
              courseTitle: course.title,
              dates: formatSessionDates('pl', session.startDate, session.endDate),
              notes: data.notes.trim() || null,
              waitlist,
              hasAccount: Boolean(booking.customer),
              language,
              adminUrl: `${publicUrl()}/admin/collections/bookings/${booking.id}`,
            }),
          ),
        })
        .catch((error) => console.error('Failed to send the booking notification:', error))
    }

    return { status: 'done', waitlist, accountEmail: !customer && wantsAccount }
  } catch (error) {
    console.error('Failed to store a course booking:', error)
    return {
      status: 'error',
      values,
      message: 'Nie udało się zapisać. Spróbuj ponownie za chwilę albo zadzwoń.',
    }
  }
}
