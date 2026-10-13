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

/**
 * Months a contact-form message is kept (decided 06.10.2026, stated in the
 * privacy policy). The conversation itself carries on by email, in the
 * school's mailbox; the copy in the panel only has to cover answering.
 */
export const MESSAGE_RETENTION_MONTHS = 12

/** Which messages the daily sweep deletes: sent more than the retention period ago. */
export function expiredMessagesWhere(now: Date, months = MESSAGE_RETENTION_MONTHS): Where {
  const cutoff = new Date(now)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  return { createdAt: { less_than: cutoff.toISOString() } }
}

/**
 * Years a booking is kept after the end of the year its course took place in
 * (privacy policy, decided 06.10.2026 — settlements and claims; to be
 * confirmed by Krzysiek). Then the daily sweep strips the personal data from
 * 1 January on (`anonymizeExpiredBookings`), so nobody has to remember.
 */
export const BOOKING_RETENTION_YEARS = 5

const HOUR_MS = 60 * 60 * 1000

/**
 * Which bookings the daily sweep anonymizes: those NOT on an account, not
 * anonymized yet, whose course ended before 1 January of (this year −
 * retention). A course of 2026
 * is kept through 2031 and goes on 1 January 2032.
 *
 * In Polish time, not UTC: dates are entered as Polish midnights, so a course
 * ending on 1 January is stored as 23:00 UTC of 31 December and would count
 * as the old year — gone a year early. January is always UTC+1 in Poland.
 * A date with no end counts by its start.
 */
export function expiredBookingsWhere(now: Date, years = BOOKING_RETENTION_YEARS): Where {
  const polishYear = new Date(now.getTime() + HOUR_MS).getUTCFullYear()
  const cutoff = new Date(Date.UTC(polishYear - years, 0, 1) - HOUR_MS).toISOString()
  return {
    and: [
      { anonymizedAt: { exists: false } },
      // On an account it is the person's own history ("Archiwum"), kept
      // while the account exists (decided 10.10.2026). Deleting the account
      // unlinks it, and from then on this rule applies.
      { customer: { exists: false } },
      {
        or: [
          { 'session.endDate': { less_than: cutoff } },
          {
            and: [
              { 'session.endDate': { exists: false } },
              { 'session.startDate': { less_than: cutoff } },
            ],
          },
        ],
      },
    ],
  }
}

/**
 * Which sessions the daily sweep marks "zakończony": still "open" or
 * "waitlist" after their last day (decided 12.10.2026 — in the panel a past
 * date kept saying "zapisy otwarte" until someone changed it by hand). The
 * site, the dashboard and "Moje konto" go by the dates anyway, so this only
 * keeps the panel's list honest. "odwołany" is the school's own word and
 * stays.
 *
 * The cutoff is the start of YESTERDAY in UTC: a last day may be stored as
 * UTC midnight (the date picker) or as Polish midnight, i.e. 22:00–23:00 UTC
 * the day before. Either way the session turns "finished" a day or two after
 * it ends — never on its last day, while people are still climbing. A date
 * with no end counts by its start.
 */
export function finishedSessionsWhere(now: Date): Where {
  const cutoff = new Date(now)
  cutoff.setUTCHours(0, 0, 0, 0)
  cutoff.setUTCDate(cutoff.getUTCDate() - 1)
  const before = cutoff.toISOString()
  return {
    and: [
      { status: { in: ['open', 'waitlist'] } },
      {
        or: [
          { endDate: { less_than: before } },
          {
            and: [{ endDate: { exists: false } }, { startDate: { less_than: before } }],
          },
        ],
      },
    ],
  }
}
