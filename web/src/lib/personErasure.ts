import type { Payload, PayloadRequest } from 'payload'

import { isAdmin } from '@/lib/access'
import { personDataDocument, type PersonDataCopy } from '@/lib/personDataDocument'
import { checkEmail } from '@/lib/validation'

/**
 * "Usuń wszystkie dane osoby" — a person's request to be forgotten, done by
 * the school in the panel (Uczestnicy, `ErasePersonPanel`), without asking
 * the developer. Decided 10.10.2026.
 *
 * Everything carrying the address goes: the account and its sessions, the
 * bookings (also those made without logging in), contact-form messages, the
 * newsletter entry, and the recipient rows of broadcasts already sent — a
 * table the panel does not show, the reason this tool exists. Admin accounts
 * (`users`) are never touched. Encrypted backups keep a copy until they age
 * out (privacy policy).
 *
 * Two steps, by design: GET shows what would go, POST erases — and only when
 * `confirm` repeats the address. A participant's whole history must not go on
 * one misclick in the wrong row.
 *
 * Matching ignores case and spaces: bookings and accounts store addresses in
 * lower case, but a message typed "Ola@Gmail.com" must go too. Found with
 * `like`, then compared exactly, so "ola@gmail.com" never takes
 * "ola@gmail.com.pl" or "aola@gmail.com" with it.
 */

type Collection = 'customers' | 'bookings' | 'messages' | 'newsletter' | 'broadcast-deliveries'

const COLLECTIONS: Collection[] = [
  'bookings',
  'messages',
  'newsletter',
  'broadcast-deliveries',
  'customers',
]

export interface ErasureSummary {
  email: string
  account: { email: string; name: string; verified: boolean } | null
  bookings: number
  upcomingBookings: string[]
  messages: number
  newsletter: number
  deliveries: number
}

export const normalizeAddress = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

