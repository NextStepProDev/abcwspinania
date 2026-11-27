---
paths:
  - "web/src/lib/legacyRedirects*"
  - "web/next.config.ts"
  - "web/src/app/(frontend)/sitemap.ts"
  - "web/src/app/robots.ts"
---

<!-- Moved out of the root CLAUDE.md on 27.11.2026 (size limit). Topic: Redirects from the old Joomla site, sitemap revalidation. -->

## Redirects from the old site

Since 05.10.2026. Old Joomla addresses → new counterparts, `redirects()` in
`next.config.ts` from the list in `src/lib/legacyRedirects.ts`, permanent
(308). They work on every domain — nobody comes from them to the temporary one,
so they will come alive by themselves on the day of the switch.

- **The inventory was made by walking the links** of the old site (it had no
  sitemap): about forty subpages and articles. The calendar (`/kalendarz/...`
  generates a page for every day) and tags — one rule for the whole section.
- **Only EXACT old paths, no patterns on the new site's prefixes** (`/kursy/*`,
  `/aktualnosci/*`, `/obozy/*`). The new post
  `/aktualnosci/25-lat-abc-wspinania` starts with digits like the old
  `/aktualnosci/107-20lat` — a "numbered address" rule would swallow it.
- **`legacyRedirects.test.ts` guards**: no rule captures a route from
  `src/app/(frontend)` or a content address from the `CONTENT` list; every target
  exists; every old address found is handled; no chains.
  ⚠️ `CONTENT` is the addresses from the panel as of 05.10.2026 — **changing
  the slug of a course, camp or post in the panel breaks the redirect to it
  without a trace**. When changing a slug: fix the target in
  `legacyRedirects.ts` and `CONTENT`.
- Old articles without a counterpart → `/aktualnosci`, the old "O ABC" →
  `/o-nas`.
- **After the domain switch**: Search Console, the "Pages" report — old
  addresses should go to the new ones, without 404.

**By the way: the sitemap did not refresh at all.** `sitemap.ts` had no
`revalidate`, so Next generated it once, at the build in CI — without a
database — and kept it forever (`initialRevalidateSeconds: false` in
`.next/prerender-manifest.json`). Production showed only static pages in the
sitemap, without any course, camp or post. The layout's `revalidate` does NOT
reach metadata routes (`sitemap`, `robots`, `manifest`) — each needs its own.
Now `revalidate = 3600`.
