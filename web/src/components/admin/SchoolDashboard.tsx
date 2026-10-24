import type { Payload, TypedUser } from 'payload'

import { bookingsListUrl, listUrl, whereOf, type ListCondition } from '@/lib/adminListUrl'
import { ACTIVE_STATUSES } from '@/lib/bookings'
import { dashboardConditions, sessionBookingsConditions } from '@/lib/dashboardConditions'
import { formatDateRange } from '@/lib/format'

/**
 * What needs the school's attention, above Payload's list of collections on
 * the panel's home page (`admin.components.beforeDashboard`).
 *
 * Every number links to the matching filtered list — a ready-made view
 * instead of setting filters by hand. Server component: it reads the
 * database directly, with no API round trip.
 */

function startOfTodayUtc(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function SchoolDashboard({ payload, user }: { payload: Payload; user?: TypedUser }) {
  // The panel only lets school accounts in, but this reads personal data —
  // the check costs nothing.
  if (user?.collection !== 'users') return null

  // Anonymized bookings (`lib/expiry.ts`) are hidden from the list by its
  // base filter; the counts must agree with the list they link to.
  const count = async (collection: 'bookings' | 'messages', where: Record<string, unknown>) =>
    (
      await payload.count({
        collection,
        where: (collection === 'bookings'
          ? { and: [where, { anonymizedAt: { exists: false } }] }
          : where) as never,
        overrideAccess: true,
      })
    ).totalDocs

  const c = dashboardConditions(new Date())
  const tally = (conditions: ListCondition[]) => count('bookings', whereOf(conditions))
  const [
    newCourse,
    awaitingDeposit,
    waitingCourse,
    newCamp,
    campWithoutForm,
    campLateDeposit,
    waitingCamp,
    newMessages,
    emailIssues,
  ] = await Promise.all([
    tally(c.newCourse),
    tally(c.confirmedCourse),
    tally(c.waitingCourse),
    tally(c.newCamp),
    tally(c.campWithoutForm),
    tally(c.campLateDeposit),
    tally(c.waitingCamp),
    count('messages', { status: { equals: 'new' } }),
    tally(c.lostEmails),
  ])

  const { docs: sessions } = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { status: { in: ['open', 'waitlist'] } },
        { startDate: { greater_than_equal: startOfTodayUtc() } },
      ],
    },
    sort: 'startDate',
    limit: 12,
    depth: 1,
    joins: false,
    overrideAccess: true,
  })
  const occupancy = await Promise.all(
    sessions.map(async (s) => ({
      session: s,
      taken: await count('bookings', {
        and: [{ session: { equals: s.id } }, { status: { in: [...ACTIVE_STATUSES] } }],
      }),
      waiting: await count('bookings', {
        and: [{ session: { equals: s.id } }, { status: { equals: 'waitlist' } }],
      }),
    })),
  )

  type Tile = { label: string; hint: string; value: number; href: string }
  const courseTiles: Tile[] = [
    {
      label: 'Nowe zgłoszenia',
      hint: 'do potwierdzenia',
      value: newCourse,
      href: bookingsListUrl(c.newCourse),
    },
    {
      label: 'Potwierdzone',
      hint: 'czekają na zaliczkę',
      value: awaitingDeposit,
      href: bookingsListUrl(c.confirmedCourse),
    },
    {
      label: 'Lista rezerwowa',
      hint: 'czekają na miejsce',
      value: waitingCourse,
      href: bookingsListUrl(c.waitingCourse),
    },
  ]
  const campTiles: Tile[] = [
    {
      label: 'Nowe zgłoszenia',
      hint: 'dzieci zapisane na obóz',
      value: newCamp,
      href: bookingsListUrl(c.newCamp),
    },
    {
      label: 'Bez formularza',
      hint: 'rodzic nie wypełnił formularza rejestracyjnego',
      value: campWithoutForm,
      href: bookingsListUrl(c.campWithoutForm),
    },
    {
      label: 'Zaliczka po terminie',
      hint: 'minęło 7 dni, zaliczki nie zaznaczono',
      value: campLateDeposit,
      href: bookingsListUrl(c.campLateDeposit),
    },
    {
      label: 'Lista rezerwowa',
      hint: 'dzieci czekają na miejsce',
      value: waitingCamp,
      href: bookingsListUrl(c.waitingCamp),
    },
  ]
  const otherTiles: Tile[] = [
    {
      label: 'Maile, które nie doszły',
      hint: 'adresat nie wie — odezwij się sam',
      value: emailIssues,
      href: bookingsListUrl(c.lostEmails),
    },
    {
      label: 'Nowe wiadomości',
      hint: 'z formularza',
      value: newMessages,
      href: listUrl('messages', [{ status: { equals: 'new' } }]),
    },
  ]

  const tileGrid = (tiles: Tile[]) => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--base)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      }}
    >
      {tiles.map((t) => (
        <a
          key={t.label}
          href={t.href}
          style={{
            display: 'block',
            padding: 'var(--base)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-m, 4px)',
            textDecoration: 'none',
            background: t.value > 0 ? 'var(--theme-elevation-50)' : 'transparent',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 600 }}>{t.value}</div>
          <div style={{ fontWeight: 600 }}>{t.label}</div>
          <div style={{ fontSize: 13, color: 'var(--theme-elevation-500)' }}>{t.hint}</div>
        </a>
      ))}
    </div>
  )
  const groupTitle = { margin: 'calc(var(--base) * 1.25) 0 calc(var(--base) / 2)' }

  return (
    <section style={{ marginBottom: 'calc(var(--base) * 2)' }} aria-label="Do zrobienia">
      <h2 style={{ marginBottom: 'var(--base)' }}>Do zrobienia</h2>
      <h3 style={groupTitle}>Kursy</h3>
      {tileGrid(courseTiles)}
      <h3 style={groupTitle}>Obozy</h3>
      {tileGrid(campTiles)}
      <h3 style={groupTitle}>Wszystko</h3>
      {tileGrid(otherTiles)}

      <h3 style={{ margin: 'calc(var(--base) * 1.5) 0 calc(var(--base) / 2)' }}>
        Najbliższe terminy
      </h3>
      {occupancy.length === 0 ? (
        <p style={{ color: 'var(--theme-elevation-500)' }}>Brak otwartych terminów.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 13, color: 'var(--theme-elevation-500)' }}>
              <th style={{ padding: '6px 8px' }}>Termin</th>
              <th style={{ padding: '6px 8px' }}>Kurs / obóz</th>
              <th style={{ padding: '6px 8px' }}>Zajęte</th>
              <th style={{ padding: '6px 8px' }}>Rezerwowi</th>
              <th style={{ padding: '6px 8px' }} />
            </tr>
          </thead>
          <tbody>
            {occupancy.map(({ session, taken, waiting: onList }) => {
              const course = typeof session.course === 'object' ? session.course : null
              const camp = typeof session.camp === 'object' ? session.camp : null
              return (
                <tr key={session.id} style={{ borderTop: '1px solid var(--theme-elevation-100)' }}>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                    <a href={`/admin/collections/sessions/${session.id}`}>
                      {formatDateRange(session.startDate, session.endDate)}
                    </a>
                  </td>
                  <td style={{ padding: '6px 8px' }}>{course?.title ?? camp?.title ?? '—'}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                    {typeof session.capacity === 'number'
                      ? `${taken} / ${session.capacity}`
                      : `${taken} (bez limitu)`}
                  </td>
                  <td style={{ padding: '6px 8px' }}>{onList || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <a
                      href={bookingsListUrl(
                        sessionBookingsConditions(session.id, camp ? 'camp' : 'course'),
                      )}
                    >
                      zapisani
                    </a>
                    {' · '}
                    <a href={`/api/sessions/${session.id}/export`}>Excel</a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
