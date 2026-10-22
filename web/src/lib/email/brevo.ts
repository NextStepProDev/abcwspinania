import type { PayloadEmailAdapter, SendEmailOptions } from 'payload'

/**
 * Payload email adapter talking to Brevo's HTTP API.
 *
 * Why our own and not `@payloadcms/email-nodemailer` over Brevo's SMTP:
 * measured 01.10.2026, the official adapter pulls `nodemailer` 9.1.1, which
 * carries two `high` advisories (quadratic backtracking in its address parser).
 * Our CI gate (`npm audit --audit-level=high`) would stop every PR, and the fix
 * lives in nodemailer 10 — a major the adapter does not accept. An HTTP call is
 * all Brevo needs, so this file costs no dependency at all.
 *
 * Revisit when `@payloadcms/email-nodemailer` moves to nodemailer ≥ 10.0.6:
 * then swapping providers would be configuration, not code. Until then moving
 * off Brevo means writing a sibling of this file for the new provider's API.
 *
 * `toBrevoBody` is a pure function, tested under `node --test`; the adapter
 * around it is the only part that touches the network.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

interface BrevoAddress {
  email: string
  name?: string
  /** Only meaningful on recipients (`to`, `cc`, `bcc`) — see `untracked`. */
  contactPixelTrackingConsent?: boolean
}

interface BrevoBody {
  sender: BrevoAddress
  to: BrevoAddress[]
  cc?: BrevoAddress[]
  bcc?: BrevoAddress[]
  replyTo?: BrevoAddress
  subject: string
  htmlContent?: string
  textContent?: string
  headers?: Record<string, string>
  /** Brevo's shape: the file's name and its bytes in base64. */
  attachment?: { name: string; content: string }[]
}

// Spelled out rather than taken from `SendEmailOptions`: Payload derives that
// type from nodemailer's, and with nodemailer not installed it collapses to
// `any` — which would let anything through unchecked.
type AddressLike = string | { address: string; name?: string }
type AddressInput = AddressLike | AddressLike[] | null | undefined

