import type { Payload, PayloadRequest } from 'payload'

import { isAdmin } from '@/lib/access'
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
