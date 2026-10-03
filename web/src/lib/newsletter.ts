import crypto from 'node:crypto'

import type { Payload, PayloadHandler } from 'payload'

import type { EmailLanguage } from '@/lib/email/language'
import { publicUrl, tokenLink } from '@/lib/email/links'
import { newsletterConfirmEmail } from '@/lib/email/templates'
import { newsletterConsentForStorage } from '@/lib/consent'
import type { Newsletter } from '@/payload-types'

/**
 * Newsletter sign-up with double opt-in, confirmation and unsubscribing.
 *
 * Every lookup here reads the collection with `overrideAccess: true` — the
 * visitor is anonymous and the collection is the school's only. Each one
 * touches exactly the row matching an address the visitor just typed or a
 * token they hold, and none of the answers differ by what was found, so
 * nothing here tells anyone who is on the list.
 */

/** No second confirmation email to the same address within this time. */
export const CONFIRMATION_RESEND_MINUTES = 10

export function newToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function confirmUrl(token: string): string {
  return tokenLink('/newsletter/potwierdz', token)
}

export function unsubscribeUrl(token: string): string {
  return tokenLink('/newsletter/wypisz', token)
}

/** Where the `List-Unsubscribe-Post` button POSTs (the collection's endpoint). */
export function oneClickUnsubscribeUrl(token: string): string {
  return `${publicUrl()}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
}

async function findByEmail(payload: Payload, email: string): Promise<Newsletter | null> {
  const { docs } = await payload.find({
    collection: 'newsletter',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

export async function findByToken(payload: Payload, token: string): Promise<Newsletter | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null
  const { docs } = await payload.find({
    collection: 'newsletter',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

async function sendConfirmation(
  payload: Payload,
  email: string,
  token: string,
  lang: EmailLanguage,
) {
  const message = newsletterConfirmEmail(lang, { url: confirmUrl(token) })
  await payload.sendEmail({
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  })
}

/**
 * The footer form. Every outcome looks the same to the visitor ("check your
 * inbox"); what differs is only whether an email goes out:
 *  - new address, or one that unsubscribed earlier → `pending`, fresh token,
 *    confirmation email (coming back needs a new confirmation, too);
 *  - already `pending` → the same token again, unless one went out within
 *    `CONFIRMATION_RESEND_MINUTES` (a form clicked ten times is one email);
 *  - already `subscribed` → nothing at all.
 *
 * The consent is stored at sign-up, as before; confirming proves the
 * address is the consenting person's.
 */
export async function subscribe(
  payload: Payload,
  email: string,
  lang: EmailLanguage,
): Promise<void> {
  const existing = await findByEmail(payload, email)
  if (existing?.status === 'subscribed') return

  let id: number
  let token: string
  if (existing?.status === 'pending' && existing.token) {
    const sent = existing.confirmationSentAt ? Date.parse(existing.confirmationSentAt) : NaN
    if (Date.now() - sent < CONFIRMATION_RESEND_MINUTES * 60_000) return
    id = existing.id
    token = existing.token
    await payload.update({
      collection: 'newsletter',
      id,
      data: { language: lang },
      overrideAccess: true,
    })
  } else {
    token = newToken()
    const data = {
      status: 'pending' as const,
      token,
      language: lang,
      consentText: newsletterConsentForStorage(),
      consentDate: new Date().toISOString(),
      confirmationSentAt: null,
    }
    const saved = existing
      ? await payload.update({
          collection: 'newsletter',
          id: existing.id,
          data,
          overrideAccess: true,
        })
      : await payload.create({
          collection: 'newsletter',
          data: { email, ...data },
          overrideAccess: true,
        })
    id = saved.id
  }

  // Marked as sent only AFTER the email went out: a failed send (Brevo down)
  // shows the visitor an error, and their retry must not be swallowed by the
  // resend pause above.
  await sendConfirmation(payload, email, token, lang)
  await payload.update({
    collection: 'newsletter',
    id,
    data: { confirmationSentAt: new Date().toISOString() },
    overrideAccess: true,
  })
}

export type ConfirmOutcome = 'confirmed' | 'invalid'

/** The button on `/newsletter/potwierdz`. Confirming twice is still "confirmed". */
export async function confirmSubscription(
  payload: Payload,
  token: string,
): Promise<ConfirmOutcome> {
  const entry = await findByToken(payload, token)
  if (!entry || entry.status === 'unsubscribed') return 'invalid'
  if (entry.status === 'subscribed') return 'confirmed'
  await payload.update({
    collection: 'newsletter',
    id: entry.id,
    data: { status: 'subscribed', confirmedAt: new Date().toISOString() },
    overrideAccess: true,
  })
  return 'confirmed'
}

/**
 * The button on `/newsletter/wypisz` and the one-click endpoint. The row
 * stays, marked `unsubscribed` — the collection keeps proof of when consent
 * was withdrawn (see the field description). Unsubscribing twice, or with a
 * `pending` address, is fine.
 */
export async function unsubscribeByToken(payload: Payload, token: string): Promise<boolean> {
  const entry = await findByToken(payload, token)
  if (!entry) return false
  if (entry.status !== 'unsubscribed') {
    await payload.update({
      collection: 'newsletter',
      id: entry.id,
      data: { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() },
      overrideAccess: true,
    })
  }
  return true
}

/**
 * `POST /api/newsletter/unsubscribe?token=…` — the mail client's own
 * "Unsubscribe" button (RFC 8058). Answers 200 whatever the token: the
 * client shows nothing anyway, and a different answer would only confirm
 * which tokens exist.
 */
export const unsubscribeHandler: PayloadHandler = async (req) => {
  const token = req.searchParams.get('token') ?? ''
  try {
    await unsubscribeByToken(req.payload, token)
  } catch (error) {
    req.payload.logger.error({ err: error }, 'One-click newsletter unsubscribe failed')
  }
  return Response.json({ ok: true })
}

/**
 * The token of a subscribed address, drawn on first need. Addresses that
 * signed up before double opt-in (03.10.2026) have none — the first
 * newsletter they receive gives them one.
 */
export async function ensureToken(payload: Payload, entry: Newsletter): Promise<string> {
  if (entry.token) return entry.token
  const token = newToken()
  await payload.update({
    collection: 'newsletter',
    id: entry.id,
    data: { token },
    overrideAccess: true,
  })
  return token
}
