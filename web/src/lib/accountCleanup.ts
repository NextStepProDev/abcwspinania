import { getPayload } from 'payload'
import config from '@payload-config'

import { anonymizedLabel } from '@/lib/bookings'
import { sendWaitingDepositEmails } from '@/lib/bookingEffects'
import { preparePreCampDrafts } from '@/lib/campPreCampDrafts'
import {
  deleteExpiredRegistrations,
  sendDepositReminders,
  sendRegistrationReminders,
} from '@/lib/campRegistration'
import {
  expiredBookingsWhere,
  expiredMessagesWhere,
  finishedSessionsWhere,
  msUntilDailySweep,
  stalePendingNewsletterWhere,
  staleUnverifiedWhere,
} from '@/lib/expiry'

/** Deletes accounts nobody confirmed in time (`lib/expiry.ts`). */
export async function deleteStaleUnverifiedAccounts(): Promise<void> {
  const payload = await getPayload({ config })
  const { docs, errors } = await payload.delete({
    collection: 'customers',
    where: staleUnverifiedWhere(new Date()),
    overrideAccess: true,
  })
  if (docs.length) {
    payload.logger.info(`Deleted ${docs.length} participant account(s) left unconfirmed`)
  }
  // A bulk delete reports per-document failures here instead of throwing —
  // without this line they would pass without a trace.
  if (errors.length) {
    payload.logger.warn({ errors }, `Could not delete ${errors.length} unconfirmed account(s)`)
  }
}

/** Deletes newsletter sign-ups nobody confirmed in time (`lib/expiry.ts`). */
export async function deleteStalePendingNewsletter(): Promise<void> {
  const payload = await getPayload({ config })
  const { docs, errors } = await payload.delete({
    collection: 'newsletter',
    where: stalePendingNewsletterWhere(new Date()),
    overrideAccess: true,
  })
  if (docs.length) {
    payload.logger.info(`Deleted ${docs.length} newsletter sign-up(s) left unconfirmed`)
  }
  if (errors.length) {
    payload.logger.warn({ errors }, `Could not delete ${errors.length} unconfirmed sign-up(s)`)
  }
}

/**
 * Deletes contact-form messages past their retention (`lib/expiry.ts`) — the
 * period the privacy policy promises.
 */
export async function deleteExpiredMessages(): Promise<void> {
  const payload = await getPayload({ config })
  const { docs, errors } = await payload.delete({
    collection: 'messages',
    where: expiredMessagesWhere(new Date()),
    overrideAccess: true,
  })
  if (docs.length) payload.logger.info(`Deleted ${docs.length} contact message(s) past retention`)
  if (errors.length) {
    payload.logger.warn({ errors }, `Could not delete ${errors.length} expired message(s)`)
  }
}

/**
 * Strips the personal data from bookings past their retention (`lib/expiry.ts`:
 * five years from the end of the course's year) — from 1 January on, without
 * anyone remembering. What stays is a trace for statistics: the date, the
 * status, the language, when it was made. No name, address, phone, notes or
 * consent text, and on a camp booking no child's name, birth date, photo
 * consent or the parent's address — data that no longer points to a person is not personal data.
 *
 * Through the database adapter, row by row: the collection's own rules would
 * refuse empty required fields, and its hooks would rebuild the list label
 * from the name and recount places — and a recount of a date years past, left
 * "open" with a waiting list, could email the school about a "freed place".
 */
