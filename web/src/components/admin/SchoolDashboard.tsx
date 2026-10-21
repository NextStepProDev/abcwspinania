import type { Payload, TypedUser } from 'payload'

import { ACTIVE_STATUSES } from '@/lib/bookings'
import { formatDateRange } from '@/lib/format'

/**
 * What needs the school's attention, above Payload's list of collections on
 * the panel's home page (`admin.components.beforeDashboard`).
 *
 * Every number links to the matching filtered list — a ready-made view
 * instead of setting filters by hand. Server component: it reads the
 * database directly, with no API round trip.
 */

/** A list in the panel, pre-filtered through its own `where` query. */
function listUrl(collection: string, where: Record<string, unknown>): string {
  const params = new URLSearchParams()
  const add = (prefix: string, value: unknown) => {
    // Arrays by index (`where[and][0][…]`), the way Payload's list reads them.
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) add(`${prefix}[${k}]`, v)
    } else {
      params.append(prefix, String(value))
    }
  }
  add('where', where)
  return `/admin/collections/${collection}?${params.toString()}`
}

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

  // An email to the participant that did not go out (`recordEmailIssue`)
  // and that the school has not dealt with yet.
  const lostEmails = {
    and: [{ emailIssueAt: { exists: true } }, { emailIssueHandled: { not_equals: true } }],
  }
  const course = { kind: { equals: 'course' } }
  const camp = { kind: { equals: 'camp' } }
  const both = (a: Record<string, unknown>, b: Record<string, unknown>) => ({ and: [a, b] })
  // A camp booking with a place whose parent has not sent the registration
  // form yet, and one whose deposit deadline passed without the deposit
  // (`lib/campPayment.ts`) — the two things Krzysiek follows up by phone.
  // Only camps still ahead: after one starts, neither is anything to chase.
  const ahead = { 'session.startDate': { greater_than: new Date().toISOString() } }
  const withoutForm = both(camp, {
    and: [{ status: { in: [...ACTIVE_STATUSES] } }, { registeredAt: { exists: false } }, ahead],
  })
  const lateDeposit = both(camp, {
    and: [
      { status: { in: ['new', 'confirmed'] } },
      { depositDueAt: { less_than: new Date().toISOString() } },
      ahead,
    ],
  })
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
    count('bookings', both(course, { status: { equals: 'new' } })),
    count('bookings', both(course, { status: { equals: 'confirmed' } })),
    count('bookings', both(course, { status: { equals: 'waitlist' } })),
    count('bookings', both(camp, { status: { equals: 'new' } })),
    count('bookings', withoutForm),
    count('bookings', lateDeposit),
    count('bookings', both(camp, { status: { equals: 'waitlist' } })),
    count('messages', { status: { equals: 'new' } }),
    count('bookings', lostEmails),
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
      href: listUrl('bookings', both(course, { status: { equals: 'new' } })),
    },
    {
      label: 'Potwierdzone',
      hint: 'czekają na zaliczkę',
      value: awaitingDeposit,
      href: listUrl('bookings', both(course, { status: { equals: 'confirmed' } })),
    },
    {
      label: 'Lista rezerwowa',
      hint: 'czekają na miejsce',
      value: waitingCourse,
      href: listUrl('bookings', both(course, { status: { equals: 'waitlist' } })),
    },
  ]
  const campTiles: Tile[] = [
    {
      label: 'Nowe zgłoszenia',
      hint: 'dzieci zapisane na obóz',
      value: newCamp,
      href: listUrl('bookings', both(camp, { status: { equals: 'new' } })),
    },
    {
      label: 'Bez formularza',
      hint: 'rodzic nie wypełnił formularza rejestracyjnego',
      value: campWithoutForm,
      href: listUrl('bookings', withoutForm),
    },
    {
      label: 'Zaliczka po terminie',
      hint: 'minęło 7 dni, zaliczki nie zaznaczono',
      value: campLateDeposit,
      href: listUrl('bookings', lateDeposit),
    },
    {
      label: 'Lista rezerwowa',
      hint: 'dzieci czekają na miejsce',
      value: waitingCamp,
      href: listUrl('bookings', both(camp, { status: { equals: 'waitlist' } })),
    },
  ]
  const otherTiles: Tile[] = [
    {
      label: 'Maile, które nie doszły',
      hint: 'adresat nie wie — odezwij się sam',
      value: emailIssues,
      href: listUrl('bookings', lostEmails),
    },
    {
      label: 'Nowe wiadomości',
      hint: 'z formularza',
      value: newMessages,
      href: listUrl('messages', { status: { equals: 'new' } }),
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
                      href={listUrl('bookings', {
                        and: [
                          { session: { equals: session.id } },
                          { kind: { equals: camp ? 'camp' : 'course' } },
                        ],
                      })}
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
