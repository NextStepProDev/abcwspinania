import type { PayloadRequest } from 'payload'

import { isAdmin } from '@/lib/access'
import { BOOKING_STATUS_OPTIONS, type BookingStatus } from '@/lib/bookings'
import { csvCell, csvPhone, toCsv } from '@/lib/csv'
import type { Booking } from '@/payload-types'

/**
 * GET /api/sessions/:id/export — the participant list of one session as a
 * CSV for Polish Excel (`lib/csv.ts`). School accounts only: it is every
 * participant's name, phone and email.
 *
 * Every booking is in it, ordered the way the school reads a list: places
 * first (in order of booking), then the waiting list, then cancellations —
 * with the status in its own column, so a filter in Excel drops what is not
 * wanted. A camp's turnus has its own columns (`campTable`).
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

function formatDay(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeZone: 'Europe/Warsaw' }).format(
    new Date(iso),
  )
}

/**
 * A camp turnus's list: the child first (that is who the school counts and
 * looks after), with the registration form's answers — height for the
 * T-shirts, allergies, medication, diet, conditions — and whom not to show
 * in photos; then the parent to call, the money and the paperwork.
 *
 * The health answers leave the panel in this file, on purpose: the list is
 * for the camp itself. The daily sweep deletes them in the panel a month
 * after the camp; a downloaded copy is the school's to delete.
 */
async function campTable(req: PayloadRequest, bookings: Booking[]) {
  const { docs: registrations } = bookings.length
    ? await req.payload.find({
        collection: 'camp-registrations',
        where: { booking: { in: bookings.map((b) => b.id) } },
        pagination: false,
        depth: 0,
        req,
        overrideAccess: true,
      })
    : { docs: [] }
  const formOf = (b: Booking) =>
    registrations.find((r) => (typeof r.booking === 'object' ? r.booking.id : r.booking) === b.id)
  const yesNo = (v: unknown) => (v ? 'tak' : 'nie')
  const header = [
    'Lp.',
    'Imię dziecka',
    'Nazwisko dziecka',
    'Data urodzenia',
    'Wzrost (cm)',
    'Uczulenia',
    'Leki',
    'Dieta',
    'Choroby i przeciwwskazania',
    'Zgoda na zdjęcia',
    'Status',
    'Formularz rejestracyjny',
    'Termin zaliczki',
    'Rodzic',
    'Telefon',
    'E-mail',
    'Adres',
    'Faktura',
    'Uwagi',
    'Data zapisu',
  ]
  const rows = bookings.map((b, i) => {
    const form = formOf(b)
    const address = [b.addressStreet, [b.addressPostcode, b.addressCity].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ')
    return [
      String(i + 1),
      csvCell(b.childFirstName),
      csvCell(b.childLastName),
      csvCell(formatDay(b.childBirthDate)),
      csvCell(form?.heightCm ? String(form.heightCm) : ''),
      csvCell(form?.allergies),
      csvCell(form?.medications),
      csvCell(form?.diet),
      csvCell(form?.conditions),
      csvCell(yesNo(b.photoConsent)),
      csvCell(LABEL[b.status as BookingStatus] ?? b.status),
      csvCell(form ? 'wypełniony' : 'brak'),
      csvCell(formatDay(b.depositDueAt)),
      csvCell(`${b.firstName} ${b.lastName}`),
      csvPhone(b.phone),
      csvCell(b.email),
      csvCell(address),
      csvCell(yesNo(b.invoiceRequested)),
      csvCell(b.notes),
      csvCell(formatDateTime(b.createdAt)),
    ]
  })
  return { header, rows }
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
    // Anonymized rows have no one to list (`lib/expiry.ts`).
    where: { and: [{ session: { equals: id } }, { anonymizedAt: { exists: false } }] },
    sort: 'createdAt',
    limit: 1000,
    depth: 0,
    req,
    overrideAccess: true,
  })
  const bookings = [...docs].sort(
    (a, b) => ORDER[a.status as BookingStatus] - ORDER[b.status as BookingStatus],
  )

  const course = typeof session.course === 'object' ? session.course : null
  const camp = typeof session.camp === 'object' ? session.camp : null
  const { header, rows } = camp
    ? await campTable(req, bookings)
    : {
        header: [
          'Lp.',
          'Imię',
          'Nazwisko',
          'Telefon',
          'E-mail',
          'Status',
          'Uwagi od kursanta',
          'Data zapisu',
        ],
        rows: bookings.map((b, i) => [
          String(i + 1),
          csvCell(b.firstName),
          csvCell(b.lastName),
          csvPhone(b.phone),
          csvCell(b.email),
          csvCell(LABEL[b.status as BookingStatus] ?? b.status),
          csvCell(b.notes),
          csvCell(formatDateTime(b.createdAt)),
        ]),
      }
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
