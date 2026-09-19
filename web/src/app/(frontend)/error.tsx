'use client'

import { useEffect } from 'react'

/**
 * Granica błędu dla całej strony. Musi być komponentem klienckim — tego wymaga
 * Next. Pokazuje komunikat po ludzku i daje przycisk ponowienia, zamiast
 * zostawiać gościa z pustym ekranem.
 *
 * Treści błędu NIE pokazujemy odwiedzającemu: bywa w niej ścieżka pliku albo
 * fragment zapytania do bazy. Trafia do konsoli, gdzie jest przydatna.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Błąd renderowania strony:', error)
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
