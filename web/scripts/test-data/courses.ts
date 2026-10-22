/**
 * Test data for the manual course scenario (`docs/testy-reczne.html`).
 *
 *   TEST_INBOX=you@gmail.com npm run seed:test:courses                # fresh test data
 *   TEST_INBOX=you@gmail.com npm run seed:test:courses -- clean       # remove it only
 *   TEST_INBOX=you@gmail.com npm run seed:test:courses -- clean-all   # … and what testers added by hand
 *
 * `npm run seed:test` is the same — the name the "Test data" workflow and the
 * course scenario used before the camps got their own script (22.10.2026).
 * Addresses carry `+abctest-`; what is shared with the camp script, and why:
 * `common.ts`. The address the tester registers from scratch (`+abctest-nowy`)
 * is deliberately not created here.
 *
 * PRODUCTION (decided 13.10.2026 — testing on the live server before launch):
 * no panel account (a known password to the school's panel in a public repo
 * would be an open door; testers use their own), the password from
 * `TEST_PASSWORD`, no address or token in the output. Ewa's expired link is
 * therefore local only.
 */
import crypto from 'node:crypto'

import { formatDateRange } from '@/lib/format'
import { newToken } from '@/lib/newsletter'

import {
  PASSWORD,
  QUIET,
  addressWith,
  command,
  findAll,
  finish,
  isTestAddress,
  iso,
  onProduction,
  openWindow,
  payload,
  removeWhere,
  reportLeftovers,
  say,
  shownWith,
  untaggedSince,
  type Leftovers,
} from './common'

const TAG = '+abctest-'
/** Shown on the public schedule next to the date — on production real visitors see it too. */
const SESSION_NOTE = 'TERMIN TESTOWY — nie zapisuj się'
/** The note before 13.10.2026, so a clean still finds sessions seeded earlier. */
const OLD_SESSION_NOTE = 'termin testowy (seed:test)'
/** When the current round of testing began — see `reportLeftovers`. */
const SINCE_KEY = 'seed-test:since'

const address = addressWith(TAG)
const shown = shownWith(TAG)

/**
 * Broadcasts every recipient of which is a test address — the tester's own
 * sends. One with a real recipient among them is not the script's to judge.
 */
async function testBroadcastIds(): Promise<number[]> {
  const deliveries = await findAll('broadcast-deliveries', {})
  const byBroadcast = new Map<number, boolean>()
  for (const row of deliveries) {
    const id = Number(row.broadcast)
    // This script's own tag: a camp-round broadcast is the camp script's to remove.
    const ours = typeof row.email === 'string' && row.email.includes(TAG)
    byBroadcast.set(id, (byBroadcast.get(id) ?? true) && ours)
  }
  return [...byBroadcast].filter(([, onlyTest]) => onlyTest).map(([id]) => id)
}

/**
 * Records made since the round began that no tag covers. Bookings on test
 * sessions are left out — those go with their session anyway.
 */
async function leftovers(since: string, testSessions: number[], testBroadcasts: number[]) {
  const found: Leftovers = {}
  found.customers = await untaggedSince('customers', since)
  found.bookings = await untaggedSince(
    'bookings',
    since,
    (row) => !testSessions.includes(Number(row.session)),
  )
  found.messages = await untaggedSince('messages', since)
  found.newsletter = await untaggedSince('newsletter', since)
  found.broadcasts = (await findAll('broadcasts', { createdAt: { greater_than_equal: since } }))
    .map((row) => Number(row.id))
    .filter((id) => !testBroadcasts.includes(id))
  return found
}

async function clean(all: boolean) {
  const testSessions = (
    await findAll('sessions', { note: { in: [SESSION_NOTE, OLD_SESSION_NOTE] } })
  ).map((row) => Number(row.id))
  const testBroadcasts = await testBroadcastIds()
  const since = await payload.kv.get<string>(SINCE_KEY)
  // Measured BEFORE deleting: afterwards nothing tells the test sessions apart.
  const extra = since ? await leftovers(since, testSessions, testBroadcasts) : {}

  for (const id of testSessions) {
    // Bookings first: a session with bookings refuses deletion.
    await removeWhere('bookings', { session: { equals: id } })
    await payload.delete({ collection: 'sessions', id, overrideAccess: true })
  }
  const tagged = { email: { contains: TAG } }
  // Test bookings the tester made on REAL sessions.
  await removeWhere('bookings', tagged)
  for (const id of testBroadcasts) {
    // `beforeDelete` takes the deliveries with it.
    await payload.delete({ collection: 'broadcasts', id, overrideAccess: true })
  }
  // A test address among real recipients of a broadcast that stays.
  await removeWhere('broadcast-deliveries', tagged)
  await removeWhere('customers', tagged)
  await removeWhere('newsletter', tagged)
  await removeWhere('messages', tagged)
  await removeWhere('users', tagged)
  console.log(
    `Removed test data: ${testSessions.length} test sessions, ${testBroadcasts.length} test broadcasts.`,
  )
  say(
    `Removed test data: everything with \`${TAG}\` in the address, and the test sessions (${testSessions.length}).`,
  )
  await reportLeftovers(SINCE_KEY, extra, all)
}

await clean(command === 'clean-all')
if (command !== 'seed') finish()

await openWindow(SINCE_KEY)

const { docs: courses } = await payload.find({
  collection: 'courses',
  where: { _status: { equals: 'published' } },
  sort: 'order',
  limit: 1,
  depth: 0,
  overrideAccess: true,
})
const course = courses[0]
if (!course) throw new Error('No published course — run `npm run seed` first.')

const consent = { consentText: 'dane testowe (seed:test)', consentDate: new Date().toISOString() }

