import path from 'path'
import { fileURLToPath } from 'url'

import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

import { LEGACY_REDIRECTS } from './src/lib/legacyRedirects'

// ESM: there is no `__dirname`, because package.json has "type": "module"
// (required by Payload).
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Files from public/ (hero photos, the logo) Next serves by default with
// `Cache-Control: max-age=0`. A week of cache + a day of serving the old version
// while revalidating. DELIBERATELY without `immutable`: these names carry no
// hash, so a photo replaced under the same name would stay invisible for a week
// at least. You change a photo — change its name.
const STATIC_MEDIA_CACHE = 'public, max-age=604800, stale-while-revalidate=86400'

/**
 * The Content-Security-Policy for the PUBLIC SITE.
 *
 * It lives here, not in nginx, for two reasons:
 *  1. Payload's panel needs a looser policy than the site, and splitting that
 *     in nginx would need a separate `location /admin` block — in which its own
 *     `add_header` DROPS inheritance from the `server` block, so the full set
 *     of security headers would have to be repeated there and kept in step
 *     with the rest.
 *  2. Next knows its own routes, so excluding /admin and /api is exact here.
 *
 * ⚠️ nginx deliberately does NOT set a CSP. If it did, the browser would get
 * the header TWICE and apply the stricter one — in practice at random,
 * depending on which block took effect. One source, here.
 *
 * The scope follows what the site actually uses:
 *  • 'unsafe-inline' in script-src — Next injects hydration data and JSON-LD
 *    in <script> tags without a nonce,
 *  • 'unsafe-inline' in style-src — Tailwind and next/font set inline styles,
 *  • img-src with data: and blob: — next/image placeholders and the generated icon,
 *  • NO font-src to outside hosts: next/font serves the typefaces from our own
 *    domain, so nothing goes outside.
 * Deliberately NO upgrade-insecure-requests: everything goes over HTTPS anyway.
 */
// The ONLY difference between dev and production: 'unsafe-eval' in script-src.
//
// React's development build calls eval() to rebuild call stacks and for other
// diagnostics. Without it every page load in dev logs "eval() is not supported
// in this environment" to the console, and error messages lose readable
// stacks. Measured 20.09.2026: the application works correctly WITHOUT this
// loosening too — hydration passes, clicked components respond — so it is
// purely a debugging convenience, not a condition for working.
//
// React's production build does not call eval(), so in production the policy
// stays narrow. Told apart by NODE_ENV: `next dev` sets 'development', the
// image build — 'production'.
//
// connect-src is deliberately NOT loosened here: 'self' already covers a
// WebSocket to the same origin, so HMR works without adding ws:. (When HMR does
// not come up, the cause is usually `allowedDevOrigins` below, not the CSP.)
const DEV = process.env.NODE_ENV !== 'production'

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // The contact page map: the two Google Maps embed paths (`/maps?…&output=embed`
  // built from the address, `/maps/embed?pb=…` pasted in the panel), not all of google.com.
  'frame-src https://www.google.com/maps/embed https://www.google.com/maps',
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // `app/global-not-found.tsx` — the site's 404 for addresses no route
    // matches. Needed because the app has two root layouts and none common
    // to both. Experimental in Next 16: re-check the flag on every upgrade.
    // `withPayload` spreads `experimental`, so the flag survives it.
    globalNotFound: true,
  },
  // Do not announce what the site runs on.
  poweredByHeader: false,
  // The old Joomla site's addresses → their new counterparts, permanently
  // (308). The list and the reasons are in `src/lib/legacyRedirects.ts`.
  async redirects() {
    return LEGACY_REDIRECTS.map((rule) => ({ ...rule, permanent: true }))
  },
  async headers() {
    return [
      { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: STATIC_MEDIA_CACHE }] },
      { source: '/logo/:path*', headers: [{ key: 'Cache-Control', value: STATIC_MEDIA_CACHE }] },
      {
        // Everything EXCEPT the panel and the API. Payload's panel loads its own
        // resources in ways this policy does not allow, and tightening it around
        // someone else's panel ends in a blank screen after every CMS update.
        source: '/((?!admin|api/).*)',
        headers: [{ key: 'Content-Security-Policy', value: CSP }],
      },
    ]
  },
  // `127.0.0.1` next to the tunnels: opening the site by IP instead of
  // `localhost` is a different origin for Next and blocks the HMR channel
  // ("Blocked cross-origin request to Next.js dev resource"). The symptom
  // misleads — the page renders fine, but client components never come alive,
  // because the dev bootstrap does not finish.
  // `192.168.*.*`: a phone on the home Wi-Fi (`npm run dev -- -H 0.0.0.0`) in
  // manual tests — without it the ☰ menu and the forms did not work on the
  // phone (12.10.2026). Applies to `next dev` only.
  allowedDevOrigins: ['127.0.0.1', '192.168.*.*', '*.ngrok-free.app', '*.ngrok.app', '*.ngrok.dev'],
  turbopack: {
    root: path.resolve(dirname),
  },
  images: {
    // Photos from the media library are served by THE SAME application, under
    // /api/media/file/**. There is no remote host any more, so the whole
    // remotePatterns section and the dangerouslyAllowLocalIP flag are gone —
    // they existed only so the optimiser could reach a separate Strapi container.
    //
    // ⚠️ EVERY collection with uploads needs its own entry HERE. Payload serves
    // files under /api/<slug>/file/**, and `next/image` with an address outside
    // this list does not render an empty spot, it THROWS — the whole subpage
    // returns 500. Measured 23.09.2026 when adding the `gallery-photos`
    // collection: lint, types, tests and `build` all passed, because the page is
    // dynamic and the database held no photo at build time. It only came out
    // after opening /galeria with a real file.
    localPatterns: [
      { pathname: '/api/media/file/**' },
      { pathname: '/api/gallery-photos/file/**' },
      // Photos from the repository (public/images) — the family archive on
      // /o-nas. They do not go through Payload, but they do go through Next's
      // optimiser, so they need an entry too.
      { pathname: '/images/**' },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

const withPayloadConfig = withPayload(nextConfig, { devBundleServerPackages: false })

/**
 * Payload's colour-scheme hint, for the panel only.
 *
 * `withPayload` adds `Accept-CH`, `Critical-CH` and `Vary:
 * Sec-CH-Prefers-Color-Scheme` to EVERY address (`/:path*`), so the panel
 * can pick its light or dark theme on the first paint. On the site that hint
 * means nothing, and `Critical-CH` costs: Chrome, seeing the hint missing
 * from its request, throws the answer away and asks for the page again — the
 * server renders it twice and the visitor waits for both. Lighthouse counted
 * it as a 600 ms redirect on every page (audit, 25.10.2026); production sent
 * the headers too. Narrowed to `/admin`; re-check the rule's shape on every
 * Payload upgrade — when it changes, this finds nothing and the site goes
 * back to the double request, silently.
 */
const payloadHeaders = withPayloadConfig.headers
withPayloadConfig.headers = async () =>
  (payloadHeaders ? await payloadHeaders() : []).map((rule) =>
    rule.source === '/:path*' && rule.headers.some((h) => h.key === 'Critical-CH')
      ? { ...rule, source: '/admin/:path*' }
      : rule,
  )

export default withPayloadConfig
