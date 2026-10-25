import type { EmailLanguage } from '@/lib/email/language'
import { hasText, renderRichText, type RichTextValue } from '@/lib/email/richText'

/**
 * Broadcasts ("Wysyłki") — the pure part: who counts as a recipient, which
 * language version they get, what a failed send means. No Payload imports,
 * tested under `node --test`; the queries and the sending live in
 * `broadcastSender.ts`.
 */

export const BROADCAST_AUDIENCES = ['session', 'upcoming', 'newsletter'] as const
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number]

export const BROADCAST_AUDIENCE_OPTIONS = [
  { label: 'zapisani na jeden termin', value: 'session' },
  { label: 'wszyscy z nadchodzącymi zapisami', value: 'upcoming' },
  { label: 'newsletter (potwierdzone adresy)', value: 'newsletter' },
] satisfies { label: string; value: BroadcastAudience }[]

export const BROADCAST_STATUSES = ['draft', 'sending', 'sent'] as const
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number]

export const BROADCAST_STATUS_OPTIONS = [
  { label: 'szkic', value: 'draft' },
  { label: 'w trakcie wysyłki', value: 'sending' },
  { label: 'wysłana', value: 'sent' },
] satisfies { label: string; value: BroadcastStatus }[]

export const DELIVERY_STATUSES = ['pending', 'sent', 'failed', 'skipped'] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export const DELIVERY_STATUS_OPTIONS = [
  { label: 'czeka', value: 'pending' },
  { label: 'wysłany', value: 'sent' },
  { label: 'błąd', value: 'failed' },
  { label: 'pominięty (wypisał się)', value: 'skipped' },
] satisfies { label: string; value: DeliveryStatus }[]

export interface Recipient {
  email: string
  firstName?: string | null
  language: EmailLanguage
  /** Newsletter only: the subscription, for its unsubscribe link. */
  newsletterId?: number | null
}

/**
 * One email per address. Someone booked on two upcoming courses, or a couple
 * sharing an address, gets the message once. The FIRST entry wins — callers
 * pass recipients in the order whose data should be kept.
 */
export function dedupeRecipients(recipients: Recipient[]): Recipient[] {
  const seen = new Set<string>()
  const result: Recipient[] = []
  for (const recipient of recipients) {
    const email = recipient.email.trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    result.push({ ...recipient, email })
  }
  return result
}

export interface BroadcastContent {
  subject?: string | null
  content?: RichTextValue | null
  subjectEn?: string | null
  contentEn?: RichTextValue | null
}

/** The English version is used only when BOTH its subject and its text are written. */
export function hasEnglishVersion(broadcast: BroadcastContent): boolean {
  return Boolean(broadcast.subjectEn?.trim()) && hasText(broadcast.contentEn)
}

/** What a person with this language receives: English if written, otherwise Polish. */
export function versionFor(
  lang: EmailLanguage,
  broadcast: BroadcastContent,
): { lang: EmailLanguage; subject: string; content: RichTextValue | null | undefined } {
  if (lang === 'en' && hasEnglishVersion(broadcast)) {
    return { lang: 'en', subject: broadcast.subjectEn!.trim(), content: broadcast.contentEn }
  }
  return { lang: 'pl', subject: (broadcast.subject ?? '').trim(), content: broadcast.content }
}

/**
 * Fragments in square brackets still in a broadcast — "[miejsce zbiórki]",
 * "[godziny]": the blanks of the email before a camp (`campPreCamp.ts`), which
 * Krzysiek fills in by hand. "Wyślij" refuses while any is left (decided
 * 22.10.2026); a test send goes, so he can see the draft. The English version
 * counts only when it would be sent (`hasEnglishVersion`).
 */
export function unfilledPlaceholders(broadcast: BroadcastContent): string[] {
  const parts = [broadcast.subject ?? '', renderRichText(broadcast.content).text]
  if (hasEnglishVersion(broadcast)) {
    parts.push(broadcast.subjectEn ?? '', renderRichText(broadcast.contentEn).text)
  }
  const found = parts.join('\n').match(/\[[^[\]\n]{1,80}\]/g) ?? []
  return [...new Set(found)]
}

/**
 * What a failed send means for the queue:
 *  - `pause`  — nothing will go out right now, for ANYONE: the daily limit
 *    (free Brevo: 300), too many requests, or a refused API key. The
 *    recipients stay queued and the broadcast waits; marking them failed
 *    would throw away the rest of the list over one setting.
 *  - `recipient` — Brevo refused THIS address (malformed, blocked): failed
 *    for good, the rest carries on.
 *  - `retry` — the network or Brevo itself failed: this address is tried
 *    again later, up to `MAX_ATTEMPTS`.
 *
 * Reads the message our adapter throws (`Brevo refused the email: <status> <body>`).
 */
export type SendFailure = 'pause' | 'recipient' | 'retry'

export function classifySendError(error: unknown): SendFailure {
  const message = error instanceof Error ? error.message : String(error)
  const match = /Brevo refused the email: (\d{3})\b/.exec(message)
  if (!match) return 'retry' // timeout, DNS, connection reset
  const status = Number(match[1])
  if (status === 401 || status === 402 || status === 403 || status === 429) return 'pause'
  if (/credit|quota|limit/i.test(message)) return 'pause'
  if (status >= 500) return 'retry'
  return 'recipient'
}

/** Attempts per address before a transient failure counts as final. */
export const MAX_ATTEMPTS = 5
/** How long the whole broadcast waits after a `pause` failure. */
export const PAUSE_MINUTES = 60
/** How long one address waits after a `retry` failure. */
export const RETRY_MINUTES = 10

/**
 * A failed send in words the school reads in the panel — not Brevo's JSON.
 * Used for the booking emails that have no queue (`recordEmailIssue` in
 * `bookingEffects.ts`); the raw error goes to the server log.
 */
export function emailFailureReason(error: unknown): string {
  switch (classifySendError(error)) {
    case 'pause':
      return 'Brevo nie przyjmuje teraz maili (zwykle wyczerpany dzienny limit)'
    case 'recipient':
      return 'Brevo odrzucił ten adres — sprawdź, czy nie ma literówki'
    default:
      return 'brak połączenia z Brevo'
  }
}
