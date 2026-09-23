import type { MetadataRoute } from 'next'

import { BRAND, BRAND_COLORS } from '@/lib/site'

/**
 * ⚠️ THIS FILE MUST LIVE AT THE ROOT OF `app/`, just like robots.ts.
 * Measured 2026-09-19: `manifest.ts` inside the `(frontend)/` route group
 * produces NO route at all — it disappears from the Next manifest without an
 * error. `sitemap.ts` and `icon.tsx` in the same directory work normally, so
 * this is not a general rule for convention files; it applies to these two.
 *
 * The web app manifest — it decides how the site looks once added to a phone's
 * home screen. For a school whose visitors arrive mostly from a phone, this is
 * a detail that costs nothing.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND} — szkoła wspinaczki`,
    short_name: BRAND,
    description: 'Kursy wspinaczki skalnej, szkolenia i obozy na Jurze Krakowsko-Częstochowskiej.',
    start_url: '/',
    display: 'standalone',
    background_color: BRAND_COLORS.surface,
    theme_color: BRAND_COLORS.ink,
    lang: 'pl',
  }
}
