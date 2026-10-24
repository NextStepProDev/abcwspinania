'use client'

import { Link, useConfig } from '@payloadcms/ui'
import { usePathname, useSearchParams } from 'next/navigation'

import type { BookingKind } from '@/lib/bookings'

/**
 * "Zapisy na kursy" and "Zapisy na obozy" under "Pulpit" in the panel's menu.
 *
 * Both are ONE collection (`Bookings.ts`, decided 19.10.2026), but the school
 * looks at courses and camps separately — so the menu has a link to each
 * half: the same list, filtered by `kind` in its address. Payload's own
 * "Zapisy" link is hidden in `custom.css`; three ways into one list would
 * only make the reader wonder what differs.
 *
 * The same markup and classes as Payload's own menu links, like
 * `DashboardNavLink`.
 */
const LINKS: { kind: BookingKind; label: string }[] = [
  { kind: 'course', label: 'Zapisy na kursy' },
  { kind: 'camp', label: 'Zapisy na obozy' },
]

const KIND_PARAM = 'where[kind][equals]'

/**
 * The menu's view of a half (asked for 24.10.2026): by the session's date,
 * from a month back — older years would otherwise fill the first pages —
 * 100 rows a page. In the address, not only as the collection's defaults:
 * Payload keeps each user's last sort and page size and prefers them, so a
 * default alone never reached anyone who had opened the list before. The
 * date condition shows in the list's filters and can be removed there.
 */
export const LIST_DAYS_BACK = 30

export function bookingsListQuery(kind: BookingKind, now: Date): string {
  const from = new Date(now.getTime() - LIST_DAYS_BACK * 86_400_000).toISOString().slice(0, 10)
  return new URLSearchParams({
    [KIND_PARAM]: kind,
    'where[sessionStart][greater_than_equal]': from,
    sort: 'sessionStart',
    limit: '100',
  }).toString()
}

export function BookingsNavLinks() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    config: {
      routes: { admin },
    },
  } = useConfig()
  const list = `${admin}/collections/bookings`

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      {LINKS.map(({ kind, label }) => {
        const href = `${list}?${bookingsListQuery(kind, new Date())}`
        // Only on the list itself: an open booking does not say which half
        // it came from in its address.
        const active = pathname === list && searchParams.get(KIND_PARAM) === kind
        return (
          <Link
            className="nav__link"
            href={href}
            id={`nav-bookings-${kind}`}
            key={kind}
            prefetch={false}
          >
            {active && <div className="nav__link-indicator" />}
            <span className="nav__link-label">{label}</span>
          </Link>
        )
      })}
    </div>
  )
}
