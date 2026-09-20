import Link from 'next/link'

import type { Termin } from '@/lib/content'
import { asKurs, asOboz } from '@/lib/content'
import { formatCena, formatWolneMiejsca, formatZakresDat, formatZakresKrotki } from '@/lib/format'
import { Odznaka } from './Ui'

/**
 * Wspólna logika czytania terminu.
 *
 * Termin może nadpisywać cenę i miejsce względem kursu lub obozu, do którego
 * należy — „wypełnij tylko przy odstępstwie" w panelu. Rozstrzygnięcie, co
 * ostatecznie pokazać, siedzi TUTAJ, a nie w trzech widokach, które ten termin
 * renderują: rozjazd między stroną główną a terminarzem byłby trudny do
 * zauważenia i jeszcze trudniejszy do wyjaśnienia klientowi.
 */
export function opisTerminu(t: Termin) {
  const kurs = asKurs(t.kurs)
  const oboz = asOboz(t.oboz)
  const cel = kurs ?? oboz

  // Cena kursu siedzi w polu `price`, a obozu w `cena`. Rozjazd jest spadkiem
  // po pierwotnym szkielecie, w którym `Kursy` dostały nazwy angielskie, a cała
  // reszta modelu (Wiadomosci, Obozy, Terminy) jest po polsku. Zmiana nazwy
  // pola w `Kursy` to migracja danych bez korzyści dla nikogo poza czytelnością
  // tej jednej linijki, więc rozgałęziamy tutaj — w jednym miejscu.
  const cenaZrodlowa = kurs ? kurs.price : (oboz?.cena ?? null)

  return {
    nazwa: cel?.title ?? 'Termin',
    href: kurs ? `/kursy/${kurs.slug}` : oboz ? `/obozy/${oboz.slug}` : null,
    miejsce: t.miejsce || cel?.miejsce || null,
    cena: t.cena ?? cenaZrodlowa ?? null,
    // „od" bierzemy z kursu/obozu tylko wtedy, gdy termin nie ma własnej ceny.
    // Cena wpisana przy terminie jest konkretna, więc „od" byłoby nieprawdą.
    cenaOd: t.cena != null ? false : Boolean(cel?.cenaOd),
    brakMiejsc: t.status === 'brak-miejsc' || (t.wolneMiejsca != null && t.wolneMiejsca <= 0),
  }
}

export function OdznakaMiejsc({ termin }: { termin: Termin }) {
  const { brakMiejsc } = opisTerminu(termin)
  if (brakMiejsc)
    return (
      <Odznaka ton="akcent" pigulka>
        brak miejsc
      </Odznaka>
    )
  if (termin.wolneMiejsca == null)
    return (
      <Odznaka ton="neutralna" pigulka>
        zapytaj o miejsca
      </Odznaka>
    )
  // Poniżej trzech miejsc kolor akcentu — to realna informacja („zostały dwa"),
  // a nie ozdoba.
  return (
    <Odznaka ton={termin.wolneMiejsca <= 2 ? 'akcent' : 'wolne'} pigulka>
      {formatWolneMiejsca(termin.wolneMiejsca)}
    </Odznaka>
  )
}

/** Tabela najbliższych terminów — strona główna i podstrona obozów. */
export function TabelaTerminow({ terminy }: { terminy: Termin[] }) {
  if (terminy.length === 0) {
    return (
      <p className="rounded-xl border border-rock-100 bg-white p-6 text-rock-600">
        Nowe terminy pojawią się tutaj po dodaniu ich w panelu. W międzyczasie napisz albo zadzwoń —
        przy grupie od trzech osób ustalamy termin indywidualnie.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
      {/* Tabela od `sm`; poniżej te same dane jako lista kart, bo pięć kolumn
          na 390 px nie da się przeczytać, a przewijanie w poziomie w tabeli
          z cenami jest wyjątkowo nieprzyjemne. */}
      <table className="hidden w-full border-collapse text-[15px] sm:table">
        <thead>
          <tr className="bg-rock-100 text-left">
            <th
              scope="col"
              className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
            >
              Termin
            </th>
            <th
              scope="col"
              className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
            >
              Co
            </th>
            <th
              scope="col"
              className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
            >
              Miejsca
            </th>
            <th
              scope="col"
              className="px-6 py-3.5 text-right text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
            >
              Cena
            </th>
          </tr>
        </thead>
        <tbody>
          {terminy.map((t) => {
            const o = opisTerminu(t)
            return (
              <tr key={t.id} className="border-b border-rock-100 last:border-0">
                <td className="px-6 py-4 font-semibold tabular-nums">
                  {formatZakresDat(t.dataOd, t.dataDo)}
                </td>
                <td className="px-6 py-4">
                  {o.href ? (
                    <Link href={o.href} className="font-medium text-rock-900 hover:text-rope">
                      {o.nazwa}
                    </Link>
                  ) : (
                    o.nazwa
                  )}
                  {o.miejsce && (
                    <span className="block text-[13px] text-rock-600">{o.miejsce}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <OdznakaMiejsc termin={t} />
                </td>
                <td className="px-6 py-4 text-right font-semibold tabular-nums">
                  {formatCena(o.cena, o.cenaOd)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-rock-100 sm:hidden">
        {terminy.map((t) => {
          const o = opisTerminu(t)
          return (
            <li key={t.id} className="flex flex-col gap-2 p-5">
              <span className="font-semibold tabular-nums">
                {formatZakresKrotki(t.dataOd, t.dataDo)}
              </span>
              {o.href ? (
                <Link
                  href={o.href}
                  className="text-[15px] text-rock-900 underline underline-offset-4"
                >
                  {o.nazwa}
                </Link>
              ) : (
                <span className="text-[15px]">{o.nazwa}</span>
              )}
              <div className="flex items-center justify-between gap-3">
                <OdznakaMiejsc termin={t} />
                <span className="font-semibold tabular-nums">{formatCena(o.cena, o.cenaOd)}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
