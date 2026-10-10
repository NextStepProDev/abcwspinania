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
  const [newBookings, awaitingDeposit, waiting, newMessages, emailIssues] = await Promise.all([
    count('bookings', { status: { equals: 'new' } }),
    count('bookings', { status: { equals: 'confirmed' } }),
    count('bookings', { status: { equals: 'waitlist' } }),
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
    limit: 8,
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

  const tiles = [
    {
      label: 'Nowe zgłoszenia',
      hint: 'do potwierdzenia',
      value: newBookings,
      href: listUrl('bookings', { status: { equals: 'new' } }),
    },
    {
      label: 'Potwierdzone',
      hint: 'czekają na zaliczkę',
      value: awaitingDeposit,
      href: listUrl('bookings', { status: { equals: 'confirmed' } }),
    },
    {
      label: 'Lista rezerwowa',
      hint: 'czekają na miejsce',
      value: waiting,
      href: listUrl('bookings', { status: { equals: 'waitlist' } }),
    },
    {
      label: 'Maile, które nie doszły',
      hint: 'kursant nie wie — odezwij się sam',
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

  return (
    <section style={{ marginBottom: 'calc(var(--base) * 2)' }} aria-label="Do zrobienia">
      <h2 style={{ marginBottom: 'var(--base)' }}>Do zrobienia</h2>
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
                    <a href={listUrl('bookings', { session: { equals: session.id } })}>zapisani</a>
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
