'use client'

import { Link, useConfig } from '@payloadcms/ui'
import { usePathname, useSearchParams } from 'next/navigation'

import type { BookingKind } from '@/lib/bookings'
import { bookingsListUrl } from '@/lib/adminListUrl'
import { kindFromListQuery } from '@/lib/bookingsList'
import { bookingsMenuConditions } from '@/lib/dashboardConditions'

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
        const href = bookingsListUrl(bookingsMenuConditions(kind, new Date()), admin)
        // Only on the list itself: an open booking does not say which half
        // it came from in its address.
        const active = pathname === list && kindFromListQuery(searchParams.entries()) === kind
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
