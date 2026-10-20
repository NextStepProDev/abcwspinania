import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

/**
 * The integration tests' own small runner (`npm run test:integration`).
 *
 * Why not `node:test`: the tests run inside `payload run` (it loads `.env`,
 * resolves the `@/` aliases and gives a real Payload against a real
 * database, with no new dependency). `payload run` calls `process.exit(0)`
 * the moment the script's import settles — `node:test` would be cut off
 * mid-run and every failure would end in exit code 0. Here every test is
 * awaited in order and the exit code is set explicitly.
 *
 * NO REAL EMAIL, twice over: the npm script empties `BREVO_API_KEY` (Payload
 * falls back to the console), and `payload.sendEmail` is replaced by an
 * in-memory outbox the tests read. Over HTTP the tests read, get refused
 * and unsubscribe from the newsletter — nothing that sends email goes
 * through the running server, whose emails this process cannot stop.
 *
 * Every record is tagged and deleted at the end, so the tests can run
 * against a development database without leaving anything behind.
 */

export interface SentEmail {
  to: string
  subject: string
  text: string
  headers?: Record<string, string>
}

type Cleanup = () => Promise<unknown>

const tests: { name: string; fn: () => Promise<void> }[] = []
const cleanups: Cleanup[] = []

export const tag = `it${Date.now().toString(36)}`
export const BASE_URL = (process.env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
export const outbox: SentEmail[] = []

let failNext: Error | null = null

/** The next email(s) "fail" with this error until reset with `null`. */
export function failEmails(error: Error | null) {
  failNext = error
}

export const payload: Payload = await getPayload({ config })
payload.sendEmail = (async (message: Record<string, unknown>) => {
  if (failNext) throw failNext
  outbox.push({
    to: String(message.to),
    subject: String(message.subject),
    text: String(message.text ?? ''),
    headers: message.headers as Record<string, string> | undefined,
  })
}) as Payload['sendEmail']

export function test(name: string, fn: () => Promise<void>) {
  tests.push({ name, fn })
}

/** Runs once, after ALL tests, newest first — register right after creating. */
export function cleanup(fn: Cleanup) {
  cleanups.push(fn)
}

/**
 * A delete by `where` that FAILS LOUDLY. Payload's bulk delete does not
 * throw — it returns the refusals in `errors` — so a broadcast still
 * "sending" (which refuses deletion) stayed in the database while the run
 * reported a clean finish, and jammed the next run's queue.
 */
export async function removeWhere(
  collection: Parameters<Payload['delete']>[0]['collection'],
  where: Record<string, unknown>,
  context?: Record<string, unknown>,
) {
  const { errors } = await payload.delete({
    collection,
    where: where as never,
    overrideAccess: true,
    context,
  })
  if (errors.length) {
    throw new Error(`could not delete from ${collection}: ${JSON.stringify(errors)}`)
  }
}

export function email(name: string): string {
  return `${tag}-${name}@example.invalid`
}

export async function http(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init
  const headers = new Headers(rest.headers)
  if (token) headers.set('Authorization', `JWT ${token}`)
  if (rest.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  return fetch(`${BASE_URL}${path}`, { ...rest, headers })
}

// --- fixtures -------------------------------------------------------------------

let adminNumber = 0

export async function makeAdmin(): Promise<{ id: number; email: string; token: string }> {
  adminNumber += 1
  const address = email(`admin${adminNumber}`)
  const password = 'integration-test-password'
  const admin = await payload.create({
    collection: 'users',
    data: { email: address, password } as never,
    overrideAccess: true,
  })
  cleanup(() => payload.delete({ collection: 'users', id: admin.id, overrideAccess: true }))
  const { token } = await payload.login({ collection: 'users', data: { email: address, password } })
  return { id: admin.id, email: address, token: token! }
}

export async function makeCustomer(name: string) {
  const address = email(name)
  const password = 'integration-test-password'
  const customer = await payload.create({
    collection: 'customers',
    data: {
      email: address,
      password,
      firstName: name,
      lastName: 'Test',
      phone: '+48600100200',
      language: 'pl',
      consentText: 'test',
      consentDate: new Date().toISOString(),
      _verified: true,
    } as never,
    overrideAccess: true,
    disableVerificationEmail: true,
  })
  // By `where`: a test may have deleted the account already.
  cleanup(() => removeWhere('customers', { id: { equals: customer.id } }))
  const { token } = await payload.login({
    collection: 'customers',
    data: { email: address, password },
  })
  return { ...customer, token: token! }
}

let courseNumber = 0

export async function makeCourse(published = true) {
  courseNumber += 1
  const course = await payload.create({
    collection: 'courses',
    data: {
      title: `Kurs testowy ${tag} ${courseNumber}`,
      slug: `${tag}-${courseNumber}`,
      _status: published ? 'published' : 'draft',
    } as never,
    overrideAccess: true,
  })
  cleanup(() => payload.delete({ collection: 'courses', id: course.id, overrideAccess: true }))
  return course
}

let campNumber = 0

export async function makeCamp({
  published = true,
  kind = 'camp',
}: { published?: boolean; kind?: 'camp' | 'trip' | 'classes' } = {}) {
  campNumber += 1
  const camp = await payload.create({
    collection: 'camps',
    data: {
      title: `Obóz testowy ${tag} ${campNumber}`,
      slug: `${tag}-camp-${campNumber}`,
      kind,
      _status: published ? 'published' : 'draft',
    } as never,
    overrideAccess: true,
  })
  cleanup(() => payload.delete({ collection: 'camps', id: camp.id, overrideAccess: true }))
  return camp
}

export async function makeSession(
  courseId: number,
  {
    capacity = 5,
    daysAhead = 20,
    camp = false,
  }: { capacity?: number | null; daysAhead?: number; camp?: boolean } = {},
) {
  const start = new Date(Date.now() + daysAhead * 86_400_000)
  const session = await payload.create({
    collection: 'sessions',
    data: {
      [camp ? 'camp' : 'course']: courseId,
      startDate: start.toISOString(),
      status: 'open',
      capacity,
    } as never,
    overrideAccess: true,
  })
  // Bookings first (the session refuses deletion while it has any), then the session.
  cleanup(async () => {
    await removeWhere('bookings', { session: { equals: session.id } }, { skipStatusEmail: true })
    await payload.delete({ collection: 'sessions', id: session.id, overrideAccess: true })
  })
  return session
}

export async function makeBooking(
  sessionId: number,
  name: string,
  extra: Record<string, unknown> = {},
) {
  return payload.create({
    collection: 'bookings',
    data: {
      session: sessionId,
      status: 'confirmed',
      firstName: name,
      lastName: 'Test',
      email: email(name),
      phone: '+48600100200',
      language: 'pl',
      consentText: 'test',
      consentDate: new Date().toISOString(),
      ...extra,
    } as never,
    overrideAccess: true,
    context: { skipStatusEmail: true },
  })
}

/** Rich text with one paragraph — what the editor stores. */
export function richText(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          children: [
            { type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' },
          ],
        },
      ],
    },
  }
}

// --- running ------------------------------------------------------------------

export async function run(): Promise<never> {
  let failed = 0
  const serverUp = await fetch(`${BASE_URL}/api/users/me`).then(
    () => true,
    () => false,
  )
  if (!serverUp) {
    console.error(
      `✖ No server at ${BASE_URL} — start it (npm run dev) or set TEST_BASE_URL. The HTTP tests need it.`,
    )
    await payload.destroy()
    process.exit(1)
  }
  for (const { name, fn } of tests) {
    const started = Date.now()
    failEmails(null)
    try {
      await fn()
      console.log(`✔ ${name} (${Date.now() - started} ms)`)
    } catch (error) {
      failed += 1
      console.error(
        `✖ ${name}\n  ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
      )
    }
  }
  // A failed cleanup fails the run too: leftovers in a development database
  // are how the next run starts from a state nobody chose.
  let leftovers = 0
  for (const fn of cleanups.reverse()) {
    await fn().catch((error) => {
      leftovers += 1
      console.error(`✖ cleanup failed: ${error}`)
    })
  }
  console.log(`\n${tests.length - failed} passed, ${failed} failed, ${leftovers} cleanup errors`)
  await payload.destroy()
  process.exit(failed || leftovers ? 1 : 0)
}