/** The ids of the rows in `collection` whose address is exactly `email`. */
async function idsWithAddress(
  payload: Payload,
  collection: Collection,
  email: string,
): Promise<{ id: number; email: string; label?: string | null }[]> {
  const { docs } = await payload.find({
    collection,
    where: { email: { like: email } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    // Only what is compared — no join fields, no populated relations.
    select: { email: true, ...(collection === 'bookings' ? { label: true } : {}) } as never,
  })
  return (docs as { id: number; email: string; label?: string | null }[]).filter(
    (doc) => normalizeAddress(doc.email) === email,
  )
}

export async function erasureSummary(payload: Payload, email: string): Promise<ErasureSummary> {
  const [customers, bookings, messages, newsletter, deliveries] = await Promise.all(
    (['customers', 'bookings', 'messages', 'newsletter', 'broadcast-deliveries'] as const).map(
      (collection) => idsWithAddress(payload, collection, email),
    ),
  )
  const account = customers[0]
    ? await payload.findByID({
        collection: 'customers',
        id: customers[0].id,
        depth: 0,
        overrideAccess: true,
      })
    : null
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const upcoming = bookings.length
    ? await payload.find({
        collection: 'bookings',
        where: {
          and: [
            { id: { in: bookings.map((b) => b.id) } },
            { 'session.startDate': { greater_than_equal: today.toISOString() } },
            { status: { not_equals: 'cancelled' } },
          ],
        },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
    : { docs: [] }
  return {
    email,
    account: account
      ? {
          email: account.email,
          name: [account.firstName, account.lastName].filter(Boolean).join(' '),
          verified: Boolean(account._verified),
        }
      : null,
    bookings: bookings.length,
    upcomingBookings: upcoming.docs.map((b) => b.label ?? `zapis ${b.id}`),
    messages: messages.length,
    newsletter: newsletter.length,
    deliveries: deliveries.length,
  }
}

/** Deletes every row carrying `email`; returns how many went from each place. */
export async function erasePerson(
  payload: Payload,
  email: string,
): Promise<Record<Collection, number>> {
  const erased = {} as Record<Collection, number>
  // Bookings before the account (the account's deletion would only unlink
  // them); the account last, so a failure half-way leaves it findable for a
  // second try. Bookings are deleted the ordinary way: an upcoming one frees
  // its place and the school hears about it if someone is waiting.
  for (const collection of COLLECTIONS) {
    const rows = await idsWithAddress(payload, collection, email)
    for (const row of rows) {
      await payload.delete({
        collection,
        id: row.id,
        overrideAccess: true,
        context: { skipStatusEmail: true },
      })
    }
    erased[collection] = rows.length
  }
  return erased
}

// --- a copy of the data (right of access) ---------------------------------------

/** Picks the named fields that are present, so nothing else — no key — slips in. */
function pick<T extends Record<string, unknown>>(doc: T, fields: string[]) {
  return Object.fromEntries(fields.filter((f) => doc[f] !== undefined).map((f) => [f, doc[f]]))
}

/**
 * Everything we hold about the person at `email`, for "Pobierz kopię danych
 * osoby" — a person's right to a copy of their data (and to take it
 * elsewhere), answered by the school from the panel.
 *
 * Built from an ALLOW-list of fields per collection, never from whole
 * documents: an account also holds a password hash, a salt, login sessions
 * and tokens, and a newsletter entry its unsubscribe token. Those are keys,
 * not the person's data, and must not leave in a file sent by email.
 *
 * ⚠️ A field added here needs a row in `personDataDocument.ts` too — the
 * readable copy lists its fields by name.
 */
export async function personDataCopy(payload: Payload, email: string): Promise<PersonDataCopy> {
  const byIds = async (collection: Collection, depth = 0) => {
    const ids = (await idsWithAddress(payload, collection, email)).map((r) => r.id)
    if (ids.length === 0) return []
    const { docs } = await payload.find({
      collection,
      where: { id: { in: ids } },
      pagination: false,
      depth,
      overrideAccess: true,
    })
    return docs as unknown as Record<string, unknown>[]
  }
  const [accounts, bookings, messages, newsletter, deliveries] = await Promise.all([
    byIds('customers'),
    byIds('bookings', 1),
    byIds('messages'),
    byIds('newsletter'),
    byIds('broadcast-deliveries', 1),
  ])
  const label = (value: unknown) =>
    value && typeof value === 'object'
      ? ((value as { label?: string; subject?: string }).label ??
        (value as { subject?: string }).subject ??
        null)
      : null
  return {
    email,
    madeAt: new Date().toISOString(),
    account: accounts[0]
      ? pick(accounts[0], [
          'email',
          'firstName',
          'lastName',
          'phone',
          'language',
          '_verified',
          'consentText',
          'consentDate',
          'createdAt',
          'updatedAt',
        ])
      : null,
    bookings: bookings.map((b) => ({
      ...pick(b, [
        'firstName',
        'lastName',
        'email',
        'phone',
        'childFirstName',
        'childLastName',
        'childBirthDate',
        'photoConsent',
        'photoConsentText',
        'status',
        'notes',
        'language',
        'consentText',
        'consentDate',
        'createdAt',
      ]),
      session: label(b.session),
    })),
    messages: messages.map((m) =>
      pick(m, [
        'name',
        'email',
        'phone',
        'topic',
        'preferredDate',
        'message',
        'language',
        'consentText',
        'consentDate',
        'createdAt',
      ]),
    ),
    newsletter: newsletter.map((n) =>
      pick(n, [
        'email',
        'status',
        'language',
        'consentText',
        'consentDate',
        'confirmedAt',
        'unsubscribedAt',
        'createdAt',
      ]),
    ),
    messagesSentToThem: deliveries.map((d) => ({
      ...pick(d, ['status', 'sentAt']),
      subject: label(d.broadcast),
    })),
  }
}

// --- panel endpoints (`Customers.endpoints`) -----------------------------------

const forbidden = () => Response.json({ error: 'Tylko dla konta szkoły.' }, { status: 403 })

export async function erasureSummaryHandler(req: PayloadRequest): Promise<Response> {
  if (!isAdmin({ req })) return forbidden()
  const email = normalizeAddress(new URL(req.url ?? '', 'http://x').searchParams.get('email'))
  const invalid = checkEmail(email)
  if (invalid) return Response.json({ error: invalid }, { status: 400 })
  return Response.json(await erasureSummary(req.payload, email))
}

export async function eraseHandler(req: PayloadRequest): Promise<Response> {
  if (!isAdmin({ req })) return forbidden()
  const body = (await req.json?.().catch(() => null)) as {
    email?: unknown
    confirm?: unknown
  } | null
  const email = normalizeAddress(body?.email)
  const invalid = checkEmail(email)
  if (invalid) return Response.json({ error: invalid }, { status: 400 })
  if (normalizeAddress(body?.confirm) !== email) {
    return Response.json(
      { error: 'Potwierdzenie nie zgadza się z adresem — nic nie usunięto.' },
      { status: 400 },
    )
  }
  const erased = await erasePerson(req.payload, email)
  // Who erased and how much — not whose data: the log must not keep the
  // address the person asked to have forgotten.
  req.payload.logger.info({ by: req.user?.email, erased }, 'Erased a person’s data on request')
  return Response.json({ erased })
}

export async function personDataHandler(req: PayloadRequest): Promise<Response> {
  if (!isAdmin({ req })) return forbidden()
  const email = normalizeAddress(new URL(req.url ?? '', 'http://x').searchParams.get('email'))
  const invalid = checkEmail(email)
  if (invalid) return Response.json({ error: invalid }, { status: 400 })
  const copy = await personDataCopy(req.payload, email)
  // A readable document by default — what the person gets back; `?format=json`
  // for moving the data to another company (the right to data portability).
  const json = new URL(req.url ?? '', 'http://x').searchParams.get('format') === 'json'
  const name = `dane-${email.replace(/[^a-z0-9.@+-]/g, '_')}.${json ? 'json' : 'html'}`
  return new Response(json ? JSON.stringify(copy, null, 2) : personDataDocument(copy), {
    headers: {
      'content-type': json ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'content-disposition': `attachment; filename="${name}"`,
      'cache-control': 'no-store',
    },
  })
}
