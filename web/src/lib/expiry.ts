import type { Where } from 'payload'

/**
 * Whether something issued at `issuedAt` is older than `hours` at `now`.
 *
 * An unreadable date counts as EXPIRED: a link whose age cannot be told must
 * not end up valid forever by accident. Pure, so it is tested without a clock.
 */
export function isExpired(issuedAt: string | null | undefined, hours: number, now: Date): boolean {
  const issued = issuedAt ? Date.parse(issuedAt) : NaN
  if (Number.isNaN(issued)) return true
  return now.getTime() - issued >= hours * 60 * 60 * 1000
}

/**
 * Days an account may wait unconfirmed before it is deleted (decided
 * 02.10.2026). Long enough for a few "send the link again" — each link works
 * 48 hours — short enough not to keep the personal data of someone who never
 * came back, or whose address someone else typed into the form.
 */
export const UNVERIFIED_ACCOUNT_DAYS = 7

/**
 * Which accounts the daily sweep deletes: unconfirmed, created more than the
 * grace period ago, AND with no confirmation link sent within it. Counting
 * from the LATEST link, not from registration: someone who asks for a new
 * link on day six must not lose the account while that link still works.
 */
export function staleUnverifiedWhere(now: Date, days = UNVERIFIED_ACCOUNT_DAYS): Where {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  return {
    and: [
      { _verified: { not_equals: true } },
      { createdAt: { less_than: cutoff } },
      {
        or: [
          { verificationSentAt: { less_than: cutoff } },
          { verificationSentAt: { exists: false } },
        ],
      },
    ],
  }
}

/**
 * Days a newsletter sign-up may wait for its confirmation click before it is
 * deleted — the same week as an unconfirmed account. An address someone else
 * typed in must not stay in our database.
 */
export const PENDING_NEWSLETTER_DAYS = 7

/**
 * Which newsletter rows the daily sweep deletes: still `pending`, signed up
 * (`consentDate`, renewed on every sign-up) and last emailed before the
 * cutoff. A row that once unsubscribed and signed up again without
 * confirming goes too — keeping it would keep the address of someone who
 * never finished saying yes.
 */
export function stalePendingNewsletterWhere(now: Date, days = PENDING_NEWSLETTER_DAYS): Where {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  return {
    and: [
      { status: { equals: 'pending' } },
      { consentDate: { less_than: cutoff } },
      {
        or: [
          { confirmationSentAt: { less_than: cutoff } },
          { confirmationSentAt: { exists: false } },
        ],
      },
    ],
  }
}
