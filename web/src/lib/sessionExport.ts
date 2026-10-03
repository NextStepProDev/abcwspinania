import type { PayloadRequest } from 'payload'

import { isAdmin } from '@/lib/access'
import { BOOKING_STATUS_OPTIONS, type BookingStatus } from '@/lib/bookings'
import { csvCell, csvPhone, toCsv } from '@/lib/csv'

/**
 * GET /api/sessions/:id/export — the participant list of one session as a
 * CSV for Polish Excel (`lib/csv.ts`). School accounts only: it is every
 * participant's name, phone and email.
 *
 * Every booking is in it, ordered the way the school reads a list: places
 * first (in order of booking), then the waiting list, then cancellations —
 * with the status in its own column, so a filter in Excel drops what is not
 * wanted.
 */

const ORDER: Record<BookingStatus, number> = {
  paid: 0,
  deposit: 0,
  confirmed: 0,
  new: 0,
  waitlist: 1,
  cancelled: 2,
}

const LABEL = Object.fromEntries(BOOKING_STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<
  BookingStatus,
  string
>

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(iso))
}

export async function exportSessionHandler(req: PayloadRequest): Promise<Response> {
  if (!isAdmin({ req })) return new Response('Forbidden', { status: 403 })
  const id = Number(req.routeParams?.id)
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 })

  const session = await req.payload
    .findByID({ collection: 'sessions', id, depth: 1, joins: false, req, overrideAccess: true })
    .catch(() => null)
  if (!session) return new Response('Not found', { status: 404 })

  const { docs } = await req.payload.find({
    collection: 'bookings',
    where: { session: { equals: id } },
    sort: 'createdAt',
    limit: 1000,
    depth: 0,
    req,
    overrideAccess: true,
  })
  const bookings = [...docs].sort(
    (a, b) => ORDER[a.status as BookingStatus] - ORDER[b.status as BookingStatus],
  )

  const header = [
    'Lp.',
    'Imię',
    'Nazwisko',
    'Telefon',
    'E-mail',
    'Status',
    'Uwagi od kursanta',
    'Data zapisu',
  ]
  const rows = bookings.map((b, i) => [
    String(i + 1),
    csvCell(b.firstName),
    csvCell(b.lastName),
    csvPhone(b.phone),
    csvCell(b.email),
    csvCell(LABEL[b.status as BookingStatus] ?? b.status),
    csvCell(b.notes),
    csvCell(formatDateTime(b.createdAt)),
  ])

  const course = typeof session.course === 'object' ? session.course : null
  const camp = typeof session.camp === 'object' ? session.camp : null
  const slug = course?.slug ?? camp?.slug ?? 'termin'
  const date = session.startDate.slice(0, 10)
  return new Response(toCsv([header.map((h) => csvCell(h)), ...rows]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // ASCII-only file name: the slug and the date are ASCII by construction.
      'Content-Disposition': `attachment; filename="zapisy-${slug}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
