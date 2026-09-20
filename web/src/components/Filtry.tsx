import Link from 'next/link'

/**
 * Filtry list — ZWYKŁE LINKI z parametrem w adresie, nie stan komponentu.
 *
 * Powody, w kolejności ważności:
 *  1. Działa bez JavaScriptu i jest w HTML-u od razu, więc wyszukiwarka widzi
 *     odfiltrowane listy tak samo jak człowiek (duch reguły 9).
 *  2. Odfiltrowany widok ma własny adres — da się go wysłać i dodać do zakładek.
 *  3. Nie ma tu żadnego stanu do zgubienia przy nawigacji wstecz.
 *
 * Podstrony korzystające z filtrów muszą wskazywać `canonical` na wariant BEZ
 * parametru, żeby nie mnożyć w indeksie adresów z tą samą treścią.
 */
export interface Filtr {
  wartosc: string
  etykieta: string
}

export function Filtry({
  etykieta,
  filtry,
  aktywny,
  bazowyHref,
  parametr = 'filtr',
  podsumowanie,
}: {
  etykieta: string
  filtry: Filtr[]
  aktywny: string
  bazowyHref: string
  parametr?: string
  podsumowanie?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-y border-rock-100 py-4">
      <span className="mr-1 text-sm font-medium text-rock-600">{etykieta}</span>
      {filtry.map((f) => {
        const wybrany = f.wartosc === aktywny
        // Wartość domyślna nie dokleja parametru — adres bez filtra jest
        // kanoniczny i to on ma być najkrótszy.
        const href =
          f.wartosc === 'wszystkie' ? bazowyHref : `${bazowyHref}?${parametr}=${f.wartosc}`
        return (
          <Link
            key={f.wartosc}
            href={href}
            scroll={false}
            aria-current={wybrany ? 'true' : undefined}
            className={
              wybrany
                ? 'rounded-lg bg-rock-900 px-3.5 py-2 text-sm font-semibold text-rock-50'
                : 'rounded-lg border border-rock-200 bg-white px-3.5 py-2 text-sm font-medium text-rock-600 hover:border-rock-400 hover:text-rock-900'
            }
          >
            {f.etykieta}
          </Link>
        )
      })}
      {podsumowanie && (
        <span className="ml-auto text-sm text-rock-600" aria-live="polite">
          {podsumowanie}
        </span>
      )}
    </div>
  )
}
