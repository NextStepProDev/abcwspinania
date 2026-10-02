import crypto from 'node:crypto'

import type { Payload } from 'payload'

import { RESET_LINK_HOURS, VERIFY_LINK_HOURS } from '@/collections/Customers'
import { publicUrl, tokenLink } from '@/lib/email/links'
import {
  accountExistsEmail,
  resetPasswordEmail,
  verifyAccountEmail,
  type Email,
} from '@/lib/email/templates'
import type { Customer } from '@/payload-types'

/**
 * The account emails — address confirmation, "set a new password" and "you
 * already have an account" — sent by US, not by Payload.
 *
 * Payload sends these as HTML only: it calls the adapter without a text part
 * (`auth/sendVerificationEmail.js`, `auth/operations/forgotPassword.js`).
 * The first real confirmation email landed in spam (02.10.2026), and an
 * HTML-only message is one of the things spam filters score down. Our
 * templates render both parts, so the server actions ask Payload for the
 * token only (`disableVerificationEmail`, `disableEmail`) and send here.
 *
 * Payload's own email hooks on the collection stay as the fallback for its
 * REST endpoints; the site does not use them.
 */

async function send(payload: Payload, to: string, email: Email) {
  await payload.sendEmail({ to, subject: email.subject, html: email.html, text: email.text })
}

/**
 * Issues a NEW confirmation token and emails it. Used at registration and
 * for "send the link again".
 *
 * Written straight through the database adapter: Payload's
 * `_verificationToken` field refuses every update by definition
 * (`auth/baseFields/verification.ts`, `update: () => false`), and its own
 * code only ever sets it on create. A fresh token also makes any earlier link
 * stop working — only the newest email confirms.
 */
export async function sendVerificationLink(payload: Payload, customer: Customer): Promise<void> {
  const token = crypto.randomBytes(20).toString('hex')
  await payload.db.updateOne({
    collection: 'customers',
    id: customer.id,
    data: { _verificationToken: token, verificationSentAt: new Date().toISOString() },
  })
  await send(
    payload,
    customer.email,
    verifyAccountEmail(customer.language, {
      firstName: customer.firstName,
      url: tokenLink('/konto/potwierdz', token),
      validHours: VERIFY_LINK_HOURS,
    }),
  )
}

/**
 * Starts a password reset and emails the link. Silent for an address without
 * an account — Payload returns no token, and nothing is sent or said.
 */
export async function sendPasswordLink(payload: Payload, email: string): Promise<void> {
  const token = await payload.forgotPassword({
    collection: 'customers',
    data: { email },
    disableEmail: true,
  })
  if (!token) return
  const { docs } = await payload.find({
    collection: 'customers',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const customer = docs[0]
  if (!customer) return
  await send(
    payload,
    customer.email,
    resetPasswordEmail(customer.language, {
      firstName: customer.firstName,
      url: tokenLink('/konto/ustaw-haslo', token),
      validHours: RESET_LINK_HOURS,
    }),
  )
}

/**
 * Someone registered with an address that already has a CONFIRMED account.
 * The page answered "check your inbox" as always; this tells the owner what
 * happened — log in, or set a new password if it is forgotten. The reset link
 * inside is a real one (2 hours, single use), so a forgotten password costs
 * no second email.
 */
export async function sendAccountExistsEmail(payload: Payload, customer: Customer): Promise<void> {
  const token = await payload.forgotPassword({
    collection: 'customers',
    data: { email: customer.email },
    disableEmail: true,
  })
  if (!token) return
  await send(
    payload,
    customer.email,
    accountExistsEmail(customer.language, {
      firstName: customer.firstName,
      loginUrl: `${publicUrl()}/logowanie`,
      resetUrl: tokenLink('/konto/ustaw-haslo', token),
      validHours: RESET_LINK_HOURS,
    }),
  )
}
