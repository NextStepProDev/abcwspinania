'use client'

import { useEffect, useState } from 'react'

/**
 * Whether a participant is logged in — asked of `/api/customers/me` from the
 * browser, again on every change of page.
 *
 * Every change of page, because the header lives in the layout and is NOT
 * re-created by navigation: checked once, it would still say "Zaloguj się"
 * after logging in and being redirected to the account, and "Moje konto"
 * after logging out.
 *
 * Why not on the server: the header sits in the shared layout, and reading
 * the login cookie there would make every page of the site render per request
 * instead of from the cache (`revalidate = 300`). A small request after the
 * page loads costs far less than losing the cache everywhere.
 *
 * Starts as "not logged in", which is also what visitors without JS keep
 * seeing: "Zaloguj się" leads to `/logowanie`, and that page sends a
 * logged-in person straight on to their account — the link is right either way.
 */
export function useLoggedIn(pathname: string): boolean {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/customers/me', { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { user?: unknown } | null) => {
        if (!cancelled) setLoggedIn(Boolean(body?.user))
      })
      .catch(() => {
        // Offline or the API down — keep showing "Zaloguj się".
      })
    return () => {
      cancelled = true
    }
  }, [pathname])

  return loggedIn
}
