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
 * Palette values that TypeScript-generated assets need.
 *
 * The web manifest, the social card and the favicon are built in TypeScript and
 * cannot read a CSS custom property, so these have to be written out somewhere.
 * Here rather than once per file: lightening the page background on 24.09.2026
 * found stale copies of the old value in the card's text colour and in the
 * manifest's splash-screen background, which would have flashed the old shade on
 * a phone before the page appeared. Neither would have failed loudly.
 *
 * ⚠️ Every entry below MUST match its token in `app/(frontend)/globals.css` —
 * each one names which. A stylesheet cannot be imported from here, so nothing
 * enforces it: changing a token means changing this too.
 *
 * ⚠️ This is NOT every colour in those files, and the exceptions are worth
 * knowing by name rather than discovering:
 *
 *  • white (`#fff`) stays inline — it is not a brand decision;
 *  • the social card's subtitle uses `#c4b8a6`, which IS a token (`rock-300`)
 *    but is needed in exactly one place, so it did not earn an entry here;
 *  • that card's gradient writes `accent` and `ink` again in DECIMAL form,
 *    where a search for the hex will not find them: `rgba(27,44,113,…)` and
 *    `rgba(42,38,32,0)`. A gradient needs the channels separately, so they
 *    stay — but they are the copies most likely to go stale, and a grep for
 *    `#1b2c71` walks straight past them.
 *
 * No counting the entries in this comment. It said "the two palette values"
 * while there were three, because `accent` was added below and the heading was
 * not. `mark.ts` carries the same warning for the same reason.
 */
export const BRAND_COLORS = {
  /** `rock-50` — the page background, and light text on dark panels. */
  surface: '#fdfcfa',
  /** `rock-900` — the dark panels themselves. */
  ink: '#2a2620',
  /** `rope` — the accent, and the fill of the logo's lozenge. */
  accent: '#1b2c71',
} as const
