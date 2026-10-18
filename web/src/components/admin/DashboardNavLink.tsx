'use client'

import { Link, useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

/**
 * "Pulpit" at the top of the panel's menu.
 *
 * Payload links back to the dashboard only through its small logo above the
 * page title (tooltip "Panel"), and its menu has no such entry — someone new
 * to the panel who opened "Zapisy" had no visible way back to "Do zrobienia"
 * (reported 18.10.2026, before the school's first test round).
 *
 * The same markup and classes as Payload's own menu links
 * (`@payloadcms/next` `DefaultNavClient`), so it looks and highlights the same.
 */
export function DashboardNavLink() {
  const pathname = usePathname()
  const {
    config: {
      routes: { admin },
    },
  } = useConfig()
  const home = admin || '/'
  const active = pathname === home || pathname === `${home}/`
  const label = (
    <>
      {active && <div className="nav__link-indicator" />}
      <span className="nav__link-label">Pulpit</span>
    </>
  )
  // Like Payload's links: the page you are on is not a link.
  if (active) {
    return (
      <div className="nav__link" id="nav-dashboard" style={{ marginBottom: 'var(--base)' }}>
        {label}
      </div>
    )
  }
  return (
    <Link
      className="nav__link"
      href={home}
      id="nav-dashboard"
      prefetch={false}
      style={{ marginBottom: 'var(--base)' }}
    >
      {label}
    </Link>
  )
}
