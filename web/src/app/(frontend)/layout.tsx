import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'

import { getSiteConfig, telHref } from '@/lib/content'
import { BRAND, SITE_URL } from '@/lib/site'
import { jsonLd, organizationSchema } from '@/lib/schema'
import { ogImage } from '@/lib/seo'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MobileActionBar } from '@/components/MobileActionBar'
import './globals.css'

// The `latin-ext` subset is MANDATORY in BOTH typefaces. Without it Polish
// diacritics (ą, ę, ś, ż, ź, ć, ń, ó, ł) fall back to a substitute face and the
// text breaks apart mid-word — visible only on the finished page, not in
// devtools. With the display face it hurts twice as much, because it runs at
// 72 px.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
})

// The display typeface from the mockup. Narrowed to the weights we actually
// use — Bricolage is variable, so without this we would pull the full axis
// range.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['600', '800'],
  variable: '--font-bricolage',
})

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

        {/* Structured data in the layout, so it is on EVERY page. For a
            business operating locally this is the cheapest thing that can be
            done for visibility in search and in maps. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema(siteConfig)) }}
        />
      </body>
    </html>
  )
}
