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
 * Ostatni element nie jest linkiem: prowadziłby na stronę, na której już
 * jesteśmy.
 */
export function Okruszki({ sciezka }: { sciezka: Okruszek[] }) {
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
                <Link href={o.href} className="text-rock-600 hover:text-rope">
                  {o.etykieta}
                </Link>
              ) : (
                <span aria-current="page" className="text-rock-900">
                  {o.etykieta}
                </span>
              )}
              {i < sciezka.length - 1 && (
                <span aria-hidden="true" className="text-rock-300">
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

/** Wariant na ciemnym tle nagłówka powitalnego podstrony. */
export function OkruszkiJasne({ sciezka }: { sciezka: Okruszek[] }) {
  return (
    <nav aria-label="Ścieżka nawigacji">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {sciezka.map((o, i) => (
          <li key={o.etykieta} className="flex items-center gap-2">
            {o.href ? (
              <Link href={o.href} className="text-rock-fg hover:text-white">
                {o.etykieta}
              </Link>
            ) : (
              <span aria-current="page" className="text-white">
                {o.etykieta}
              </span>
            )}
            {i < sciezka.length - 1 && (
              <span aria-hidden="true" className="text-rock-500">
                /
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
