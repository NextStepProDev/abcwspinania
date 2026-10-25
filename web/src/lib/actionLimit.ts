import { headers } from 'next/headers'

import { takeToken, type Bucket } from '@/lib/rateLimit'

/**
 * A limit on the site's form actions that send email or check a secret,
 * inside the application — behind the nginx limits, not instead of them.
 *
 * ⚠️ Why nginx is not enough (found in the audit, 25.10.2026): Next runs a
 * server action posted to ANY page, not only the one whose form holds it.
 * nginx can only tell actions apart by the address, and the panel (`/admin`)
 * is exempt from `site_actions` because Payload's own actions there would hit
 * 10 a minute while the school types. "Forgot password", registration, the
 * newsletter, the contact form and the bookings, posted to `/admin`, went
 * through with no limit at all — free email to any address from our domain,
 * and the Brevo daily limit (300) gone for the day. Measured on the
 * standalone build: the reset action ran when posted to `/admin` and `/`.
 *
 * One budget per address for all these actions together. Larger than each
 * nginx zone (11 at once — burst 10 plus one — then 10 a minute), so a
 * visitor going through the forms in the normal way meets nginx first.
 *
 * The address is `X-Real-IP`, which nginx sets from the real visitor address
 * (Cloudflare's included, `set_real_ip_from`) on every proxied request — the
 * application port is not published, so the header cannot come from anyone
 * else. Without the header (`npm run dev`) or outside a request (the
 * integration tests) there is no nginx in front and no limit, as before.
 *
 * In process memory, on `globalThis`: Next bundles each page's actions
 * separately, so a module variable would give every page a budget of its
 * own (the same trap as the broadcast queue's flag). One instance today —
 * with several, each would count separately.
 */
const LIMIT = { capacity: 20, perMinute: 10 }

const store = globalThis as typeof globalThis & { __actionBuckets?: Map<string, Bucket> }

export const TOO_MANY_ATTEMPTS =
  'Za dużo prób w krótkim czasie. Odczekaj minutę i spróbuj ponownie.'

/** False when this visitor has used up the budget — answer with `TOO_MANY_ATTEMPTS`. */
export async function actionAllowed(): Promise<boolean> {
  // Outside a request — the integration tests call the actions in their own
  // process — `headers()` throws: no visitor, nothing to count.
  let ip: string | undefined
  try {
    ip = (await headers()).get('x-real-ip')?.trim()
  } catch {
    return true
  }
  if (!ip) return true
  store.__actionBuckets ??= new Map()
  return takeToken(store.__actionBuckets, ip, LIMIT, Date.now())
}
