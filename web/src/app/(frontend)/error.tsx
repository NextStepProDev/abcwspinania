'use client'

import { useEffect } from 'react'

/**
 * The error boundary for the whole site. It has to be a client component — Next
 * requires that. It shows a message in plain language and offers a retry button
 * instead of leaving the visitor with a blank screen.
 *
 * The error text is NOT shown to the visitor: it sometimes contains a file path
 * or a fragment of a database query. It goes to the console, where it is
 * useful.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page render error:', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Coś poszło nie tak
      </h1>
      <p className="max-w-[60ch] text-rock-600">
        Strona nie mogła się wyświetlić. Spróbuj jeszcze raz — jeśli błąd wraca, daj nam znać
        telefonicznie.
      </p>
      {error.digest && (
        <p className="text-sm text-rock-600">
          Numer zgłoszenia: <span className="font-mono">{error.digest}</span>
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-md bg-rock-900 px-5 py-3 font-medium text-rock-50"
      >
        Spróbuj ponownie
      </button>
    </main>
  )
}
