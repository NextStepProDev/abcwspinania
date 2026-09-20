import Link from 'next/link'

import { Strzalka } from './Ikony'

/**
 * Powtarzalne elementy z makiety: przyciski, odznaki, nagłówki sekcji.
 *
 * Zebrane w jednym pliku, bo każdy z nich to kilka klas i występuje na
 * większości podstron. Rozsypane po widokach rozjeżdżają się przy pierwszej
 * korekcie odstępu — to dokładnie ten rodzaj duplikatu, który widać dopiero
 * wtedy, gdy dwa przyciski obok siebie mają inną wysokość.
 */

type Wariant = 'glowny' | 'obrys' | 'jasny' | 'obrysJasny'

const WARIANTY: Record<Wariant, string> = {
  glowny: 'bg-rope text-white hover:bg-rope-dark',
  obrys: 'border border-rock-300 text-rock-900 hover:border-rock-600',
  jasny: 'bg-white text-rope-dark hover:bg-rock-50',
  obrysJasny: 'border-[1.5px] border-white/60 text-white hover:border-white',
}

export function Przycisk({
  href,
  children,
  wariant = 'glowny',
  duzy,
  zeStrzalka,
  className = '',
  ...reszta
}: {
  href: string
  children: React.ReactNode
  wariant?: Wariant
  duzy?: boolean
  zeStrzalka?: boolean
  className?: string
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'children' | 'className'>) {
  const rozmiar = duzy ? 'px-7 py-4 text-[17px]' : 'px-5 py-2.5 text-[15px]'
  // `whitespace-nowrap`: etykiety przycisków są krótkie i złamane w połowie
  // („Zapisz\nsię") wyglądają na błąd układu, a nie na zamierzony zawijas.
  const klasy = `inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-lg font-semibold transition-colors ${rozmiar} ${WARIANTY[wariant]} ${className}`

  // Linki zewnętrzne i `tel:` nie przechodzą przez router Next-a — <Link> na
  // nich robi tylko szum w konsoli i psuje zachowanie na telefonie.
  if (href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('http')) {
    return (
      <a href={href} className={klasy}>
        {children}
        {zeStrzalka && <Strzalka rozmiar={17} />}
      </a>
    )
  }

  return (
    <Link href={href} className={klasy} {...reszta}>
      {children}
      {zeStrzalka && <Strzalka rozmiar={17} />}
    </Link>
  )
}

type TonOdznaki = 'akcent' | 'neutralna' | 'wolne' | 'ciemna' | 'naCiemnym'

const TONY: Record<TonOdznaki, string> = {
  akcent: 'bg-rope-soft text-rope-dark',
  neutralna: 'bg-rock-100 text-rock-600',
  wolne: 'bg-wolne-bg text-wolne-text',
  ciemna: 'bg-rope text-white',
  naCiemnym: 'bg-rope/20 text-rope-light',
}

export function Odznaka({
  children,
  ton = 'neutralna',
  wersaliki,
  pigulka,
}: {
  children: React.ReactNode
  ton?: TonOdznaki
  wersaliki?: boolean
  pigulka?: boolean
}) {
  return (
    <span
      className={[
        'inline-block text-xs font-semibold',
        pigulka ? 'rounded-full px-2.5 py-1 text-[13px]' : 'rounded px-2.5 py-1',
        wersaliki ? 'uppercase tracking-[0.08em]' : '',
        TONY[ton],
      ].join(' ')}
    >
      {children}
    </span>
  )
}

/**
 * Nagłówek sekcji z opcjonalnym linkiem „zobacz wszystko" po prawej.
 *
 * Stopień nagłówka jest PARAMETREM, nie zaszytym `<h2>`. Na stronie głównej
 * sekcje są drugiego stopnia, ale ten sam układ pojawia się na podstronach
 * pod istniejącym h2 — wtedy musi być h3, inaczej hierarchia się łamie
 * (reguła 11 dotyczy nie tylko liczby h1).
 */
export function NaglowekSekcji({
  tytul,
  opis,
  link,
  etykietaLinku,
  stopien: Stopien = 'h2',
  id,
}: {
  tytul: string
  opis?: string | null
  link?: string
  etykietaLinku?: string
  stopien?: 'h2' | 'h3'
  id?: string
}) {
  return (
    <div className="mb-9 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end sm:gap-10">
      <div className="max-w-[620px]">
        <Stopien id={id} className="text-[32px] leading-[1.05] lg:text-[44px]">
          {tytul}
        </Stopien>
        {opis && <p className="mt-3 text-[17px] leading-7 text-rock-600">{opis}</p>}
      </div>
      {link && etykietaLinku && (
        <Link
          href={link}
          className="flex shrink-0 items-center gap-2 text-base font-semibold text-rope hover:text-rope-dark"
        >
          {etykietaLinku}
          <Strzalka rozmiar={16} />
        </Link>
      )}
    </div>
  )
}

/** Kontener o szerokości z makiety (1440 px z marginesem 80 px na desktopie). */
export function Kontener({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 ${className}`}>
      {children}
    </div>
  )
}

/** Miejsce na zdjęcie, którego jeszcze nie mamy. Znika, gdy zdjęcie wejdzie w CMS. */
export function MiejsceNaZdjecie({
  opis,
  wysokosc = 'h-40',
  ciemne,
}: {
  opis: string
  wysokosc?: string
  ciemne?: boolean
}) {
  return (
    <div
      className={[
        'flex items-center justify-center border-b text-center',
        wysokosc,
        ciemne ? 'border-rock-line bg-rock-800' : 'border-rock-200 bg-rock-100',
      ].join(' ')}
    >
      <span
        className={`px-4 text-[11px] font-semibold uppercase tracking-[0.06em] ${ciemne ? 'text-rock-500' : 'text-rock-400'}`}
      >
        {opis}
      </span>
    </div>
  )
}
