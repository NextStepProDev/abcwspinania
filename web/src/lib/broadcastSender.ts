import {
  APIError,
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadHandler,
  type PayloadRequest,
  type Where,
} from 'payload'
import { sql } from '@payloadcms/db-postgres'

import { isAdmin } from '@/lib/access'
import { ACTIVE_STATUSES } from '@/lib/bookings'
import { sessionSummary } from '@/lib/bookingEffects'
import { txOf } from '@/lib/bookingService'
import {
  MAX_ATTEMPTS,
  PAUSE_MINUTES,
  RETRY_MINUTES,
  classifySendError,
  dedupeRecipients,
  hasEnglishVersion,
  versionFor,
  type Recipient,
} from '@/lib/broadcasts'
import type { EmailLanguage } from '@/lib/email/language'
import { renderRichText } from '@/lib/email/richText'
import { broadcastEmail, type BroadcastReason } from '@/lib/email/templates'
import { ensureToken, oneClickUnsubscribeUrl, unsubscribeUrl } from '@/lib/newsletter'
import type { Broadcast, BroadcastDelivery } from '@/payload-types'

/**
 * Broadcasts — who gets one, putting it in the queue, and the queue itself.
 *
 * HOW A BROADCAST GOES OUT
 *  1. "Wyślij" (`sendHandler`) takes the recipient list ONCE, in a locked
 *     transaction, and stores one `broadcast-deliveries` row per address.
 *     From then on the list is fixed: someone booking a minute later does not
 *     get a message written before they booked, and a double click cannot
 *     queue the list twice (the lock, then the status check under it).
 *  2. A timer in the server process (`scheduleBroadcastWorker`, started from
 *     `instrumentation.ts`) sends the queued rows in small batches, one email
 *     per address. Each row is marked sent the moment Brevo accepts it.
 *  3. Failures follow `classifySendError` (`broadcasts.ts`): the daily limit
 *     pauses the whole broadcast for an hour and it resumes on its own; a
 *     refused address fails alone; a network error is retried later.
 *
 * Accepted risk: a crash between Brevo accepting an email and the row being
 * marked sent sends that ONE email again after the restart. Not the other
 * way round — nothing is ever marked sent before it was.
 *
 * Why a timer and not Payload's job queue: the same reasons as the account
 * cleanup (`accountCleanup.ts`) — its cron waits for traffic after a restart
 * and brings tables of its own. One container, one worker; a process-wide
 * flag keeps two ticks from overlapping.
 */

const LOCK_BROADCAST = 7303
/** One queue tick at a time, across processes (`processBroadcasts`). */
const LOCK_QUEUE = 7304
/** Emails per tick — with the tick below, about 60 a minute. */
const BATCH = 20
const TICK_MS = 20_000

type Req = Partial<PayloadRequest>

