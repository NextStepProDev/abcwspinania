/**
 * Constants identifying the site that do NOT come from the CMS.
 *
 * Only the set that must be known without a database connection stayed here:
 * the brand name and the site address (needed at build time, in `metadataBase`
 * and in the sitemap).
 *
 * Contact details — phone, email, address, licence — MOVED to the `site-config`
 * global in the panel. Reason: they sat here with empty values and a "to be
 * confirmed with the client" comment, so filling them in would have required a
 * commit, an image build and a deploy to the client's machine. `getSiteConfig()`
 * in `lib/content.ts` reads them.
 *
 * The domain is an INPUT to be confirmed with the client. When it changes, we
 * swap it in two places and nowhere else:
 *   1. deploy/nginx.conf (server_name in three blocks),
 *   2. the SITE_URL repository variable in GitHub — that one is baked into the
 *      image at build time and arrives here as NEXT_PUBLIC_SITE_URL.
 * Grepping for "abcwspinania.info" must return those files only.
 */
export const BRAND = 'ABC Wspinania'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * The two palette values that TypeScript-generated assets need.
 *
 * The web manifest and the social card are built in TypeScript and cannot read
 * a CSS custom property, so these have to be written out somewhere. Here, once,
 * rather than once per file: lightening the page background on 24.09.2026 found
 * two stale copies of the old value — the card's text colour, and the manifest's
 * splash-screen background, which would have flashed the old shade on a phone
 * before the page appeared. Neither would have failed loudly.
 *
 * ⚠️ These MUST match `--color-rock-50` and `--color-rock-900` in
 * `app/(frontend)/globals.css`. A stylesheet cannot be imported from here, so
 * nothing enforces it — changing a token means changing this too.
 *
 * ⚠️ This is NOT every colour in those files, and it is not meant to be. The
 * logo mark carries its own literals (`#c8552b`, `#fff`, `#c4b8a6`), and the
 * card's gradient writes the same two values again in decimal form —
 * `rgba(200,85,43,…)` is the accent, `rgba(42,38,32,0)` is `ink`. They are left
 * alone because this change did not touch them, but they are the next drift
 * waiting to happen: anyone editing the accent has to grep for both spellings.
 */
export const BRAND_COLORS = {
  /** `rock-50` — the page background, and light text on dark panels. */
  surface: '#fbf9f5',
  /** `rock-900` — the dark panels themselves. */
  ink: '#2a2620',
} as const
