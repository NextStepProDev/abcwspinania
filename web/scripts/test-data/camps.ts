/**
 * Test data for the manual camp scenario (`docs/testy-obozy.html`).
 *
 *   TEST_INBOX=you@gmail.com npm run seed:test:camps                # fresh test data
 *   TEST_INBOX=you@gmail.com npm run seed:test:camps -- clean       # remove it only
 *   TEST_INBOX=you@gmail.com npm run seed:test:camps -- clean-all   # … and what testers added by hand
 *
 * The same options and the same password as the course data (`courses.ts`,
 * shared parts in `common.ts`), its own tag `+abctestoboz-`, its own test
 * turnusy and its own testing window — cleaning one round never touches the
 * other's data.
 *
 * Test turnusy on the first published camp, each with its own price (2500 zł)
 * so the contract and the amounts do not depend on what the panel says:
 *   open   — in 35 days, 8 places: the parents below, the tester's sign-ups
 *   almost — in 49 days, 3 places with 2 taken: the warning for siblings
 *   soon   — in 10 days: the email before the camp is due (the daily sweep
 *            makes its draft at 8:00, or at once with `npm run sweep`)
 *   past   — 40 days ago, finished: the archive in "Moje konto"
 *
 * States are written the way the site writes them — the registration form
 * through `saveRegistration`, the contract through `sendRegistrationEmails`
 * (with `payload.sendEmail` replaced, nothing goes out). The registration
 * links are printed locally; on production only ids (public logs) — there
 * Anna opens hers from "Moje konto", the others get theirs by "Wyślij
 * rodzicowi link" in the panel.
 */
import crypto from 'node:crypto'

import {
  findByToken,
  registrationUrl,
  saveRegistration,
  sendRegistrationEmails,
} from '@/lib/campRegistration'
import { formatDateRange } from '@/lib/format'

