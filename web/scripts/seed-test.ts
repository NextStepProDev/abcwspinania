/**
 * Test data for the manual test scenario (`docs/testy-reczne.html`).
 *
 *   TEST_INBOX=you@gmail.com npm run seed:test           # fresh test data
 *   TEST_INBOX=you@gmail.com npm run seed:test -- clean    # remove it only
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
 * ⚠️ Not for production: it creates accounts with a known password.
 */
import crypto from 'node:crypto'

import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

import { newToken } from '@/lib/newsletter'

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'seed:test does not run in production — it creates accounts with a known password.',
  )
}

const inbox = (process.env.TEST_INBOX ?? '').trim().toLowerCase()
const at = inbox.indexOf('@')
if (at < 1 || inbox.includes('+')) {
  throw new Error('Set TEST_INBOX to your own address without a "+", e.g. TEST_INBOX=you@gmail.com')
}

const TAG = '+abctest-'
/** One local test password for every test account — printed in the scenario. */
const PASSWORD = 'Testy-ABC-2026'
const SESSION_NOTE = 'termin testowy (seed:test)'

const address = (name: string) => `${inbox.slice(0, at)}${TAG}${name}${inbox.slice(at)}`

const payload: Payload = await getPayload({ config })
payload.sendEmail = (async () => undefined) as Payload['sendEmail']

const QUIET = { skipStatusEmail: true }
const day = 86_400_000
const now = Date.now()
const iso = (days: number) => new Date(now + days * day).toISOString()

/** Payload's bulk delete returns refusals instead of throwing — fail loudly. */
async function removeWhere(
  collection: Parameters<Payload['delete']>[0]['collection'],
  where: Record<string, unknown>,
) {
  const { errors } = await payload.delete({
    collection,
    where: where as never,
    overrideAccess: true,
    context: QUIET,
  })
  if (errors.length) {
    throw new Error(`could not delete from ${collection}: ${JSON.stringify(errors)}`)
  }
}

async function clean() {
  const tagged = { email: { contains: TAG } }
  const { docs: sessions } = await payload.find({
    collection: 'sessions',
    where: { note: { equals: SESSION_NOTE } },
    limit: 100,
    joins: false,
    depth: 0,
    overrideAccess: true,
  })
  for (const session of sessions) {
    // Bookings first: a session with bookings refuses deletion.
    await removeWhere('bookings', { session: { equals: session.id } })
    await payload.delete({ collection: 'sessions', id: session.id, overrideAccess: true })
  }
  // Test bookings the tester made on REAL sessions.
  await removeWhere('bookings', tagged)
  await removeWhere('customers', tagged)
  await removeWhere('newsletter', tagged)
  await removeWhere('messages', tagged)
  await removeWhere('users', tagged)
  console.log(`Removed test data (${sessions.length} test sessions).`)
}

await clean()
if (process.argv.includes('clean')) process.exit(0)

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

await payload.create({
  collection: 'users',
  data: { email: address('szkola'), password: PASSWORD, name: 'Szkoła (test)' } as never,
  overrideAccess: true,
})

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

const base = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
const rows: [string, string, string][] = [
  ['Panel szkoły', address('szkola'), 'logowanie na /admin'],
  ['Ola', address('ola'), 'konto PL: zapis nadchodzący + archiwum'],
  ['Tom', address('tom'), 'konto EN: maile po angielsku'],
  ['Ewa', address('ewa'), 'konto niepotwierdzone, link wygasł'],
  ['Gość', address('gosc'), 'zapis BEZ konta — zarejestruj ten adres'],
  ['Nowy', address('nowy'), 'NIE istnieje — rejestracja od zera'],
]
console.log(`\nTest data ready. Password for every account: ${PASSWORD}\n`)
for (const [who, mail, what] of rows) console.log(`  ${who.padEnd(12)} ${mail.padEnd(42)} ${what}`)
const dateOnly = (value: string) => value.slice(0, 10)
console.log(`\n  Course: ${base}/kursy/${course.slug}`)
console.log(
  `  Test sessions: open from ${dateOnly(open.startDate)}, full from ${dateOnly(full.startDate)}`,
)
console.log(`  Ewa's expired link: ${base}/konto/potwierdz?token=${ewaToken}\n`)
process.exit(0)
