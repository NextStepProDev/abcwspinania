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
