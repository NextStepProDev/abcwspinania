/**
 * Test data for the manual test scenario (`docs/testy-reczne.html`).
 *
 *   TEST_INBOX=you@gmail.com npm run seed:test                # fresh test data
 *   TEST_INBOX=you@gmail.com npm run seed:test -- clean       # remove it only
 *   TEST_INBOX=you@gmail.com npm run seed:test -- clean-all   # … and what testers added by hand
 *
 * `clean` is a plain word, not `--clean`: `payload run` parses the command
 * line with minimist and passes on only the positional words — a flag never
 * reaches the script, which then re-seeded instead of cleaning.
 *
 * Every test address is an alias of ONE real inbox — `you+abctest-ola@…` —
 * so each account is separate for the site, while every email the scenario
 * triggers lands in the tester's own mailbox (Gmail and most providers
 * deliver `+anything` to the base address). The tag `+abctest-` is also how
 * the script finds its own records again: every run deletes the previous
 * test data first, so the scenario always starts from the same state.
 *
 * The script itself sends NOTHING (`payload.sendEmail` is replaced): emails
 * come only from what the tester clicks, against a server with a real Brevo
 * key. The address the tester registers from scratch (`+abctest-nowy`) is
 * deliberately not created here.
 *
 * PRODUCTION (decided 13.10.2026 — testing on the live server before launch):
 * only through the "Dane testowe" workflow, which sets
 * `TEST_DATA_ON_PRODUCTION=yes`. There the script
 *   - creates NO panel account — a known password to the school's panel in a
 *     public repo would be an open door; testers use their own panel accounts;
 *   - takes the password from `TEST_PASSWORD` (a repository secret), never
 *     the constant below — and refuses a secret EQUAL to it (it is public);
 *   - prints no address and no token: the repository is public, and so are
 *     the workflow's logs. Ewa's expired link is therefore local only.
 *
 * What testers add by hand without the tag (an account on their real
 * address, a phone booking on a real session) cannot be told from real data
 * by its content — only by WHEN it was made. The first seed stores that
 * moment (`payload.kv`, kept across re-seeds); `clean` lists what appeared
 * since, by id only, and `clean-all` removes it and closes the window.
 */
import crypto from 'node:crypto'
import { appendFileSync } from 'node:fs'

import { getPayload, type CollectionSlug, type Payload } from 'payload'
import config from '@payload-config'

import { formatDateRange } from '@/lib/format'
import { newToken } from '@/lib/newsletter'

const onProduction = process.env.NODE_ENV === 'production'
if (onProduction && process.env.TEST_DATA_ON_PRODUCTION !== 'yes') {
  throw new Error(
    'seed:test on production runs only from the "Dane testowe" workflow (TEST_DATA_ON_PRODUCTION=yes).',
  )
}

const inbox = (process.env.TEST_INBOX ?? '').trim().toLowerCase()
const at = inbox.indexOf('@')
if (at < 1 || inbox.includes('+')) {
  throw new Error('Set TEST_INBOX to your own address without a "+", e.g. TEST_INBOX=you@gmail.com')
}

const TAG = '+abctest-'
/** The local test password — PUBLIC, it is in this file. Production takes `TEST_PASSWORD`. */
const LOCAL_PASSWORD = 'Testy-ABC-2026'
const PASSWORD = onProduction ? (process.env.TEST_PASSWORD ?? '') : LOCAL_PASSWORD
if (PASSWORD.length < 10) {
  throw new Error('Set TEST_PASSWORD (at least 10 characters) — the password of the test accounts.')
}
// The repository is public: this password on production means test accounts
// anyone can log into — and Krzysiek's panel account starts with the same
// password as the test accounts (docs/testy-reczne.html, step Z5).
if (onProduction && PASSWORD === LOCAL_PASSWORD) {
  throw new Error(
    'TEST_PASSWORD must differ from the local password in seed-test.ts — that one is public.',
  )
}
/** Shown on the public schedule next to the date — on production real visitors see it too. */
const SESSION_NOTE = 'TERMIN TESTOWY — nie zapisuj się'
/** The note before 13.10.2026, so a clean still finds sessions seeded earlier. */
const OLD_SESSION_NOTE = 'termin testowy (seed:test)'
/** When the current round of testing began — see the header. */
const SINCE_KEY = 'seed-test:since'

const address = (name: string) => `${inbox.slice(0, at)}${TAG}${name}${inbox.slice(at)}`
/** How an address appears in output: the full one locally, only its tag in public logs. */
const shown = (name: string) => (onProduction ? `${TAG}${name}` : address(name))
const isTagged = (email: unknown) => typeof email === 'string' && email.includes(TAG)

const command = process.argv.includes('clean-all')
  ? 'clean-all'
  : process.argv.includes('clean')
    ? 'clean'
    : 'seed'

const payload: Payload = await getPayload({ config })
payload.sendEmail = (async () => undefined) as Payload['sendEmail']

const QUIET = { skipStatusEmail: true }
const day = 86_400_000
const now = Date.now()
const iso = (days: number) => new Date(now + days * day).toISOString()

/** The job summary on GitHub (Polish — the tester reads it), the console locally. */
const summary: string[] = []
const say = (line = '') => summary.push(line)

/** Payload's bulk delete returns refusals instead of throwing — fail loudly. */
async function removeWhere(collection: CollectionSlug, where: Record<string, unknown>) {
  const { docs, errors } = await payload.delete({
    collection,
    where: where as never,
    overrideAccess: true,
    context: QUIET,
  })
  if (errors.length) {
    throw new Error(`could not delete from ${collection}: ${JSON.stringify(errors)}`)
  }
  return docs.length
}