/** `"Name <a@b.pl>"`, `"a@b.pl"`, `{ name, address }` or a list of any of these. */
export function toBrevoAddresses(input: AddressInput): BrevoAddress[] {
  if (!input) return []
  const list = Array.isArray(input) ? input : [input]
  return list.flatMap((item): BrevoAddress[] => {
    if (typeof item === 'string') {
      // A comma-separated string is a list too — nodemailer accepts it, so
      // Payload code written for nodemailer may pass one.
      // Split on commas OUTSIDE quotes — `"Nowak, Anna" <a@x.pl>` is one address.
      return (item.match(/(?:"[^"]*"|[^,])+/g) ?? [])
        .map((part) => part.trim())
        .filter(Boolean)
        .map(parseAddress)
    }
    return [item.name ? { email: item.address, name: item.name } : { email: item.address }]
  })
}

function parseAddress(value: string): BrevoAddress {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value)
  if (!match) return { email: value.trim() }
  const name = match[1].trim()
  return name ? { email: match[2].trim(), name } : { email: match[2].trim() }
}

/**
 * Marks a recipient as NOT consenting to open and click tracking.
 *
 * We cannot switch Brevo's tracking off for transactional email: every message gets
 * an open pixel and every link is rewritten through its redirect server
 * (checked 01.10.2026 on a real send). The API reference has no switch for
 * that; Brevo's community answers say it is possible only on request or on the
 * Enterprise plan (not verified with Brevo). What the API does offer is this flag:
 * with `false` the open and click events are anonymised — counted only in
 * aggregate, never tied to the person. Decided 01.10.2026 to accept that and
 * say so in the privacy policy. Paired with "Anonymous email tracking" in the
 * Brevo account settings, which does the same account-wide.
 *
 * Set by us on every recipient rather than relying on the account toggle
 * alone: a new Brevo account (e.g. moving to the school's own) starts with the
 * toggle off, and nobody would notice from the site that it was.
 */
function untracked(recipients: BrevoAddress[]): BrevoAddress[] {
  return recipients.map((r) => ({ ...r, contactPixelTrackingConsent: false }))
}

export interface Sender {
  email: string
  name: string
}

/**
 * Brevo adds a `List-Unsubscribe` header of its OWN to every email that has
 * none — transactional ones included, with no setting to turn it off outside
 * the Enterprise plan. Gmail shows it as "Anuluj subskrypcję", and one click
 * puts the address on Brevo's unsubscribe list: from then on Brevo accepts
 * our emails to that address and silently does not deliver them — a booking's
 * bank details, a status change, a new password. Found 21.10.2026 in the raw
 * headers of a test email; a header we set ourselves replaces Brevo's
 * (checked the same day).
 *
 * So every email without its own (the newsletter sets one — a real
 * unsubscribe) gets `serviceUnsubscribeUrl`: our page, which explains that
 * these are emails about a booking or an account and unsubscribes nobody.
 * Brevo still adds `List-Unsubscribe-Post` (one-click), so the URL also
 * accepts Gmail's POST.
 */
function withServiceUnsubscribe(
  headers: Record<string, string>,
  serviceUnsubscribeUrl: string | undefined,
): Record<string, string> {
  if (!serviceUnsubscribeUrl) return headers
  if (Object.keys(headers).some((h) => h.toLowerCase() === 'list-unsubscribe')) return headers
  return { ...headers, 'List-Unsubscribe': `<${serviceUnsubscribeUrl}>` }
}

/**
 * Nodemailer-style attachments (`{ filename, content }`, the content bytes or
 * a string) as Brevo takes them — base64. Today only the camp contract (PDF)
 * goes this way. An attachment without a name or content would be a refused
 * send at Brevo, so it is dropped here instead.
 */
function toBrevoAttachments(input: unknown): { name: string; content: string }[] {
  if (!Array.isArray(input)) return []
  return input.flatMap((item: { filename?: unknown; content?: unknown }) => {
    const name = typeof item?.filename === 'string' ? item.filename : ''
    const content = item?.content
    const bytes =
      content instanceof Uint8Array
        ? Buffer.from(content)
        : typeof content === 'string'
          ? Buffer.from(content)
          : null
    return name && bytes ? [{ name, content: bytes.toString('base64') }] : []
  })
}

export function toBrevoBody(
  message: SendEmailOptions,
  sender: Sender,
  serviceUnsubscribeUrl?: string,
): BrevoBody {
  const to = untracked(toBrevoAddresses(message.to as AddressInput))
  if (to.length === 0) throw new Error('Email without a recipient')

  const from = toBrevoAddresses(message.from as AddressInput)[0]
  const replyTo = toBrevoAddresses(message.replyTo as AddressInput)[0]
  const cc = untracked(toBrevoAddresses(message.cc as AddressInput))
  const bcc = untracked(toBrevoAddresses(message.bcc as AddressInput))

  const body: BrevoBody = {
    // Brevo sends only from an address on a domain authenticated in the
    // account. Payload code may set `from` (e.g. its own auth emails do, from
    // the defaults below), but anything else would be rejected — so the
    // configured sender always wins the address, and only its display name
    // can be overridden.
    sender: { email: sender.email, name: from?.name ?? sender.name },
    to,
    subject: String(message.subject ?? ''),
  }
  if (cc.length) body.cc = cc
  if (bcc.length) body.bcc = bcc
  if (replyTo) body.replyTo = replyTo
  if (typeof message.html === 'string') body.htmlContent = message.html
  if (typeof message.text === 'string') body.textContent = message.text
  // Plain string headers only (`List-Unsubscribe` on newsletters). Nodemailer
  // also accepts arrays and objects here; nothing in this project sends them,
  // and passing them on unchecked would be a refused send at Brevo.
  const headers = Object.entries((message.headers ?? {}) as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  )
  const all = withServiceUnsubscribe(Object.fromEntries(headers), serviceUnsubscribeUrl)
  if (Object.keys(all).length) body.headers = all
  const attachments = toBrevoAttachments(message.attachments)
  if (attachments.length) body.attachment = attachments
  return body
}

export function brevoAdapter({
  apiKey,
  sender,
  serviceUnsubscribeUrl,
}: {
  apiKey: string
  sender: Sender
  /** See `withServiceUnsubscribe`. */
  serviceUnsubscribeUrl?: string
}): PayloadEmailAdapter {
  return () => ({
    name: 'brevo',
    defaultFromAddress: sender.email,
    defaultFromName: sender.name,
    sendEmail: async (message) => {
      const response = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(toBrevoBody(message, sender, serviceUnsubscribeUrl)),
        // A hung request must not hold up a form submission indefinitely.
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) {
        // Brevo explains the refusal in the body (unverified sender, invalid
        // key, daily limit reached) — without it the log says only "400".
        const detail = await response.text().catch(() => '')
        throw new Error(`Brevo refused the email: ${response.status} ${detail}`)
      }
      return response.json()
    },
  })
}
