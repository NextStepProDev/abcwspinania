import Link from 'next/link'

import { SITE_URL } from '@/lib/site'
import { jsonLd } from '@/lib/schema'

export interface Okruszek {
  etykieta: string
  href?: string
}

/**
 * Ścieżka nawigacji wraz z odpowiadającymi jej danymi strukturalnymi.
 *
 * Jedno wywołanie daje oba, bo rozdzielone rozjeżdżają się przy pierwszej
 * zmianie hierarchii — a rozbieżność między tym, co widzi człowiek, a tym,
 * co czyta wyszukiwarka, jest dokładnie tym, czego się tu unika.
 *
 * ⚠️ Wariant kolorystyczny jest WŁAŚCIWOŚCIĄ, a nie osobnym komponentem.
 * Wcześniej stały tu obok siebie `Okruszki` i `OkruszkiJasne` i skończyło się
 * dokładnie tak, jak takie pary się kończą: jasny wariant nie emitował
 * `BreadcrumbList` (więc podstrony kursu, obozu i artykułu — te najgłębsze,
 * gdzie ścieżka znaczy najwięcej — nie miały danych strukturalnych), a na
 * podstronie kursu użyto przez pomyłkę wariantu ciemnego na ciemnym tle
 * i nazwa bieżącej strony była nieczytelna. Jeden komponent nie pozwala na
 * żadną z tych pomyłek.
 *
 * Ostatni element nie jest linkiem: prowadziłby na stronę, na której już
 * jesteśmy.
 */
export function Okruszki({
  sciezka,
  wariant = 'naJasnym',
}: {
  sciezka: Okruszek[]
  /** `naCiemnym` — dla nagłówków powitalnych na tle `rock-950`. */
  wariant?: 'naJasnym' | 'naCiemnym'
}) {
  const ciemne = wariant === 'naCiemnym'
  const klasaLinku = ciemne ? 'text-rock-fg hover:text-white' : 'text-rock-600 hover:text-rope'
  const klasaBiezacej = ciemne ? 'text-white' : 'text-rock-900'
  const klasaSeparatora = ciemne ? 'text-rock-500' : 'text-rock-300'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: sciezka.map((o, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: o.etykieta,
      ...(o.href ? { item: `${SITE_URL}${o.href}` } : {}),
    })),
  }

  return (
    <>
      <nav aria-label="Ścieżka nawigacji">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {sciezka.map((o, i) => (
            <li key={o.etykieta} className="flex items-center gap-2">
              {o.href ? (
                <Link href={o.href} className={klasaLinku}>
                  {o.etykieta}
                </Link>
              ) : (
                <span aria-current="page" className={klasaBiezacej}>
                  {o.etykieta}
                </span>
              )}
              {i < sciezka.length - 1 && (
                <span aria-hidden="true" className={klasaSeparatora}>
                  /
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </>
  )
}
