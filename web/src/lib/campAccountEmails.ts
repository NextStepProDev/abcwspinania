import type { Payload } from 'payload'

import { RESET_LINK_HOURS } from '@/collections/Customers'
import { sendVerificationLink } from '@/lib/accountEmails'
import { recordEmailIssue } from '@/lib/bookingEffects'
import { campMailbox, campSender } from '@/lib/campPayment'
import type { EmailLanguage } from '@/lib/email/language'
import { tokenLink } from '@/lib/email/links'
import { newAccountFromBookingEmail } from '@/lib/email/templates'
import type { Customer } from '@/payload-types'

/**
 * After a camp booking with "Załóż mi konto": the set-password link for a new
 * account, or a fresh confirmation link for one waiting. As on a course, but
 * the new-account email goes as camp mail — the camp sender, replies to the
 * camp mailbox (decided 25.10.2026): it follows a camp booking, beside the
 * other camp emails, and the school's test forwarding passes course mail
 * only. The confirmation link stays an account email, like every other.
 *
 * Here, not in the page's `actions.ts`: every export of a "use server" file
 * is an action anyone can call.
 */
export async function sendCampAccountEmails(
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
        const email = newAccountFromBookingEmail(language, {
          firstName: newAccount.firstName,
          url: tokenLink('/konto/ustaw-haslo', token),
          validHours: RESET_LINK_HOURS,
        })
        await payload.sendEmail({
          to: newAccount.email,
          from: campSender(),
          replyTo: campMailbox(),
          subject: email.subject,
          html: email.html,
          text: email.text,
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
