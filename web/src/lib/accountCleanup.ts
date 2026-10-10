import { getPayload } from 'payload'
import config from '@payload-config'

import { anonymizedLabel } from '@/lib/bookings'
import {
  expiredBookingsWhere,
  expiredMessagesWhere,
  stalePendingNewsletterWhere,
  staleUnverifiedWhere,
} from '@/lib/expiry'

const DAY_MS = 24 * 60 * 60 * 1000

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
 * consent text — data that no longer points to a person is not personal data.
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
        emailIssue: null,
        emailIssueAt: null,
        label: anonymizedLabel(booking.label),
        anonymizedAt: now,
      },
    })
  }
  if (docs.length) payload.logger.info(`Anonymized ${docs.length} booking(s) past retention`)
}

/**
 * Runs the sweep a minute after the server starts, then once a day.
 *
 * Why not Payload's job queue: its cron starts only when something calls
 * `getPayload({ cron: true })` (a panel login, say), so after a restart the
 * sweep would wait for traffic; and it brings its own table, migration and
 * endpoints for one daily delete. A timer in the server process is enough
 * while the site runs as one container.
 *
 * Timers are `unref`'d so they never keep a process alive on their own, and
 * a failure (database down) is a warning, not a crash — the next day tries
 * again.
 */
export function scheduleAccountCleanup(): void {
  const run = () => {
    deleteStaleUnverifiedAccounts().catch((error) => {
      console.warn('Unconfirmed-account cleanup failed, will retry tomorrow:', error)
    })
    deleteStalePendingNewsletter().catch((error) => {
      console.warn('Unconfirmed-newsletter cleanup failed, will retry tomorrow:', error)
    })
    deleteExpiredMessages().catch((error) => {
      console.warn('Contact-message cleanup failed, will retry tomorrow:', error)
    })
    anonymizeExpiredBookings().catch((error) => {
      console.warn('Booking anonymization failed, will retry tomorrow:', error)
    })
  }
  setTimeout(run, 60_000).unref()
  setInterval(run, DAY_MS).unref()
}
