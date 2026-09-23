import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

/**
 * ⚠️ THIS FILE MUST LIVE AT THE ROOT OF `app/`, not inside a route group.
 * Measured 2026-09-19: `robots.ts` inside `(frontend)/` produces NO route at
 * all — `/robots.txt` disappears from the manifest with no error and no
 * warning. `sitemap.ts` in the same directory works normally.
 *
 * We block only what has no business being in search results. In particular we
 * do NOT block the image directory — those are meant to reach Google Images.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The panel and the API are not content. Indexing them gains nothing and
      // exposes a login screen and the API structure in search results.
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
