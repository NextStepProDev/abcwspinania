'use client'

import { useActionState } from 'react'

import { ZGODA_TRESC } from '@/lib/consent'
import { wyslijWiadomosc, type StanFormularza } from './actions'

const STAN_POCZATKOWY: StanFormularza = { status: 'bezczynny' }

const pole =
  'w-full rounded-md border border-rock-300 bg-white px-3 py-2 text-rock-900 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rope'

export function FormularzKontaktowy() {
  const [stan, akcja, wTrakcie] = useActionState(wyslijWiadomosc, STAN_POCZATKOWY)

  if (stan.status === 'wyslano') {
    return (
      // role="status" sprawia, że czytnik ekranu ogłasza potwierdzenie —
      // bez tego osoba niewidoma nie dowie się, że cokolwiek się wydarzyło.
      <div role="status" className="rounded-lg border border-rock-300 bg-white p-6">
        <h2 className="text-lg font-medium">Dziękujemy, wiadomość dotarła.</h2>
        <p className="mt-2 text-rock-600">Odpowiemy najszybciej, jak się da.</p>
      </div>
    )
  }

  return (
    <form action={akcja} className="flex flex-col gap-5" noValidate>
      {stan.komunikat && (
        <p role="alert" className="rounded-md border border-rope bg-white px-4 py-3 text-rope">
          {stan.komunikat}
        </p>
      )}

      <Pole
        nazwa="imie"
        etykieta="Imię"
        wymagane
        autoComplete="given-name"
        blad={stan.bledy?.imie}
      />
      <Pole
        nazwa="email"
        etykieta="E-mail"
        typ="email"
        wymagane
        autoComplete="email"
        blad={stan.bledy?.email}
      />
      <Pole
        nazwa="telefon"
        etykieta="Telefon"
        typ="tel"
        autoComplete="tel"
        podpowiedz="Nieobowiązkowy — ułatwia szybki kontakt."
        blad={stan.bledy?.telefon}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tresc" className="font-medium">
          Wiadomość <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="tresc"
          name="tresc"
          rows={6}
          required
          aria-describedby={stan.bledy?.tresc ? 'tresc-blad' : undefined}
          aria-invalid={stan.bledy?.tresc ? true : undefined}
          className={pole}
        />
        {stan.bledy?.tresc && (
          <p id="tresc-blad" className="text-sm text-rope">
            {stan.bledy.tresc}
          </p>
        )}
      </div>

      {/* Pułapka na roboty. `hidden` zamiast `display:none` w CSS — część botów
          czyta arkusze stylów i omija pola ukryte stylem. tabIndex i autoComplete
          trzymają ją poza zasięgiem klawiatury i menedżerów haseł. */}
      <input
        type="text"
        name="strona-www"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        hidden
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="zgoda" className="flex items-start gap-3 text-sm text-rock-600">
          <input
            id="zgoda"
            name="zgoda"
            type="checkbox"
            required
            aria-describedby={stan.bledy?.zgoda ? 'zgoda-blad' : undefined}
            aria-invalid={stan.bledy?.zgoda ? true : undefined}
            className="mt-1 size-4 shrink-0"
          />
          {/* Pełna treść klauzuli jest widoczna przy polu, a nie schowana pod
              linkiem. Ta sama treść trafia do bazy razem ze zgłoszeniem. */}
          <span>{ZGODA_TRESC}</span>
        </label>
        {stan.bledy?.zgoda && (
          <p id="zgoda-blad" className="text-sm text-rope">
            {stan.bledy.zgoda}
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={wTrakcie}
          className="rounded-md bg-rope px-6 py-3 font-medium text-white disabled:opacity-60"
        >
          {wTrakcie ? 'Wysyłam…' : 'Wyślij wiadomość'}
        </button>
      </div>
    </form>
  )
}

function Pole({
  nazwa,
  etykieta,
  typ = 'text',
  wymagane = false,
  autoComplete,
  podpowiedz,
  blad,
}: {
  nazwa: string
  etykieta: string
  typ?: string
  wymagane?: boolean
  autoComplete?: string
  podpowiedz?: string
  blad?: string
}) {
  const idBledu = `${nazwa}-blad`
  const idPodpowiedzi = `${nazwa}-podpowiedz`
  const opisy = [blad ? idBledu : null, podpowiedz ? idPodpowiedzi : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={nazwa} className="font-medium">
        {etykieta} {wymagane && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={nazwa}
        name={nazwa}
        type={typ}
        required={wymagane}
        autoComplete={autoComplete}
        aria-describedby={opisy || undefined}
        aria-invalid={blad ? true : undefined}
        className={pole}
      />
      {podpowiedz && (
        <p id={idPodpowiedzi} className="text-sm text-rock-600">
          {podpowiedz}
        </p>
      )}
      {blad && (
        <p id={idBledu} className="text-sm text-rope">
          {blad}
        </p>
      )}
    </div>
  )
}