if (!onProduction) {
  await payload.create({
    collection: 'users',
    data: { email: address('szkola'), password: PASSWORD, name: 'Szkoła (test)' } as never,
    overrideAccess: true,
  })
}

async function customer(
  name: string,
  data: { firstName: string; lastName: string; language: 'pl' | 'en'; verified: boolean },
) {
  return payload.create({
    collection: 'customers',
    data: {
      email: address(name),
      password: PASSWORD,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: '+48600100200',
      language: data.language,
      _verified: data.verified,
      verificationSentAt: new Date().toISOString(),
      ...consent,
    } as never,
    overrideAccess: true,
    disableVerificationEmail: true,
  })
}

const ola = await customer('ola', {
  firstName: 'Aleksandra',
  lastName: 'Nowak',
  language: 'pl',
  verified: true,
})
await customer('tom', { firstName: 'Tom', lastName: 'Becker', language: 'en', verified: true })
const ewa = await customer('ewa', {
  firstName: 'Ewa',
  lastName: 'Kowalczyk',
  language: 'pl',
  verified: false,
})
// Ewa's link was "sent" three days ago — past the 48 h limit. The same write
// path the site uses (`sendVerificationLink`): the token field refuses updates.
const ewaToken = crypto.randomBytes(20).toString('hex')
await payload.db.updateOne({
  collection: 'customers',
  id: ewa.id,
  data: { _verificationToken: ewaToken, verificationSentAt: iso(-3) },
})

async function session(data: {
  startDays: number
  lengthDays: number
  capacity: number
  status?: string
}) {
  return payload.create({
    collection: 'sessions',
    data: {
      course: course.id,
      startDate: iso(data.startDays),
      endDate: iso(data.startDays + data.lengthDays),
      capacity: data.capacity,
      status: data.status ?? 'open',
      note: SESSION_NOTE,
    } as never,
    overrideAccess: true,
  })
}

const open = await session({ startDays: 14, lengthDays: 4, capacity: 6 })
const full = await session({ startDays: 28, lengthDays: 1, capacity: 2 })
const past = await session({ startDays: -40, lengthDays: 4, capacity: 6, status: 'finished' })

async function booking(
  sessionId: number,
  name: string,
  firstName: string,
  lastName: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  return payload.create({
    collection: 'bookings',
    data: {
      session: sessionId,
      status,
      firstName,
      lastName,
      email: address(name),
      phone: '+48600100200',
      language: 'pl',
      ...consent,
      ...extra,
    } as never,
    overrideAccess: true,
    context: QUIET,
  })
}

await booking(open.id, 'ola', 'Aleksandra', 'Nowak', 'confirmed', { customer: ola.id })
await booking(past.id, 'ola', 'Aleksandra', 'Nowak', 'paid', { customer: ola.id })
await booking(open.id, 'gosc', 'Grzegorz', 'Gość', 'new', {
  notes: 'Zapis bez konta — po rejestracji tego adresu ma się pojawić w Moim koncie.',
})
await booking(full.id, 'piotr', 'Piotr', 'Wiśniewski', 'confirmed')
await booking(full.id, 'kasia', 'Katarzyna', 'Lewandowska', 'deposit', {
  emailIssue:
    'Mail „miejsce potwierdzone” — Brevo odrzucił ten adres (dane testowe, nic nie poszło)',
  emailIssueAt: new Date().toISOString(),
  emailIssueHandled: false,
})
await booking(full.id, 'marek', 'Marek', 'Zieliński', 'waitlist')

for (const [name, status] of [
  ['nl1', 'subscribed'],
  ['nl2', 'subscribed'],
  ['nl3', 'pending'],
] as const) {
  await payload.create({
    collection: 'newsletter',
    data: {
      email: address(name),
      status,
      token: newToken(),
      language: 'pl',
      ...consent,
      ...(status === 'subscribed'
        ? { confirmedAt: new Date().toISOString() }
        : { confirmationSentAt: new Date().toISOString() }),
    },
    overrideAccess: true,
  })
}

// Real confirmed subscribers get every newsletter test send too (H5).
const realSubscribers = (await findAll('newsletter', { status: { equals: 'subscribed' } })).filter(
  (row) => !isTestAddress(row.email),
).length

const base = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
say()
say('## Test data ready')
say()
say(
  onProduction
    ? 'Password of every test account: the one in the `TEST_PASSWORD` secret (not shown here).'
    : `Password of every test account: \`${PASSWORD}\``,
)
say()
say('| Who | Address | For |')
say('|---|---|---|')
const rows: [string, string, string][] = [
  ['Ola', 'ola', 'PL account: upcoming booking + history'],
  ['Tom', 'tom', 'EN account: emails in English'],
  ['Ewa', 'ewa', 'unconfirmed account'],
  ['Gość', 'gosc', 'booking WITHOUT an account — register this address'],
  ['Nowy', 'nowy', 'does NOT exist — registration from scratch'],
]
if (!onProduction) rows.unshift(['School panel', 'szkola', 'login at /admin'])
for (const [who, name, what] of rows) say(`| ${who} | \`${shown(name)}\` | ${what} |`)
say()
say(`Course with the test sessions: ${base}/kursy/${course.slug}`)
say(
  `Open session: ${formatDateRange(open.startDate, open.endDate)} · full session: ${formatDateRange(full.startDate, full.endDate)}`,
)
say('Camp test data: `npm run seed:test:camps` (its own script and tag).')
say(`Real confirmed newsletter subscribers: ${realSubscribers}`)
if (!onProduction) say(`Ewa's expired link: ${base}/konto/potwierdz?token=${ewaToken}`)
finish()
