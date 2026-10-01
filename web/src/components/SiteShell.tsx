import type { SiteConfig } from '@/payload-types'
import { telHref } from '@/lib/content'
import { bricolage, inter } from '@/lib/fonts'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileActionBar } from './MobileActionBar'

/**
 * The document around every page of the site: <html>, <body>, header, footer
 * and the pinned mobile bar.
 *
 * Shared by the `(frontend)` layout and `app/global-not-found.tsx`. The latter
 * renders OUTSIDE any layout (the app has two root layouts, so there is no
 * common one), and without this it would have to copy the whole frame — or,
 * as before it existed, unknown addresses got Next's bare black 404 page with
 * no header, no footer and English text.
 *
 * Takes the site config from the caller rather than fetching it, so a layout
 * can pass the same object on to its structured data without a second query.
 */
export function SiteShell({
  siteConfig,
  children,
  after,
}: {
  siteConfig: SiteConfig
  children: React.ReactNode
  /** Rendered at the end of <body>, after the bar — the layout's JSON-LD. */
  after?: React.ReactNode
}) {
  const tel = telHref(siteConfig)

  return (
    <html lang="pl" className={`${inter.variable} ${bricolage.variable}`}>
      {/* `pb-[68px]` makes room for the pinned mobile bar so it does not cover
          the end of the footer. From `lg` up there is no bar, so the padding
          disappears. */}
      <body className="flex min-h-dvh flex-col pb-[68px] font-sans antialiased lg:pb-0">
        {/* Skip link — the first thing under Tab. Without it someone navigating
            by keyboard walks through the entire menu on every page before
            reaching the content. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-rock-900 focus:px-4 focus:py-2 focus:text-rock-50"
        >
          Przejdź do treści
        </a>

        <Header phone={siteConfig.phone ?? null} telHref={tel} />

        <div id="content" className="flex-1">
          {children}
        </div>

        <Footer config={siteConfig} />
        <MobileActionBar phone={siteConfig.phone ?? null} telHref={tel} />

        {after}
      </body>
    </html>
  )
}