import {
  PASSWORD,
  QUIET,
  addressWith,
  command,
  findAll,
  finish,
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

const TAG = '+abctestoboz-'
/** Shown on the public schedule next to the date — on production real visitors see it too. */
const SESSION_NOTE = 'TURNUS TESTOWY — nie zapisuj się'
const SINCE_KEY = 'seed-test-camps:since'
const PRICE = 2500

const address = addressWith(TAG)
const shown = shownWith(TAG)

async function clean(all: boolean) {
  const testSessions = (await findAll('sessions', { note: { equals: SESSION_NOTE } })).map((row) =>
    Number(row.id),
  )
  const since = await payload.kv.get<string>(SINCE_KEY)
  // Measured BEFORE deleting: afterwards nothing tells the test turnusy apart.
  const extra: Leftovers = {}
  if (since) {
    extra.customers = await untaggedSince('customers', since)
    extra.bookings = await untaggedSince(
      'bookings',
      since,
      (row) => row.kind === 'camp' && !testSessions.includes(Number(row.session)),
    )
    extra.broadcasts = (await findAll('broadcasts', { createdAt: { greater_than_equal: since } }))
      .filter((row) => !testSessions.includes(Number(row.session)))
      .filter((row) => row.audience === 'session')
      .map((row) => Number(row.id))
  }

  for (const id of testSessions) {
    // The drafts before the camp and the tester's sends to it (deliveries go with them).
    for (const row of await findAll('broadcasts', { session: { equals: id } })) {
      await payload.delete({ collection: 'broadcasts', id: Number(row.id), overrideAccess: true })
    }
    // Bookings first: a turnus with bookings refuses deletion. Their
    // registration forms go with them (`Bookings` beforeDelete).
    await removeWhere('bookings', { session: { equals: id } })
    await payload.delete({ collection: 'sessions', id, overrideAccess: true })
  }
  const tagged = { email: { contains: TAG } }
  // Test sign-ups the tester made on REAL turnusy.
  await removeWhere('bookings', tagged)
  await removeWhere('broadcast-deliveries', tagged)
  await removeWhere('customers', tagged)
  await removeWhere('users', tagged)
  console.log(`Removed camp test data: ${testSessions.length} test turnusy.`)
  say(
    `Removed camp test data: everything with \`${TAG}\` in the address, and the test turnusy (${testSessions.length}).`,
  )
  await reportLeftovers(SINCE_KEY, extra, all)
}

await clean(command === 'clean-all')
if (command !== 'seed') finish()

await openWindow(SINCE_KEY)

const { docs: camps } = await payload.find({
  collection: 'camps',
  where: { and: [{ _status: { equals: 'published' } }, { kind: { equals: 'camp' } }] },
  sort: 'order',
  limit: 1,
  depth: 0,
  overrideAccess: true,
})
const camp = camps[0]
if (!camp) throw new Error('No published camp — run `npm run seed` first.')

const consent = {
  consentText: 'dane testowe (seed:test:camps)',
  consentDate: new Date().toISOString(),
}

if (!onProduction) {
  await payload.create({
    collection: 'users',
    data: { email: address('szkola'), password: PASSWORD, name: 'Szkoła (test obozów)' } as never,
    overrideAccess: true,
  })
}

const anna = await payload.create({
  collection: 'customers',
  data: {
    email: address('anna'),
    password: PASSWORD,
    firstName: 'Anna',
    lastName: 'Kowalska',
    phone: '+48600100200',
    language: 'pl',
    _verified: true,
    verificationSentAt: new Date().toISOString(),
    ...consent,
  } as never,
  overrideAccess: true,
  disableVerificationEmail: true,
})

async function turnus(startDays: number, capacity: number, status = 'open') {
  return payload.create({
    collection: 'sessions',
    data: {
      camp: camp.id,
      startDate: iso(startDays),
      endDate: iso(startDays + 7),
      capacity,
      price: PRICE,
      status,
      note: SESSION_NOTE,
    } as never,
    overrideAccess: true,
  })
}

const open = await turnus(35, 8)
const almost = await turnus(49, 3)
const soon = await turnus(10, 8)
const past = await turnus(-40, 8, 'finished')

const token = () => crypto.randomBytes(32).toString('hex')

/**
 * One child's booking, as the sign-up form makes it. `link` is the sign-up's
 * registration token — shared by siblings signed up together, none for a
 * child on the waiting list.
 */
async function child(
  sessionId: number,
  parent: { name: string; firstName: string; lastName: string; customer?: number },
  kid: { firstName: string; lastName: string },
  status: string,
  link: string | null,
) {
  return payload.create({
    collection: 'bookings',
    data: {
      kind: 'camp',
      session: sessionId,
      status,
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: address(parent.name),
      phone: '+48600100200',
      language: 'pl',
      customer: parent.customer,
      childFirstName: kid.firstName,
      childLastName: kid.lastName,
      registrationToken: link,
      registrationSentAt: link ? new Date().toISOString() : null,
      ...consent,
    } as never,
    overrideAccess: true,
    context: QUIET,
  })
}

/** The registration form sent, as the parent would — and with it the payment email and contract. */
async function fillForm(
  link: string,
  pesels: string[],
  invoice: { name: string; nip: string; address: string } | null = null,
) {
  const ctx = (await findByToken(payload, link))!
  const saved = await saveRegistration(payload, ctx, {
    address: { street: 'ul. Skalna 12', postcode: '42-421', city: 'Rzędkowice' },
    invoiceRequested: Boolean(invoice),
    invoiceCompany: invoice,
    children: Object.fromEntries(
      ctx.children.map((c, i) => [
        c.booking.id,
        {
          pesel: pesels[i] ?? pesels[0]!,
          heightCm: 140,
          allergies: i === 0 ? 'Orzechy' : '',
          medications: '',
          diet: 'Wegetariańska',
          conditions: '',
          photoConsent: i === 0,
        },
      ]),
    ),
  })
  await sendRegistrationEmails(payload, ctx, saved)
  return saved
}

// Anna (an account): Zosia and Staś on the open turnus, the form NOT sent —
// the tester fills it in (from "Moje konto" or the link below).
const annaParent = { name: 'anna', firstName: 'Anna', lastName: 'Kowalska', customer: anna.id }
const annaLink = token()
await child(open.id, annaParent, { firstName: 'Zosia', lastName: 'Kowalska' }, 'new', annaLink)
await child(open.id, annaParent, { firstName: 'Staś', lastName: 'Kowalski' }, 'new', annaLink)
// … and an earlier camp, in her archive — an older sister, not Zosia: two
// "Zosia Kowalska" rows on the panel list sent a deposit to the wrong one
// in the walk-through (24.10.2026).
await child(past.id, annaParent, { firstName: 'Julka', lastName: 'Kowalska' }, 'paid', null)

// Jan (no account): Ola on the open turnus, the form sent, the contract and
// the payment details "emailed" — a correction, the contract, the deposit.
const janParent = { name: 'jan', firstName: 'Jan', lastName: 'Mazur' }
const janLink = token()
await child(open.id, janParent, { firstName: 'Ola', lastName: 'Mazur' }, 'new', janLink)
await fillForm(janLink, ['17261445615'])

// Piotr: Bartek on the almost-full turnus, the form in, the deposit LATE —
// the dashboard tile and, with the daily sweep, the reminder.
const piotrParent = { name: 'piotr', firstName: 'Piotr', lastName: 'Wiśniewski' }
const piotrLink = token()
const bartek = await child(
  almost.id,
  piotrParent,
  { firstName: 'Bartek', lastName: 'Wiśniewski' },
  'new',
  piotrLink,
)
await fillForm(piotrLink, ['14310278925'], {
  name: 'Wiśniewski Consulting',
  nip: '6311726535',
  address: 'ul. Firmowa 3, 42-421 Rzędkowice',
})
await payload.db.updateOne({
  collection: 'bookings',
  id: bartek.id,
  data: { depositDueAt: iso(-2) },
})

// Ewelina: Hania on the almost-full turnus with a place (the second taken),
// and Tymek waiting — the school moves him up.
const ewelinaParent = { name: 'ewelina', firstName: 'Ewelina', lastName: 'Zając' }
await child(
  almost.id,
  ewelinaParent,
  { firstName: 'Hania', lastName: 'Zając' },
  'confirmed',
  token(),
)
await child(almost.id, ewelinaParent, { firstName: 'Tymek', lastName: 'Zając' }, 'waitlist', null)

// Kasia: Kuba on the turnus starting soon, the form in and the deposit paid —
// the parent the draft before the camp goes to.
const kasiaParent = { name: 'kasia', firstName: 'Katarzyna', lastName: 'Lewandowska' }
const kasiaLink = token()
const kuba = await child(
  soon.id,
  kasiaParent,
  { firstName: 'Kuba', lastName: 'Lewandowski' },
  'new',
  kasiaLink,
)
await fillForm(kasiaLink, ['16212032113'])
await payload.db.updateOne({
  collection: 'bookings',
  id: kuba.id,
  data: { status: 'deposit', depositEmailAt: new Date().toISOString() },
})

const base = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
say()
say('## Camp test data ready')
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
  ['Anna', 'anna', 'ACCOUNT: Zosia + Staś, form not sent; Julka in the archive'],
  ['Jan', 'jan', 'no account: Ola, form sent, contract and payment details'],
  ['Piotr', 'piotr', 'no account: Bartek, company invoice, deposit LATE'],
  ['Ewelina', 'ewelina', 'no account: Hania with a place, Tymek on the waiting list'],
  ['Kasia', 'kasia', 'no account: Kuba, deposit paid, turnus in 10 days'],
  ['Nowy', 'nowy', 'does NOT exist — a sign-up from scratch'],
]
if (!onProduction) rows.unshift(['School panel', 'szkola', 'login at /admin'])
for (const [who, name, what] of rows) say(`| ${who} | \`${shown(name)}\` | ${what} |`)
say()
say(
  `Camp with the test turnusy: ${base}/obozy/${camp.slug} (sign-up: ${base}/obozy/${camp.slug}/zapis)`,
)
say(
  `Open: ${formatDateRange(open.startDate, open.endDate)} · almost full: ${formatDateRange(almost.startDate, almost.endDate)} · soon: ${formatDateRange(soon.startDate, soon.endDate)}`,
)
if (!onProduction) {
  say()
  say('Registration form links (the emails were not sent):')
  say(`- Anna: ${registrationUrl(annaLink)}`)
  say(`- Jan: ${registrationUrl(janLink)}`)
  say(`- Piotr: ${registrationUrl(piotrLink)}`)
}
finish()