export async function anonymizeExpiredBookings(): Promise<void> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'bookings',
    where: expiredBookingsWhere(new Date()),
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const now = new Date().toISOString()
  for (const booking of docs) {
    await payload.db.updateOne({
      collection: 'bookings',
      id: booking.id,
      data: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        notes: null,
        adminNotes: null,
        consentText: '',
        childFirstName: null,
        childLastName: null,
        childBirthDate: null,
        photoConsent: false,
        photoConsentText: null,
        registrationToken: null,
        addressStreet: null,
        addressPostcode: null,
        addressCity: null,
        // A sole trader's NIP and name are a person's data too.
        invoiceCompanyName: null,
        invoiceNip: null,
        invoiceCompanyAddress: null,
        emailIssue: null,
        emailIssueAt: null,
        participant: null,
        label: anonymizedLabel(booking.label),
        anonymizedAt: now,
      },
    })
  }
  if (docs.length) payload.logger.info(`Anonymized ${docs.length} booking(s) past retention`)
}

/**
 * Marks past sessions "zakończony" (`lib/expiry.ts`) — the panel's list of
 * dates said "zapisy otwarte" for courses long over. Through the collection,
 * so the list label stays as it is built; `recountingSpots` keeps the
 * capacity hook from recounting (a finished session is left alone anyway).
 */
export async function finishPastSessions(): Promise<void> {
  const payload = await getPayload({ config })
  const { docs, errors } = await payload.update({
    collection: 'sessions',
    where: finishedSessionsWhere(new Date()),
    data: { status: 'finished' },
    depth: 0,
    // Only the count is used — no join with the bookings' personal data.
    select: { status: true },
    overrideAccess: true,
    context: { recountingSpots: true },
  })
  if (docs.length) payload.logger.info(`Marked ${docs.length} past session(s) as finished`)
  if (errors.length) {
    payload.logger.warn({ errors }, `Could not mark ${errors.length} past session(s) as finished`)
  }
}

/**
 * Every step of the daily sweep, each failing on its own — one broken step
 * (database hiccup, a bad row) must not stop the others. Resolves when all
 * are done, so `npm run sweep` can exit after it.
 */
export async function runDailySweep(): Promise<void> {
  const warn = (what: string) => (error: unknown) => {
    console.warn(`${what} failed, will retry tomorrow:`, error)
  }
  await Promise.all([
    deleteStaleUnverifiedAccounts().catch(warn('Unconfirmed-account cleanup')),
    deleteStalePendingNewsletter().catch(warn('Unconfirmed-newsletter cleanup')),
    deleteExpiredMessages().catch(warn('Contact-message cleanup')),
    anonymizeExpiredBookings().catch(warn('Booking anonymization')),
    finishPastSessions().catch(warn('Marking past sessions finished')),
    getPayload({ config })
      .then(async (payload) => {
        await deleteExpiredRegistrations(payload).catch(warn('Registration form cleanup'))
        await sendRegistrationReminders(payload).catch(warn('Registration reminders'))
        await sendDepositReminders(payload).catch(warn('Deposit reminders'))
        await sendWaitingDepositEmails(payload).catch(warn('Waiting deposit emails'))
        await preparePreCampDrafts(payload).catch(warn('Pre-camp drafts'))
      })
      .catch(warn('Camp registration sweep')),
  ])
}

/**
 * Runs the sweep every day at `DAILY_SWEEP_HOUR` Polish time (`lib/expiry.ts`,
 * decided 24.10.2026) — not at start-up: a deploy late in the evening would
 * send parents their reminders then. `npm run sweep` runs it at once, for
 * testing.
 *
 * Why not Payload's job queue: its cron starts only when something calls
 * `getPayload({ cron: true })` (a panel login, say), so after a restart the
 * sweep would wait for traffic; and it brings its own table, migration and
 * endpoints for one daily delete. A timer in the server process is enough
 * while the site runs as one container.
 *
 * The timer is `unref`'d so it never keeps a process alive on its own, and a
 * failure (database down) is a warning, not a crash — the next day tries
 * again. A server down at that hour skips one day; nothing is lost, every
 * step works from dates, not from "since the last run".
 */
export function scheduleAccountCleanup(): void {
  const next = () => {
    setTimeout(() => {
      void runDailySweep().finally(next)
    }, msUntilDailySweep(new Date())).unref()
  }
  next()
}
