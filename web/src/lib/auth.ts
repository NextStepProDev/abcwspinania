import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Metadata } from 'next'

import type { Customer } from '@/payload-types'

/**
 * Who is logged in on the SITE — a participant, or nobody.
 *
 * A school account logged into the panel in the same browser is NOT returned:
 * the panel and the site share Payload's cookie, and to the site a panel
 * account is simply "not a participant" (CLAUDE.md, "Konta uczestników").
 *
 * Server only: it reads the request (`next/headers`). Calling it makes the
 * page dynamic, which is why it is used only on account pages — never in
 * the shared layout, where it would turn every cached page into one
 * rendered per request.
 */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return user?.collection === 'customers' ? (user as Customer) : null
}

/**
 * Stores the login token the way Payload's own cookie does — same name, HTTP
 * only, same lifetime as the token — so `payload.auth()` and
 * `/api/customers/me` recognise it.
 */
export async function setLoginCookie(token: string, expiresAt: number | undefined) {
  const payload = await getPayload({ config })
  const auth = payload.collections.customers.config.auth
  ;(await cookies()).set(`${payload.config.cookiePrefix}-token`, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: Boolean(auth.cookies.secure),
    expires: expiresAt
      ? new Date(expiresAt * 1000)
      : new Date(Date.now() + auth.tokenExpiration * 1000),
  })
}

/** Account pages stay out of search engines — there is nothing to find there. */
export function accountPageMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false } }
}
