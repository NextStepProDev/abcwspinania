'use client'

import { useActionState, useId } from 'react'

import { ZGODA_NEWSLETTER_TRESC } from '@/lib/consent'
import { zapiszNaNewsletter, type StanNewslettera } from '@/app/(frontend)/kontakt/actions'

const STAN_POCZATKOWY: StanNewslettera = { status: 'bezczynny' }

/**
 * Zapis na newsletter w stopce.
 *
 * Klauzula zgody jest przy polu, a nie schowana pod linkiem — ta sama treść
 * trafia do bazy razem z adresem (`lib/consent.ts`). To ten sam wzorzec, co
 * przy formularzu kontaktowym: zapisujemy TREŚĆ zgody, nie samo „tak".
 *
 * Wysyłki jeszcze nie ma, adresy czekają w bazie na wpięcie dostawcy. Dlatego
 * potwierdzenie mówi o zapisaniu, a nie o tym, że coś przyjdzie — obiecywanie
 * maila, który nie wyjdzie, byłoby gorsze niż brak formularza.
 */
export function FormularzNewslettera() {
  const [stan, akcja, wTrakcie] = useActionState(zapiszNaNewsletter, STAN_POCZATKOWY)
  const idPola = useId()
  const idZgody = `${idPola}-zgoda`

  if (stan.status === 'zapisano') {
    return (
      <div role="status" className="rounded-lg border border-rock-line bg-rock-800 px-5 py-4">
        <p className="font-medium text-white">Zapisane — dzięki.</p>
        <p className="mt-1 text-sm text-rock-fg">
          Odezwiemy się, gdy ruszą zapisy albo pojawi się nowy tekst.
        </p>
      </div>
    )
  }

  return (
    <form action={akcja} noValidate className="flex w-full flex-col gap-3 lg:max-w-[420px]">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="grow">
          <label htmlFor={idPola} className="sr-only">
            Adres e-mail
          </label>
          <input
            id={idPola}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="twoj@email.pl"
            aria-describedby={stan.bledy?.email ? `${idPola}-blad` : undefined}
            aria-invalid={stan.bledy?.email ? true : undefined}
            className="w-full rounded-lg border border-rock-line bg-rock-950 px-4 py-3 text-white placeholder:text-rock-500 focus-visible:border-rope focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rope"
          />
        </div>
        <button
          type="submit"
          disabled={wTrakcie}
          className="shrink-0 rounded-lg bg-rope px-6 py-3 font-semibold text-white transition-colors hover:bg-rope-dark disabled:opacity-60"
        >
          {wTrakcie ? 'Zapisuję…' : 'Zapisz się'}
        </button>
      </div>

      {/* Pułapka na roboty — ta sama co w formularzu kontaktowym. */}
      <input
        type="text"
        name="strona-www"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        hidden
      />

      <label
        htmlFor={idZgody}
        className="flex items-start gap-3 text-[13px] leading-5 text-rock-fg"
      >
        <input
          id={idZgody}
          name="zgoda-newsletter"
          type="checkbox"
          required
          aria-describedby={stan.bledy?.zgoda ? `${idPola}-zgoda-blad` : undefined}
          aria-invalid={stan.bledy?.zgoda ? true : undefined}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>{ZGODA_NEWSLETTER_TRESC}</span>
      </label>

      {(stan.bledy?.email || stan.bledy?.zgoda || stan.komunikat) && (
        <p role="alert" className="text-sm text-rope-light">
          {stan.bledy?.email ?? stan.bledy?.zgoda ?? stan.komunikat}
        </p>
      )}
    </form>
  )
}
