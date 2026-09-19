import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

/**
 * ⚠️ TEN PLIK MUSI LEŻEĆ W KORZENIU `app/`, a nie w grupie tras.
 * Zmierzone 19.09.2026: `robots.ts` w `(frontend)/` nie produkuje ŻADNEJ trasy —
 * `/robots.txt` znika z manifestu bez błędu i bez ostrzeżenia. `sitemap.ts`
 * w tym samym katalogu działa normalnie.
 *
 * Stara strona blokowała katalog /images/, przez co ani jedno zdjęcie ze
 * ścianki nie mogło trafić do Google Grafiki. Tu blokujemy wyłącznie to,
 * co nie ma prawa być w wynikach wyszukiwania.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Panel i API nie są treścią. Indeksowanie ich nic nie daje, a wystawia
      // w wynikach wyszukiwania ekran logowania i strukturę API.
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
