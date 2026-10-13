'use client'

import { useActionState } from 'react'

import { resendVerification, type FormState } from './actions'

const INITIAL: FormState<{ email?: string }> = { status: 'idle' }

/**
 * "Send the confirmation link again" — one button, no fields. Who it is for
 * comes from the page: the address typed at login, or the token of the
 * expired link.
 */
export function ResendLinkForm({ email, token }: { email?: string; token?: string }) {
  const [state, action, pending] = useActionState(resendVerification, INITIAL)

  if (state.status === 'done') {
    return (
      <p role="status" className="rounded-lg bg-available-bg px-4 py-3 text-available-text">
        {state.message}
      </p>
    )
  }

  return (
    <form action={action}>
      {email && <input type="hidden" name="email" value={email} />}
      {token && <input type="hidden" name="token" value={token} />}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-rope px-5 py-2.5 font-semibold text-rope transition-colors hover:bg-rope-soft disabled:opacity-60"
      >
        {pending ? 'Wysyłam…' : 'Wyślij link ponownie'}
      </button>
    </form>
  )
}
