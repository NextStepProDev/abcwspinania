import type { MetadataRoute } from 'next'

import { BRAND } from '@/lib/site'

/**
 * ⚠️ TEN PLIK MUSI LEŻEĆ W KORZENIU `app/`, tak jak robots.ts.
 * Zmierzone 19.09.2026: `manifest.ts` w grupie tras `(frontend)/` nie produkuje
 * ŻADNEJ trasy — znika z manifestu Next-a bez błędu. `sitemap.ts` i `icon.tsx`
 * w tym samym katalogu działają normalnie, więc nie jest to reguła ogólna
 * dla plików konwencji, tylko dotyczy tych dwóch.
 *
 * Manifest aplikacji webowej — decyduje, jak strona wygląda po dodaniu do
 * ekranu głównego telefonu. Dla szkoły, której goście trafiają głównie
 * z telefonu, to drobiazg za darmo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND} — szkoła wspinaczki`,
    short_name: BRAND,
    description: 'Kursy wspinaczki skalnej, szkolenia i obozy na Jurze Krakowsko-Częstochowskiej.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f5f1',
    theme_color: '#2a2620',
    lang: 'pl',
  }
}
