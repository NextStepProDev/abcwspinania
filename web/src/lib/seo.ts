import type { Metadata } from 'next'
import { BRAND, SITE_URL } from '@/lib/site'

/** Grafika karty — 1200×630, generowana przez trasę `app/og/route.tsx`. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 }
export const OG_IMAGE_ALT = `${BRAND} — szkoła wspinaczki na Jurze`

/** Świeży obiekt na każde wywołanie — resolver metadanych Next-a go zjada. */
export const ogImage = () => ({
  url: `${SITE_URL}/og`,
  ...OG_IMAGE_SIZE,
  alt: OG_IMAGE_ALT,
})

/**
 * Metadane podstrony: tytuł, opis, canonical i karta społecznościowa.
 *
 * Wynik eksportujemy w page.tsx jako `generateMetadata`, NIE jako
 * `export const metadata` — wersja z const wymaga literału, więc wywołanie
 * funkcji się w niej nie skompiluje.
 *
 * Next scala metadane PŁYTKO: obiekt `openGraph` z podstrony nadpisuje ten
 * z layoutu w całości. Stąd ten helper — jedno źródło kształtu karty, zamiast
 * kompletu pól przepisywanego na każdej podstronie (i gubionego na którejś).
 *
 * `canonical` rozwiązuje to, czego stary serwis nie miał w ogóle: adres z „www"
 * i bez „www" odpowiadały kodem 200 i Google sam musiał zgadywać, który jest
 * właściwy. Tu dochodzi do tego przekierowanie 301 w nginx.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  /** Ścieżka od korzenia, np. "/kursy" — rozwijana o domenę przez metadataBase. */
  path: string
}): Metadata {
  const fullTitle = `${title} | ${BRAND}`

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: BRAND,
      locale: 'pl_PL',
      url: path,
      title: fullTitle,
      description,
      images: [ogImage()],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage()],
    },
  }
}
