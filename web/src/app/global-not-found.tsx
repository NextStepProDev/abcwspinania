import type { Metadata } from 'next'

import { getSiteConfig } from '@/lib/content'
import { BRAND } from '@/lib/site'
import { SiteShell } from '@/components/SiteShell'
import { NotFoundContent } from '@/components/NotFoundContent'
import './(frontend)/globals.css'

/**
 * The 404 page for addresses that match NO route, e.g. `/cokolwiek`.
 *
 * Why this file exists: the app has two root layouts, `(frontend)` and
 * `(payload)`, and none at the root of `app/` (the panel must not inherit the
 * site's styles). With no common layout, Next had nowhere to render a 404 and
 * fell back to its own bare black page — no header, no footer, in English.
 * `global-not-found` is Next's answer to exactly that case. It is still
 * EXPERIMENTAL: enabled by `experimental.globalNotFound` in `next.config.ts`;
 * check both on every Next upgrade.
 *
 * It renders outside any layout, so it brings its own document (`SiteShell`)
 * and stylesheet. Next adds the 404 status and `noindex` itself; the tab icon
 * comes from `/favicon.ico`, which answers for every address.
 *
 * `(frontend)/not-found.tsx` covers the other way in (`notFound()` inside a
 * page). Both render `NotFoundContent`.
 */
export const metadata: Metadata = {
  title: `Nie ma takiej strony | ${BRAND}`,
  description: 'Ten adres nie prowadzi do żadnej strony szkoły ABC Wspinania.',
}

// The footer and header show contact details from the panel. This file sits
// outside the `(frontend)` layout and does not inherit its `revalidate`, so it
// repeats it — otherwise the page could stay as baked at build time, when CI
// has no database and the details are empty.
export const revalidate = 300

export default async function GlobalNotFound() {
  const siteConfig = await getSiteConfig()
  return (
    <SiteShell siteConfig={siteConfig}>
      <NotFoundContent />
    </SiteShell>
  )
}
