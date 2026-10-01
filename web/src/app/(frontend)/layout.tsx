import type { Metadata } from 'next'

import { getSiteConfig } from '@/lib/content'
import { BRAND, SITE_URL } from '@/lib/site'
import { jsonLd, organizationSchema } from '@/lib/schema'
import { ogImage } from '@/lib/seo'
import { SiteShell } from '@/components/SiteShell'
import './globals.css'

// The typefaces live in `lib/fonts.ts`, shared with `app/global-not-found.tsx`
// (rule 10: `latin-ext` in both).

/**
 * How often, in seconds, the public site refreshes its content from the
 * database.
 *
 * ⚠️ WITHOUT THIS THE WHOLE CMS IS USELESS TO THE CLIENT. The homepage, the
 * About page, the camp list and every detail page render statically — Next
 * bakes them when the image is built and, without `revalidate`, serves that
 * version forever. Measured: after changing a course price in the database,
 * `/kursy` (dynamic, because it reads query parameters) showed the new figure
 * while the homepage and `/kursy/[slug]` showed the old one indefinitely. The
 * client would correct a price in the panel and see no effect at all until the
 * next deploy.
 *
 * The declaration sits in the layout, because it then covers the whole
 * `(frontend)` segment — a single page somebody forgets about cannot fall out
 * of this rule. The `(payload)` group has its own layout and is unaffected, so
 * the panel and the API stay fully dynamic.
 *
 * Five minutes is a compromise: the client sees his own correction while still
 * looking at the page, and the machine (2 OCPU) does not render in circles. The
 * number of spots left, the most volatile figure, is on `/terminarz` anyway,
 * which renders on demand.
 */
export const revalidate = 300

export const metadata: Metadata = {
  // Lets `alternates.canonical` and `openGraph.url` be given as relative paths
  // — Next expands them with this domain.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND} — szkoła wspinaczki na Jurze`,
    template: `%s | ${BRAND}`,
  },
  description:
    'Kursy wspinaczki skalnej z licencją PZA, obozy dla dzieci i młodzieży, własna baza w Rzędkowicach. Jura Krakowsko-Częstochowska.',
  // Stated explicitly, because the manifest file has to live at the root of
  // `app/` (see the comment in src/app/manifest.ts), and from there Next does
  // not attach it to the <head> of pages inside a route group.
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: BRAND,
    locale: 'pl_PL',
    images: [ogImage()],
  },
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // One fetch for the whole tree — the header, footer, action bar and
  // structured data receive it through props instead of each fetching its own.
  const siteConfig = await getSiteConfig()

  return (
    <SiteShell
      siteConfig={siteConfig}
      after={
        // Structured data in the layout, so it is on EVERY page. For a
        // business operating locally this is the cheapest thing that can be
        // done for visibility in search and in maps.
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema(siteConfig)) }}
        />
      }
    >
      {children}
    </SiteShell>
  )
}