function startOfTodayUtc(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function idOf(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return (value as { id: number }).id
  return null
}

// --- who gets it -----------------------------------------------------------

/**
 * The recipients of a broadcast as it is saved now. Bookings carry the
 * language stored at booking; an account's own setting wins, since its owner
 * may have changed it since.
 */
export async function recipientsOf(
  payload: Payload,
  broadcast: Pick<Broadcast, 'audience' | 'session' | 'includeWaitlist'>,
  req?: Req,
): Promise<Recipient[]> {
  if (broadcast.audience === 'newsletter') {
    const { docs } = await payload.find({
      collection: 'newsletter',
      where: { status: { equals: 'subscribed' } },
      sort: 'createdAt',
      pagination: false,
      depth: 0,
      req,
      overrideAccess: true,
    })
    return dedupeRecipients(
      docs.map((d) => ({ email: d.email, language: d.language ?? 'pl', newsletterId: d.id })),
    )
  }

  const statuses: string[] = [...ACTIVE_STATUSES]
  if (broadcast.includeWaitlist) statuses.push('waitlist')
  const where: Where =
    broadcast.audience === 'session'
      ? {
          and: [
            { session: { equals: idOf(broadcast.session) ?? -1 } },
            { status: { in: statuses } },
          ],
        }
      : {
          and: [
            { status: { in: statuses } },
            { 'session.startDate': { greater_than_equal: startOfTodayUtc() } },
            { 'session.status': { in: ['open', 'waitlist'] } },
          ],
        }
  const { docs } = await payload.find({
    collection: 'bookings',
    where,
    sort: 'createdAt',
    pagination: false,
    depth: 1,
    // Only what is read: the account's language. A fully populated session
    // would bring its `bookings` join — every participant — along for nothing.
    populate: { customers: { language: true }, sessions: { status: true } },
    req,
    overrideAccess: true,
  })
  return dedupeRecipients(
    docs.map((b) => {
      const account = typeof b.customer === 'object' ? b.customer : null
      return {
        email: b.email,
        firstName: b.firstName,
        language: account?.language ?? b.language ?? 'pl',
      }
    }),
  )
}

/** "Kurs X, 12–14 maja" for the note under a one-session broadcast. */
async function sessionLabel(
  payload: Payload,
  broadcast: Pick<Broadcast, 'session'>,
  lang: EmailLanguage,
): Promise<string> {
  const id = idOf(broadcast.session)
  const summary = id ? await sessionSummary(payload, id, lang).catch(() => null) : null
  return summary ? `${summary.courseTitle}, ${summary.dates}` : ''
}

async function reasonFor(
  payload: Payload,
  broadcast: Broadcast,
  lang: EmailLanguage,
  token: string | null,
): Promise<BroadcastReason> {
  if (broadcast.audience === 'newsletter') {
    return { kind: 'newsletter', unsubscribeUrl: unsubscribeUrl(token ?? 'test') }
  }
  if (broadcast.audience === 'session') {
    const label = await sessionLabel(payload, broadcast, lang)
    // The session deleted after "Wyślij": the general note, not "booked on: ."
    if (label) return { kind: 'session', label }
  }
  return { kind: 'upcoming' }
}

async function sendOne(
  payload: Payload,
  broadcast: Broadcast,
  to: { email: string; language: EmailLanguage },
  token: string | null,
  subjectPrefix = '',
): Promise<void> {
  const version = versionFor(to.language, broadcast)
  const email = broadcastEmail(version.lang, {
    subject: subjectPrefix + version.subject,
    body: renderRichText(version.content),
    reason: await reasonFor(payload, broadcast, version.lang, token),
  })
  await payload.sendEmail({
    to: to.email,
    replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // The mail client's own "Unsubscribe" button (RFC 8058) — newsletters only;
    // a message about a course someone is booked on is not marketing.
    headers: token
      ? {
          'List-Unsubscribe': `<${oneClickUnsubscribeUrl(token)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
      : undefined,
  })
}

// --- panel endpoints -----------------------------------------------------------

function forbidden(): Response {
  return Response.json({ error: 'Tylko dla konta szkoły.' }, { status: 403 })
}

/**
 * Without a Brevo key Payload "sends" by printing to the log — fine locally,
 * but on the server a broadcast would report every email as sent while
 * nobody got one. There the buttons refuse instead.
 */
function emailMissing(): Response | null {
  if (process.env.NODE_ENV !== 'production' || process.env.BREVO_API_KEY) return null
  return Response.json(
    { error: 'Maile nie są skonfigurowane na serwerze (brak klucza Brevo) — nic nie wysłano.' },
    { status: 503 },
  )
}

async function loadBroadcast(req: PayloadRequest): Promise<Broadcast | null> {
  const id = Number(req.routeParams?.id)
  if (!Number.isInteger(id)) return null
  return req.payload
    .findByID({ collection: 'broadcasts', id, depth: 0, joins: false, overrideAccess: true })
    .catch(() => null)
}

async function countDeliveries(payload: Payload, broadcastId: number, status?: string) {
  const where: Where = status
    ? { and: [{ broadcast: { equals: broadcastId } }, { status: { equals: status } }] }
    : { broadcast: { equals: broadcastId } }
  return (await payload.count({ collection: 'broadcast-deliveries', where, overrideAccess: true }))
    .totalDocs
}

/**
 * GET /api/broadcasts/:id/summary — what the panel shows next to the
 * buttons. For a draft: who WOULD get it now; once sent: the queue's state.
 */
export const summaryHandler: PayloadHandler = async (req) => {
  if (!isAdmin({ req })) return forbidden()
  const broadcast = await loadBroadcast(req)
  if (!broadcast) return Response.json({ error: 'Nie ma takiej wysyłki.' }, { status: 404 })

  if (broadcast.status === 'draft') {
    const recipients = await recipientsOf(req.payload, broadcast)
    return Response.json({
      status: broadcast.status,
      recipients: recipients.length,
      english: recipients.filter((r) => r.language === 'en').length,
      hasEnglish: hasEnglishVersion(broadcast),
    })
  }
  const [sent, failed, skipped, pending] = await Promise.all(
    ['sent', 'failed', 'skipped', 'pending'].map((s) =>
      countDeliveries(req.payload, broadcast.id, s),
    ),
  )
  return Response.json({
    status: broadcast.status,
    recipients: broadcast.recipientsCount ?? sent + failed + skipped + pending,
    sent,
    failed,
    skipped,
    pending,
    pausedUntil: broadcast.pausedUntil ?? null,
    paused: Boolean(broadcast.pausedUntil && Date.parse(broadcast.pausedUntil) > Date.now()),
  })
}

/**
 * POST /api/broadcasts/:id/test — the saved version, to the logged-in school
 * account's own address: Polish, plus English when written. Marked in the
 * subject so a test never passes for the real thing.
 */
export const testHandler: PayloadHandler = async (req) => {
  if (!isAdmin({ req }) || !req.user) return forbidden()
  const missing = emailMissing()
  if (missing) return missing
  const broadcast = await loadBroadcast(req)
  if (!broadcast) return Response.json({ error: 'Nie ma takiej wysyłki.' }, { status: 404 })
  const languages: EmailLanguage[] = hasEnglishVersion(broadcast) ? ['pl', 'en'] : ['pl']
  try {
    for (const language of languages) {
      await sendOne(req.payload, broadcast, { email: req.user.email, language }, null, '[PRÓBA] ')
    }
  } catch (error) {
    req.payload.logger.error({ err: error }, 'Broadcast test send failed')
    return Response.json(
      { error: 'Brevo nie przyjął maila próbnego — szczegóły w logu serwera.' },
      { status: 502 },
    )
  }
  return Response.json({ sentTo: req.user.email, languages })
}

/**
 * POST /api/broadcasts/:id/send — takes the recipient list and queues it.
 * Only a draft can be sent; the check runs under a lock on this broadcast,
 * so two clicks (or two tabs) queue it once.
 */
export const sendHandler: PayloadHandler = async (req) => {
  if (!isAdmin({ req })) return forbidden()
  const missing = emailMissing()
  if (missing) return missing
  const id = Number(req.routeParams?.id)
  if (!Number.isInteger(id))
    return Response.json({ error: 'Nie ma takiej wysyłki.' }, { status: 404 })

  const payload = req.payload
  const txReq = await createLocalReq({}, payload)
  await initTransaction(txReq)
  let queued = 0
  try {
    const tx = await txOf(payload, txReq)
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${LOCK_BROADCAST}, ${id})`)
    const broadcast = await payload.findByID({
      collection: 'broadcasts',
      id,
      depth: 0,
      joins: false,
      req: txReq,
      overrideAccess: true,
      disableErrors: true,
    })
    if (!broadcast) {
      await commitTransaction(txReq)
      return Response.json({ error: 'Nie ma takiej wysyłki.' }, { status: 404 })
    }
    if (broadcast.status !== 'draft') {
      await commitTransaction(txReq)
      return Response.json({ error: 'Ta wiadomość jest już wysłana.' }, { status: 409 })
    }
    const recipients = await recipientsOf(payload, broadcast, txReq)
    if (recipients.length === 0) {
      await commitTransaction(txReq)
      return Response.json(
        { error: 'Nie ma do kogo wysłać — lista odbiorców jest pusta.' },
        { status: 400 },
      )
    }
    for (const r of recipients) {
      await payload.create({
        collection: 'broadcast-deliveries',
        data: {
          broadcast: id,
          email: r.email,
          language: r.language,
          newsletter: r.newsletterId ?? undefined,
          status: 'pending',
        },
        req: txReq,
        overrideAccess: true,
      })
    }
    await payload.update({
      collection: 'broadcasts',
      id,
      data: {
        status: 'sending',
        recipientsCount: recipients.length,
        startedAt: new Date().toISOString(),
      },
      context: { broadcastQueue: true },
      req: txReq,
      overrideAccess: true,
    })
    await commitTransaction(txReq)
    queued = recipients.length
  } catch (error) {
    await killTransaction(txReq)
    payload.logger.error({ err: error }, 'Queueing a broadcast failed')
    return Response.json({ error: 'Nie udało się zakolejkować wysyłki.' }, { status: 500 })
  }
  // Start right away rather than at the next tick.
  void processBroadcasts(payload)
  return Response.json({ queued })
}

// --- the queue ----------------------------------------------------------------

/**
 * "A tick is running" — on `globalThis`, not in a module variable: the timer
 * (started from `instrumentation.ts`) and the kick after "Wyślij" (an API
 * route) are bundled separately by Next, each with its own copy of this
 * module. Two copies of a plain flag would let a tick and a kick take the
 * same rows at the same moment and send them twice. One process, one flag.
 */
const queue = globalThis as typeof globalThis & { __broadcastQueueRunning?: boolean }

async function sendDelivery(
  payload: Payload,
  broadcast: Broadcast,
  delivery: BroadcastDelivery,
): Promise<'ok' | 'pause'> {
  const done = (data: Partial<BroadcastDelivery>) =>
    payload.update({
      collection: 'broadcast-deliveries',
      id: delivery.id,
      data,
      overrideAccess: true,
    })

  // A newsletter address unsubscribed between "Wyślij" and its turn: skip it.
  let token: string | null = null
  if (broadcast.audience === 'newsletter') {
    const entryId = idOf(delivery.newsletter)
    const entry = entryId
      ? await payload
          .findByID({ collection: 'newsletter', id: entryId, depth: 0, overrideAccess: true })
          .catch(() => null)
      : null
    if (!entry || entry.status !== 'subscribed') {
      await done({ status: 'skipped', error: 'Wypisany przed wysyłką.' })
      return 'ok'
    }
    token = await ensureToken(payload, entry)
  }

  try {
    await sendOne(
      payload,
      broadcast,
      { email: delivery.email, language: delivery.language ?? 'pl' },
      token,
    )
    await done({ status: 'sent', sentAt: new Date().toISOString(), error: null })
    return 'ok'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const kind = classifySendError(error)
    if (kind === 'pause') {
      await payload.update({
        collection: 'broadcasts',
        id: broadcast.id,
        data: {
          pausedUntil: new Date(Date.now() + PAUSE_MINUTES * 60_000).toISOString(),
          lastError: message.slice(0, 500),
        },
        context: { broadcastQueue: true },
        overrideAccess: true,
      })
      return 'pause'
    }
    const attempts = (delivery.attempts ?? 0) + 1
    if (kind === 'recipient' || attempts >= MAX_ATTEMPTS) {
      await done({ status: 'failed', attempts, error: message.slice(0, 500) })
    } else {
      await done({
        attempts,
        error: message.slice(0, 500),
        nextAttemptAt: new Date(Date.now() + RETRY_MINUTES * 60_000).toISOString(),
      })
    }
    return 'ok'
  }
}

async function processBroadcast(payload: Payload, broadcast: Broadcast): Promise<void> {
  const now = new Date().toISOString()
  if (broadcast.pausedUntil && broadcast.pausedUntil > now) return

  const { docs } = await payload.find({
    collection: 'broadcast-deliveries',
    where: {
      and: [
        { broadcast: { equals: broadcast.id } },
        { status: { equals: 'pending' } },
        { or: [{ nextAttemptAt: { exists: false } }, { nextAttemptAt: { less_than_equal: now } }] },
      ],
    },
    sort: 'id',
    limit: BATCH,
    depth: 0,
    overrideAccess: true,
  })
  for (const delivery of docs) {
    if ((await sendDelivery(payload, broadcast, delivery)) === 'pause') return
  }

  const [sent, failed, pending] = await Promise.all([
    countDeliveries(payload, broadcast.id, 'sent'),
    countDeliveries(payload, broadcast.id, 'failed'),
    countDeliveries(payload, broadcast.id, 'pending'),
  ])
  await payload.update({
    collection: 'broadcasts',
    id: broadcast.id,
    data: {
      sentCount: sent,
      failedCount: failed,
      // A batch that went through clears the last pause's reason.
      ...(docs.length ? { pausedUntil: null, lastError: null } : {}),
      ...(pending === 0 ? { status: 'sent' as const, finishedAt: new Date().toISOString() } : {}),
    },
    context: { broadcastQueue: true },
    overrideAccess: true,
  })
}

/** One tick: every broadcast in progress, oldest first, one batch each. */
export async function processBroadcasts(payload: Payload): Promise<void> {
  if (queue.__broadcastQueueRunning) return
  queue.__broadcastQueueRunning = true
  // The flag covers this process; this lock covers ALL of them — a second
  // instance, or the integration tests (`tests/integration`) queueing into
  // the database a development server is ticking over. A transaction-level
  // advisory lock, held only by the open transaction (its own pooled
  // connection) and released by the commit in `finally`; the sending itself
  // writes through other connections. Not taken: someone else is ticking.
  // Inside the `try`: a database that fails here already must still reach
  // the `finally`, or the flag stays set and this process never ticks again
  // (measured 05.10.2026 with a failing `beginTransaction`).
  let lockReq: Awaited<ReturnType<typeof createLocalReq>> | null = null
  try {
    lockReq = await createLocalReq({}, payload)
    await initTransaction(lockReq)
    const tx = await txOf(payload, lockReq)
    const result = (await tx.execute(
      sql`SELECT pg_try_advisory_xact_lock(${LOCK_QUEUE}) AS locked`,
    )) as { rows?: { locked: boolean }[] }
    if (!result.rows?.[0]?.locked) return
    const { docs } = await payload.find({
      collection: 'broadcasts',
      where: { status: { equals: 'sending' } },
      sort: 'startedAt',
      limit: 10,
      depth: 0,
      joins: false,
      overrideAccess: true,
    })
    // Each on its own: one broadcast that cannot be processed must not hold
    // up the ones behind it, tick after tick.
    for (const broadcast of docs) {
      await processBroadcast(payload, broadcast).catch((error) =>
        payload.logger.warn(
          { err: error },
          `Broadcast ${broadcast.id} failed this tick, will retry`,
        ),
      )
    }
  } catch (error) {
    payload.logger.warn({ err: error }, 'Broadcast queue tick failed, will retry')
  } finally {
    if (lockReq) {
      const req = lockReq
      await commitTransaction(req).catch(() => killTransaction(req).catch(() => undefined))
    }
    queue.__broadcastQueueRunning = false
  }
}

export function scheduleBroadcastWorker(getPayloadInstance: () => Promise<Payload>): void {
  const tick = () =>
    getPayloadInstance()
      .then(processBroadcasts)
      .catch((error) => console.warn('Broadcast queue could not start a tick:', error))
  setInterval(tick, TICK_MS).unref()
}

/** Thrown by the collection hook when a sent broadcast is edited. */
export function lockedError(): APIError {
  return new APIError(
    'Ta wiadomość jest już wysłana albo w trakcie wysyłki — zmian nie da się zapisać. Żeby wysłać podobną, użyj „Duplikuj”.',
    400,
    null,
    true,
  )
}
