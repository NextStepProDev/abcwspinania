/**
 * What the two test-data scripts share — courses (`courses.ts`, scenario
 * `docs/testy-reczne.html`) and camps (`camps.ts`, `docs/testy-obozy.html`).
 *
 * Every test address is an alias of ONE real inbox — `you+abctest-ola@…`
 * for courses, `you+abctestoboz-anna@…` for camps — so each account is
 * separate for the site, while every email the scenario triggers lands in
 * the tester's own mailbox. The tag is also how a script finds its own
 * records again; the two tags do not contain each other, so cleaning one
 * round never touches the other's data.
 *
 * The scripts send NOTHING (`payload.sendEmail` is replaced): emails come
 * only from what the tester clicks, against a server with a real Brevo key.
 *
 * PRODUCTION: only through the "Test data" workflow, which sets
 * `TEST_DATA_ON_PRODUCTION=yes`. There the scripts create no panel account,
 * take the password from `TEST_PASSWORD` and print no address and no token —
 * the repository is public, and so are the workflow's logs.
 */
import { appendFileSync } from 'node:fs'

import { getPayload, type CollectionSlug, type Payload } from 'payload'
import config from '@payload-config'

export const onProduction = process.env.NODE_ENV === 'production'
if (onProduction && process.env.TEST_DATA_ON_PRODUCTION !== 'yes') {
  throw new Error(
    'Test data on production runs only from the "Test data" workflow (TEST_DATA_ON_PRODUCTION=yes).',
  )
}

const inbox = (process.env.TEST_INBOX ?? '').trim().toLowerCase()
const at = inbox.indexOf('@')
if (at < 1 || inbox.includes('+')) {
  throw new Error('Set TEST_INBOX to your own address without a "+", e.g. TEST_INBOX=you@gmail.com')
}

/** Every tag a test address may carry — one per script. */
export const TEST_TAGS = ['+abctest-', '+abctestoboz-'] as const

/** The local test password — public, it is in this file. Production takes `TEST_PASSWORD`. */
export const LOCAL_PASSWORD = 'Testy-ABC-2026'
export const PASSWORD = onProduction ? (process.env.TEST_PASSWORD ?? '') : LOCAL_PASSWORD
if (PASSWORD.length < 10) {
  throw new Error('Set TEST_PASSWORD (at least 10 characters) — the password of the test accounts.')
}

/** `you+<tag><name>@…` — the address of one test person. */
export const addressWith = (tag: string) => (name: string) =>
  `${inbox.slice(0, at)}${tag}${name}${inbox.slice(at)}`

/** How an address appears in output: the full one locally, only its tag in public logs. */
export const shownWith = (tag: string) => (name: string) =>
  onProduction ? `${tag}${name}` : addressWith(tag)(name)

/** Any test address, of either script. */
export const isTestAddress = (email: unknown) =>
  typeof email === 'string' && TEST_TAGS.some((tag) => email.includes(tag))

/**
 * `clean` is a plain word, not `--clean`: `payload run` parses the command
 * line with minimist and passes on only the positional words — a flag never
 * reaches the script, which then re-seeded instead of cleaning.
 */
export const command = process.argv.includes('clean-all')
  ? 'clean-all'
  : process.argv.includes('clean')
    ? 'clean'
    : 'seed'

export const payload: Payload = await getPayload({ config })
payload.sendEmail = (async () => undefined) as Payload['sendEmail']

export const QUIET = { skipStatusEmail: true }
export const DAY = 86_400_000
const now = Date.now()
export const iso = (days: number) => new Date(now + days * DAY).toISOString()

/** The job summary on GitHub, the console locally. */
const summary: string[] = []
export const say = (line = '') => summary.push(line)

export function finish(code = 0): never {
  const text = summary.join('\n')
  console.log(`\n${text}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)
  process.exit(code)
}

/** Payload's bulk delete returns refusals instead of throwing — fail loudly. */
export async function removeWhere(collection: CollectionSlug, where: Record<string, unknown>) {
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

export async function findAll(collection: CollectionSlug, where: Record<string, unknown>) {
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

export type Leftovers = Partial<Record<CollectionSlug, number[]>>

/** Collection, with its name in the (Polish) panel — where to look the ids up. */
export const LABELS: Partial<Record<CollectionSlug, string>> = {
  customers: 'participant accounts (panel: Uczestnicy)',
  bookings: 'bookings (panel: Zapisy)',
  messages: 'messages (panel: Wiadomości)',
  newsletter: 'newsletter (panel: Newsletter)',
  broadcasts: 'broadcasts (panel: Wysyłki)',
}

export const polishTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(value))

/**
 * What testers add by hand without a tag (an account on their real address,
 * a phone booking on a real session) cannot be told from real data by its
 * content — only by WHEN it was made. The first seed of a round stores that
 * moment in `payload.kv` under `sinceKey` (kept across re-seeds); `clean`
 * lists what appeared since, by id only, and `clean-all` removes it and
 * closes the window.
 */
export async function reportLeftovers(sinceKey: string, extra: Leftovers, all: boolean) {
  const since = await payload.kv.get<string>(sinceKey)
  const began = since ? polishTime(since) : ''
  const rows = Object.entries(extra).filter(([, ids]) => ids.length > 0) as [
    CollectionSlug,
    number[],
  ][]
  if (!since) {
    say('No stored start of testing — nothing to check beyond the tag.')
  } else if (rows.length === 0) {
    say(`Since testing began (${began}) nothing has appeared without the tag.`)
  } else if (!all) {
    say(`Since testing began (${began}) this appeared WITHOUT the tag:`)
    for (const [collection, ids] of rows) {
      say(`- ${LABELS[collection]}: ${ids.length} (id: ${ids.join(', ')})`)
    }
    say('Check them in the panel. If they are all tests, run again with `clean-all`.')
  } else {
    for (const [collection, ids] of rows) {
      for (const id of ids) {
        if (collection === 'bookings') {
          await payload.delete({ collection, id, overrideAccess: true, context: QUIET })
        } else {
          await payload.delete({ collection, id, overrideAccess: true })
        }
      }
      say(`- removed ${LABELS[collection]}: ${ids.length} (id: ${ids.join(', ')})`)
    }
  }
  if (all) {
    await payload.kv.delete(sinceKey)
    say('Testing window closed — the next seed starts a new one.')
  }
}

/** Opens the round's window on the first seed (see `reportLeftovers`). */
export async function openWindow(sinceKey: string) {
  if (!(await payload.kv.get(sinceKey))) await payload.kv.set(sinceKey, new Date().toISOString())
}

/** Records made since `since` that no test tag covers, apart from `keep`'s exclusions. */
export async function untaggedSince(
  collection: CollectionSlug,
  since: string,
  keep: (row: Record<string, unknown>) => boolean = () => true,
) {
  return (await findAll(collection, { createdAt: { greater_than_equal: since } }))
    .filter((row) => !isTestAddress(row.email) && keep(row))
    .map((row) => Number(row.id))
}
