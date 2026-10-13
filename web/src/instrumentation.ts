/**
 * Runs once when the Next.js server starts (`instrumentation.ts`, see
 * `node_modules/next/dist/docs/.../instrumentation.md`).
 *
 * Two timers: the daily cleanup and the broadcast queue (`broadcastSender.ts`).
 *
 * Only in the Node.js runtime — the cleanup talks to Postgres through
 * Payload, which the edge runtime cannot load; hence the dynamic import
 * behind the check, the pattern Next documents for runtime-specific code.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { scheduleAccountCleanup } = await import('@/lib/accountCleanup')
  scheduleAccountCleanup()
  const [{ getPayload }, { default: config }, { scheduleBroadcastWorker }] = await Promise.all([
    import('payload'),
    import('@payload-config'),
    import('@/lib/broadcastSender'),
  ])
  scheduleBroadcastWorker(() => getPayload({ config }))
}
