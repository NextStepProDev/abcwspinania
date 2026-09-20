import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'

import { getUstawienia, telHref } from '@/lib/content'
import { BRAND, SITE_URL } from '@/lib/site'
import { jsonLd, organizationSchema } from '@/lib/schema'
import { ogImage } from '@/lib/seo'
import { Naglowek } from '@/components/Naglowek'
import { Stopka } from '@/components/Stopka'
import { PasekMobilny } from '@/components/PasekMobilny'
import './globals.css'

// Podzbiór `latin-ext` jest OBOWIĄZKOWY w OBU krojach. Bez niego polskie znaki
// diakrytyczne (ą, ę, ś, ż, ź, ć, ń, ó, ł) lecą na krój zapasowy i tekst
// rozjeżdża się w środku wyrazu — widać to dopiero na gotowej stronie, nie
// w devtoolsach. Przy kroju nagłówkowym boli podwójnie, bo idzie w 72 px.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
})

// Krój nagłówkowy z makiety. Zawężony do wag, których faktycznie używamy —
// Bricolage jest zmienny, więc bez tego zaciągnęlibyśmy pełny zakres osi.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['600', '800'],
  variable: '--font-bricolage',
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
    'Kursy wspinaczki skalnej z licencją PZA, obozy dla dzieci i młodzieży, własna baza w Rzędkowicach. Jura Krakowsko-Częstochowska.',
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Jedno pobranie na całe drzewo — nagłówek, stopka, pasek i dane
  // strukturalne dostają je właściwościami, zamiast wołać każde po swojemu.
  const ustawienia = await getUstawienia()
  const tel = telHref(ustawienia)

  return (
    <html lang="pl" className={`${inter.variable} ${bricolage.variable}`}>
      {/* `pb-[68px]` robi miejsce pod przyklejony pasek mobilny, żeby nie
          przykrywał końca stopki. Od `lg` paska nie ma, więc odstęp znika. */}
      <body className="flex min-h-dvh flex-col pb-[68px] font-sans antialiased lg:pb-0">
        {/* Link pomijający nawigację — pierwsza rzecz pod Tabem. Bez niego osoba
            poruszająca się klawiaturą przechodzi przez całe menu na każdej
            podstronie, zanim dotrze do treści. */}
        <a
          href="#tresc"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-rock-900 focus:px-4 focus:py-2 focus:text-rock-50"
        >
          Przejdź do treści
        </a>

        <Naglowek telefon={ustawienia.telefon ?? null} telHref={tel} />

        <div id="tresc" className="flex-1">
          {children}
        </div>

        <Stopka ustawienia={ustawienia} />
        <PasekMobilny telefon={ustawienia.telefon ?? null} telHref={tel} />

        {/* Dane strukturalne w layoucie, więc są na KAŻDEJ podstronie.
            Dla firmy działającej lokalnie to najtańsza rzecz, jaką da się zrobić
            dla widoczności w wyszukiwarce i w mapach. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema(ustawienia)) }}
        />
      </body>
    </html>
  )
}
