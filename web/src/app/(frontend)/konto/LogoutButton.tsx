'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Logs out through Payload's own endpoint rather than by deleting the cookie:
 * the endpoint also revokes the login's SESSION (`auth.useSessions`), so a
 * copied token stops working too, not just this browser's.
 */
export function LogoutButton() {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function logOut() {
    setPending(true)
    try {
      await fetch('/api/customers/logout', { method: 'POST', credentials: 'same-origin' })
    } finally {
      // The header re-checks the login on the change of page
      // (`useLoggedIn`); `refresh` drops anything the router cached while
      // logged in.
      router.push('/')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={logOut}
      disabled={pending}
      className="rounded-lg border border-rock-200 px-5 py-2.5 font-semibold transition-colors hover:border-rope disabled:opacity-60"
    >
      {pending ? 'Wylogowuję…' : 'Wyloguj się'}
    </button>
  )
}