async function findAll(collection: CollectionSlug, where: Record<string, unknown>) {
  const { docs } = await payload.find({
    collection,
    where: where as never,
    limit: 1000,
    depth: 0,
    // A union of slugs widens `joins` to `undefined`; every collection takes `false`.
    joins: false as never,
    pagination: false,
    overrideAccess: true,
  })
  return docs as unknown as Record<string, unknown>[]
}

/**
 * Broadcasts every recipient of which is a test address — the tester's own
 * sends. One with a real recipient among them is not the script's to judge.
 */
async function testBroadcastIds(): Promise<number[]> {
  const deliveries = await findAll('broadcast-deliveries', {})
  const byBroadcast = new Map<number, boolean>()
  for (const row of deliveries) {
    const id = Number(row.broadcast)
    byBroadcast.set(id, (byBroadcast.get(id) ?? true) && isTagged(row.email))
  }
  return [...byBroadcast].filter(([, onlyTest]) => onlyTest).map(([id]) => id)
}

type Leftovers = Partial<Record<CollectionSlug, number[]>>

/**
 * Records made since the round began that the tag does not cover. Bookings
 * on test sessions are left out — those go with their session anyway.
 */
async function leftovers(since: string, testSessions: number[], testBroadcasts: number[]) {
  const made = { createdAt: { greater_than_equal: since } }
  const found: Leftovers = {}
  const untagged = async (
    collection: CollectionSlug,
    keep: (row: Record<string, unknown>) => boolean = () => true,
  ) =>
    (await findAll(collection, made))
      .filter((row) => !isTagged(row.email) && keep(row))
      .map((row) => Number(row.id))
  found.customers = await untagged('customers')
  found.bookings = await untagged('bookings', (row) => !testSessions.includes(Number(row.session)))
  found.messages = await untagged('messages')
  found.newsletter = await untagged('newsletter')
  found.broadcasts = (await findAll('broadcasts', made))
    .map((row) => Number(row.id))
    .filter((id) => !testBroadcasts.includes(id))
  return found
}

const LABELS: Partial<Record<CollectionSlug, string>> = {
  customers: 'Uczestnicy (konta)',
  bookings: 'Zapisy',
  messages: 'Wiadomości',
  newsletter: 'Newsletter',
  broadcasts: 'Wysyłki',
}

const polishTime = (value: string) =>
  new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(value))

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
    `Usunięte dane testowe: wszystko z \`${TAG}\` w adresie i terminy testowe (${testSessions.length}).`,
  )

  const began = since ? polishTime(since) : ''
  const rows = Object.entries(extra).filter(([, ids]) => ids.length > 0) as [
    CollectionSlug,
    number[],
  ][]
  if (!since) {
    say('Brak zapisanego początku testów — nie ma czego sprawdzać poza znacznikiem.')
  } else if (rows.length === 0) {
    say(`Od początku testów (${began}) nie przybyło nic bez znacznika.`)
  } else if (!all) {
    say(`Od początku testów (${began}) przybyło BEZ znacznika:`)
    for (const [collection, ids] of rows) {
      say(`- ${LABELS[collection]}: ${ids.length} (id: ${ids.join(', ')})`)
    }
    say('Sprawdź je w panelu. Jeśli to wszystko testy — uruchom jeszcze raz z „wyczysc-wszystko”.')
  } else {
    for (const [collection, ids] of rows) {
      for (const id of ids) {
        if (collection === 'bookings') {
          await payload.delete({ collection, id, overrideAccess: true, context: QUIET })
        } else {
          await payload.delete({ collection, id, overrideAccess: true })
        }
      }
      say(`- usunięte ${LABELS[collection]}: ${ids.length} (id: ${ids.join(', ')})`)
    }
  }
  if (all) {
    await payload.kv.delete(SINCE_KEY)
    say('Okres testów zamknięty — następne wgranie zaczyna nowy.')
  }
}

function finish(code = 0): never {
  const text = summary.join('\n')
  console.log(`\n${text}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)
  process.exit(code)
}

await clean(command === 'clean-all')
if (command !== 'seed') finish()

if (!(await payload.kv.get(SINCE_KEY))) await payload.kv.set(SINCE_KEY, new Date().toISOString())

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
  (row) => !isTagged(row.email),
).length

const base = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
say()
say('## Dane testowe gotowe')
say()
say(
  onProduction
    ? 'Hasło każdego konta testowego: to z sekretu `TEST_PASSWORD` (nie pokazujemy go tutaj).'
    : `Hasło każdego konta testowego: \`${PASSWORD}\``,
)
say()
say('| Kto | Adres | Do czego |')
say('|---|---|---|')
const rows: [string, string, string][] = [
  ['Ola', 'ola', 'konto PL: zapis nadchodzący + archiwum'],
  ['Tom', 'tom', 'konto EN: maile po angielsku'],
  ['Ewa', 'ewa', 'konto niepotwierdzone'],
  ['Gość', 'gosc', 'zapis BEZ konta — zarejestruj ten adres'],
  ['Nowy', 'nowy', 'NIE istnieje — rejestracja od zera'],
]
if (!onProduction) rows.unshift(['Panel szkoły', 'szkola', 'logowanie na /admin'])
for (const [who, name, what] of rows) say(`| ${who} | \`${shown(name)}\` | ${what} |`)
say()
say(`Kurs z terminami testowymi: ${base}/kursy/${course.slug}`)
say(
  `Termin otwarty: ${formatDateRange(open.startDate, open.endDate)} · termin pełny: ${formatDateRange(full.startDate, full.endDate)}`,
)
say(`Prawdziwi potwierdzeni subskrybenci newslettera: ${realSubscribers}`)
if (!onProduction) say(`Wygasły link Ewy: ${base}/konto/potwierdz?token=${ewaToken}`)
finish()
