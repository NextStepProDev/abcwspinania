/**
 * The daily sweep, now — instead of waiting for 8:00 (`scheduleAccountCleanup`).
 *
 *   npm run sweep
 *
 * Sends what the sweep sends: registration and deposit reminders to parents,
 * the pre-camp notice to the school — with a real Brevo key, real emails.
 * For testing (`docs/testy-obozy.html`, P4); locally, against the dev database.
 */
import { runDailySweep } from '@/lib/accountCleanup'

await runDailySweep()
console.log('Daily sweep done.')
process.exit(0)
