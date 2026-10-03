import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { FormDone } from '@/components/AccountForm'
import { Container } from '@/components/Ui'
import { accountPageMetadata, getCurrentCustomer } from '@/lib/auth'
import { STATUS_FOR_PARTICIPANT, isUpcoming, type BookingStatus } from '@/lib/bookings'
import { formatDateRange } from '@/lib/format'
import type { Session } from '@/payload-types'
import { LanguageForm } from './LanguageForm'
import { LogoutButton } from './LogoutButton'

export function generateMetadata() {
  return accountPageMetadata('Moje konto')
}

type Props = { searchParams: Promise<{ password?: string }> }

export default async function AccountPage({ searchParams }: Props) {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/logowanie?next=/konto')
  const { password } = await searchParams
  const { upcoming, archive } = await bookingsOf(customer.id)

  return (
    <main>
      <Container className="pb-16 pt-10 lg:pb-24 lg:pt-14">
        <div className="mx-auto flex max-w-[760px] flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[32px] leading-[1.1] lg:text-[40px]">Moje konto</h1>
              <p className="mt-2 text-[17px] text-rock-600">
                {customer.firstName} {customer.lastName} · {customer.email}
              </p>
            </div>
            <LogoutButton />
          </div>

          {password === 'set' && (
            <div className="rounded-2xl border border-rope bg-rope-soft p-5 text-rope-dark">
              <FormDone title="Nowe hasło ustawione. Możesz korzystać z konta." />
            </div>
          )}

          <section
            aria-labelledby="zapisy"
            className="rounded-2xl border border-rock-200 bg-white p-6 lg:p-8"
          >
            <h2 id="zapisy" className="text-[22px] leading-tight">
              Moje zapisy
            </h2>
            {upcoming.length === 0 && archive.length === 0 ? (
              <p className="mt-3 text-rock-600">
                Nie masz jeszcze zapisów. Gdy zapiszesz się na kurs albo obóz, zobaczysz tu termin i
                jego stan.
              </p>
            ) : (
              <>
                <BookingList
                  title="Nadchodzące"
                  items={upcoming}
                  empty="Brak nadchodzących zapisów."
                />
                {archive.length > 0 && <BookingList title="Archiwum" items={archive} />}
              </>
            )}
          </section>

          <section
            aria-labelledby="ustawienia"
            className="rounded-2xl border border-rock-200 bg-white p-6 lg:p-8"
          >
            <h2 id="ustawienia" className="text-[22px] leading-tight">
              Wiadomości od nas
            </h2>
            <LanguageForm current={customer.language} />
          </section>
        </div>
      </Container>
    </main>
  )
}

interface BookingRow {
  id: number
  title: string
  dates: string
  /** For ordering the upcoming list — the display string does not sort. */
  start: number
  status: BookingStatus
}

/**
 * The participant's own bookings, split into upcoming and archive (past
 * sessions and cancellations). The id comes from the login, never from the
 * address bar.
 *
 * Sessions are read separately with `joins: false`: populated through the
 * booking, a session would carry its `bookings` join — every OTHER
 * participant's name and phone on that date.
 */
async function bookingsOf(customerId: number) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'bookings',
    where: { customer: { equals: customerId } },
    depth: 0,
    limit: 200,
    sort: '-createdAt',
    overrideAccess: true,
  })
  const idOf = (s: number | Session) => (typeof s === 'object' ? s.id : s)
  const sessionIds = [...new Set(docs.map((b) => idOf(b.session)))]
  const sessions = sessionIds.length
    ? (
        await payload.find({
          collection: 'sessions',
          where: { id: { in: sessionIds } },
          depth: 1,
          joins: false,
          limit: sessionIds.length,
          overrideAccess: true,
        })
      ).docs
    : []
  const byId = new Map(sessions.map((s) => [s.id, s]))

  const now = new Date()
  const upcoming: BookingRow[] = []
  const archive: BookingRow[] = []
  for (const booking of docs) {
    const session = byId.get(idOf(booking.session))
    if (!session) continue
    const course = typeof session.course === 'object' ? session.course : null
    const camp = typeof session.camp === 'object' ? session.camp : null
    const row: BookingRow = {
      id: booking.id,
      title: course?.title ?? camp?.title ?? 'Termin',
      dates: formatDateRange(session.startDate, session.endDate),
      start: Date.parse(session.startDate),
      status: booking.status as BookingStatus,
    }
    if (booking.status !== 'cancelled' && isUpcoming(session, now)) upcoming.push(row)
    else archive.push(row)
  }
  upcoming.sort((a, b) => a.start - b.start)
  return { upcoming, archive }
}

function BookingList({
  title,
  items,
  empty,
}: {
  title: string
  items: BookingRow[]
  empty?: string
}) {
  return (
    <div className="mt-5">
      <h3 className="text-[15px] font-semibold text-rock-600">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-rock-600">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rock-100 px-4 py-3"
            >
              <span>
                <span className="block font-medium">{item.title}</span>
                <span className="text-sm tabular-nums text-rock-600">{item.dates}</span>
              </span>
              <span className="text-sm text-rock-600">{STATUS_FOR_PARTICIPANT[item.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
