'use client'

import { useActionState, useId } from 'react'

import { ZGODA_TRESC } from '@/lib/consent'
import { TEMATY } from '@/lib/tematy'
import { wyslijWiadomosc, type StanFormularza } from './actions'

const STAN_POCZATKOWY: StanFormularza = { status: 'bezczynny' }

const pole =
  'w-full rounded-lg border border-rock-200 bg-white px-3.5 py-2.5 text-rock-900 ' +
  'placeholder:text-rock-400 focus-visible:border-rope focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-rope'

export function FormularzKontaktowy({
  temat,
  kurs,
}: {
  temat?: string
  /** Kurs, z którego podstrony ktoś tu przyszedł — dopinamy go do zgłoszenia. */
  kurs?: { id: number; title: string }
}) {
  const [stan, akcja, wTrakcie] = useActionState(wyslijWiadomosc, STAN_POCZATKOWY)
  // ⚠️ Identyfikatory pól MUSZĄ być unikalne w skali całego dokumentu, a nie
  // tylko formularza. Wcześniej stało tu `id="tresc"` — dokładnie tak samo,
  // jak nazywa się kontener treści w layoucie (cel linku „przejdź do treści").
  // Zmierzone: etykieta „Wiadomość" nie wiązała się wtedy z ŻADNYM polem,
  // bo `label[for]` trafia na pierwszy element o tym identyfikatorze w
  // dokumencie, a tam stał <div>. Kliknięcie etykiety nie ustawiało fokusu,
  // a czytnik ekranu nie miał czego ogłosić. `useId()` zdejmuje z nas
  // pilnowanie tego przy każdej nowej nazwie pola.
  const prefiks = useId()
  const pid = (nazwa: string) => `${prefiks}-${nazwa}`

  if (stan.status === 'wyslano') {
    return (
      // role="status" sprawia, że czytnik ekranu ogłasza potwierdzenie —
      // bez tego osoba niewidoma nie dowie się, że cokolwiek się wydarzyło.
      <div role="status" className="rounded-2xl border border-rock-200 bg-white p-8">
        <h2 className="text-xl font-semibold">Dziękujemy, wiadomość dotarła.</h2>
        <p className="mt-2 text-rock-600">
          Odpowiadamy zwykle tego samego dnia. Jeśli sprawa jest pilna, zadzwoń albo wyślij SMS.
        </p>
      </div>
    )
  }

  return (
    <form
      action={akcja}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-rock-200 bg-white p-6 lg:p-8"
    >
      <h2 className="text-[24px] leading-tight">Napisz do nas</h2>

      {kurs && (
        <>
          <p className="rounded-lg bg-rope-soft px-4 py-3 text-sm text-rope-dark">
            Zapytanie dotyczy kursu <strong>{kurs.title}</strong>.
          </p>
          <input type="hidden" name="kurs" value={kurs.id} />
        </>
      )}

      {stan.komunikat && (
        <p
          role="alert"
          className="rounded-lg border border-rope bg-rope-soft px-4 py-3 text-rope-dark"
        >
          {stan.komunikat}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Pole
          id={pid('imie')}
          nazwa="imie"
          etykieta="Imię i nazwisko"
          wymagane
          autoComplete="name"
          placeholder="Anna Kowalska"
          blad={stan.bledy?.imie}
        />
        <Pole
          id={pid('telefon')}
          nazwa="telefon"
          etykieta="Telefon"
          typ="tel"
          autoComplete="tel"
          placeholder="600 000 000"
          podpowiedz="Nieobowiązkowy — ułatwia szybki kontakt."
          blad={stan.bledy?.telefon}
        />
      </div>

      <Pole
        id={pid('email')}
        nazwa="email"
        etykieta="Adres e-mail"
        typ="email"
        wymagane
        autoComplete="email"
        placeholder="anna@example.com"
        blad={stan.bledy?.email}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={pid('temat')} className="font-medium">
          Czego dotyczy zapytanie
        </label>
        <select
          id={pid('temat')}
          name="temat"
          // Wstępnie wybrane, gdy ktoś przyszedł z podstrony kursu lub obozu.
          defaultValue={temat ?? ''}
          aria-describedby={stan.bledy?.temat ? pid('temat-blad') : undefined}
          aria-invalid={stan.bledy?.temat ? true : undefined}
          className={pole}
        >
          <option value="">— wybierz —</option>
          {TEMATY.map((t) => (
            <option key={t.wartosc} value={t.wartosc}>
              {t.etykieta}
            </option>
          ))}
        </select>
        {stan.bledy?.temat && (
          <p id={pid('temat-blad')} className="text-sm text-rope">
            {stan.bledy.temat}
          </p>
        )}
      </div>

      <Pole
        id={pid('preferowanyTermin')}
        nazwa="preferowanyTermin"
        etykieta="Preferowany termin"
        podpowiedz="Nieobowiązkowe — np. „pierwsza połowa czerwca”."
        placeholder="np. pierwsza połowa czerwca"
        blad={stan.bledy?.preferowanyTermin}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={pid('tresc')} className="font-medium">
          Wiadomość <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={pid('tresc')}
          name="tresc"
          rows={5}
          required
          placeholder="Napisz, ile masz doświadczenia i czego oczekujesz od kursu."
          aria-describedby={stan.bledy?.tresc ? pid('tresc-blad') : undefined}
          aria-invalid={stan.bledy?.tresc ? true : undefined}
          className={pole}
        />
        {stan.bledy?.tresc && (
          <p id={pid('tresc-blad')} className="text-sm text-rope">
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
        <label
          htmlFor={pid('zgoda')}
          className="flex items-start gap-3 text-sm leading-6 text-rock-600"
        >
          <input
            id={pid('zgoda')}
            name="zgoda"
            type="checkbox"
            required
            aria-describedby={stan.bledy?.zgoda ? pid('zgoda-blad') : undefined}
            aria-invalid={stan.bledy?.zgoda ? true : undefined}
            className="mt-1 size-4 shrink-0"
          />
          {/* Pełna treść klauzuli jest widoczna przy polu, a nie schowana pod
              linkiem. Ta sama treść trafia do bazy razem ze zgłoszeniem. */}
          <span>{ZGODA_TRESC}</span>
        </label>
        {stan.bledy?.zgoda && (
          <p id={pid('zgoda-blad')} className="text-sm text-rope">
            {stan.bledy.zgoda}
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={wTrakcie}
          className="rounded-lg bg-rope px-7 py-3.5 font-semibold text-white transition-colors hover:bg-rope-dark disabled:opacity-60"
        >
          {wTrakcie ? 'Wysyłam…' : 'Wyślij zapytanie'}
        </button>
      </div>
    </form>
  )
}

function Pole({
  id,
  nazwa,
  etykieta,
  typ = 'text',
  wymagane = false,
  autoComplete,
  podpowiedz,
  placeholder,
  blad,
}: {
  /** Unikalny w skali dokumentu — patrz komentarz przy `useId()` wyżej. */
  id: string
  nazwa: string
  etykieta: string
  typ?: string
  wymagane?: boolean
  autoComplete?: string
  podpowiedz?: string
  placeholder?: string
  blad?: string
}) {
  const idBledu = `${id}-blad`
  const idPodpowiedzi = `${id}-podpowiedz`
  const opisy = [blad ? idBledu : null, podpowiedz ? idPodpowiedzi : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {etykieta} {wymagane && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={nazwa}
        type={typ}
        required={wymagane}
        autoComplete={autoComplete}
        placeholder={placeholder}
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
