import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'

import { BRAND, SITE_URL } from '@/lib/site'
import { jsonLd, organizationSchema } from '@/lib/schema'
import { ogImage } from '@/lib/seo'
import './globals.css'

// Podzbiór `latin-ext` jest OBOWIĄZKOWY. Bez niego polskie znaki diakrytyczne
// (ą, ę, ś, ż, ź, ć, ń, ó, ł) lecą na krój zapasowy i tekst rozjeżdża się
// w środku wyrazu — widać to dopiero na gotowej stronie, nie w devtoolsach.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  // Pozwala podawać `alternates.canonical` i `openGraph.url` jako ścieżki
  // względne — Next rozwija je o tę domenę.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND} — szkoła wspinaczki na Jurze`,
    template: `%s | ${BRAND}`,
  },
  description:
    'Kursy wspinaczki skalnej, szkolenia i obozy dla dzieci i dorosłych. Jura Krakowsko-Częstochowska.',
  // Wskazany jawnie, bo plik manifestu musi leżeć w korzeniu `app/` (patrz
  // komentarz w src/app/manifest.ts), a stamtąd Next nie dokleja go sam
  // do <head> podstron w grupie tras.
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: BRAND,
    locale: 'pl_PL',
    images: [ogImage()],
  },
}

const NAWIGACJA = [
  { href: '/', etykieta: 'Kursy' },
  { href: '/kontakt', etykieta: 'Kontakt' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        {/* Link pomijający nawigację — pierwsza rzecz pod Tabem. Bez niego osoba
            poruszająca się klawiaturą przechodzi przez całe menu na każdej
            podstronie, zanim dotrze do treści. */}
        <a
          href="#tresc"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-rock-900 focus:px-4 focus:py-2 focus:text-rock-50"
        >
          Przejdź do treści
        </a>

        <header className="border-b border-rock-100">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              {BRAND}
            </Link>
            <nav aria-label="Główna">
              <ul className="flex gap-6">
                {NAWIGACJA.map((pozycja) => (
                  <li key={pozycja.href}>
                    <Link href={pozycja.href} className="text-rock-600 hover:text-rock-900">
                      {pozycja.etykieta}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <div id="tresc" className="flex-1">
          {children}
        </div>

        <footer className="mt-16 border-t border-rock-100">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-rock-600 sm:px-6">
            <p>
              © {new Date().getFullYear()} {BRAND}
            </p>
            <p>Jura Krakowsko-Częstochowska</p>
          </div>
        </footer>

        {/* Dane strukturalne w layoucie, więc są na KAŻDEJ podstronie.
            Dla firmy działającej lokalnie to najtańsza rzecz, jaką da się zrobić
            dla widoczności w wyszukiwarce i w mapach. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }}
        />
      </body>
    </html>
  )
}
