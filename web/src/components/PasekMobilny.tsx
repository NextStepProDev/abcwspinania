import Link from 'next/link'

import { Telefon } from './Ikony'

/**
 * Przyklejony do dołu pasek z telefonem i zapisem — z projektu mobilnego.
 *
 * Widoczny tylko poniżej `lg`, bo na desktopie te same akcje stoją w nagłówku.
 *
 * Pasek zasłania dół ekranu na stałe, więc `<body>` dostaje odpowiedni
 * `padding-bottom` (patrz layout) — bez tego przykryłby ostatnią linię stopki
 * i nikt by tego nie zauważył na desktopie, gdzie paska nie ma.
 */
export function PasekMobilny({
  telefon,
  telHref,
}: {
  telefon: string | null
  telHref: string | null
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-rock-200 bg-rock-50/95 px-4 py-2.5 backdrop-blur lg:hidden">
      {telHref && (
        <a
          href={telHref}
          aria-label={telefon ? `Zadzwoń: ${telefon}` : 'Zadzwoń'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-rock-300 text-rock-900"
        >
          <Telefon rozmiar={19} className="text-rope" />
        </a>
      )}
      <Link
        href="/kontakt"
        className="flex h-11 grow items-center justify-center rounded-lg bg-rope px-5 font-semibold text-white"
      >
        Zapisz się na kurs
      </Link>
    </div>
  )
}
