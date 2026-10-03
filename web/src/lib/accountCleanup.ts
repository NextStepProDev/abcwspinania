import { getPayload } from 'payload'
import config from '@payload-config'

import { stalePendingNewsletterWhere, staleUnverifiedWhere } from '@/lib/expiry'

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
  }
  setTimeout(run, 60_000).unref()
  setInterval(run, DAY_MS).unref()
}
