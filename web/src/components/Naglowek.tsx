'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'

import { Logotyp } from './Znak'
import { Telefon, Menu, Krzyzyk } from './Ikony'
import { MENU_GLOWNE, czyAktywna } from './nawigacja'

/**
 * Nagłówek serwisu.
 *
 * Komponent kliencki WYŁĄCZNIE z powodu menu mobilnego (stan otwarcia
 * i zamykanie klawiszem Escape). Treść linków renderuje się po stronie serwera
 * i jest w HTML-u także przy wyłączonym JS — zwija ją CSS, nie warunek
 * w JSX-ie. To ta sama zasada co przy rozwijanych sekcjach (reguła 9):
 * Googlebot nie klika, więc nawigacja nie może istnieć dopiero po kliknięciu.
 */
export function Naglowek({ telefon, telHref }: { telefon: string | null; telHref: string | null }) {
  const [otwarte, setOtwarte] = useState(false)
  const sciezka = usePathname()
  const [poprzedniaSciezka, setPoprzedniaSciezka] = useState(sciezka)
  const idMenu = useId()

  // Zmiana podstrony musi zamknąć menu — inaczej po kliknięciu linku panel
  // zostaje otwarty nad nową stroną.
  //
  // Korekta stanu W TRAKCIE RENDEROWANIA, a nie w `useEffect`. To wzorzec
  // opisany przez React dla „zresetuj stan, gdy zmieni się wejście": React
  // przerywa render i powtarza go od razu z nową wartością, bez dodatkowego
  // przemalowania. Wariant z efektem daje kaskadę renderów i jest wyłapywany
  // przez regułę `react-hooks/set-state-in-effect`.
  if (poprzedniaSciezka !== sciezka) {
    setPoprzedniaSciezka(sciezka)
    setOtwarte(false)
  }

  // Escape zamyka. Bez tego jedynym wyjściem jest trafienie w mały przycisk,
  // co przy nawigacji klawiaturą oznacza pułapkę.
  useEffect(() => {
    if (!otwarte) return
    const naKlawisz = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOtwarte(false)
    }
    document.addEventListener('keydown', naKlawisz)
    return () => document.removeEventListener('keydown', naKlawisz)
  }, [otwarte])

  return (
    <header className="sticky top-0 z-40 border-b border-rock-100 bg-rock-50">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:h-[76px] lg:gap-9 lg:px-20">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-rock-900">
          <Logotyp />
        </Link>

        {/* Nawigacja pozioma — od `lg`, bo przy siedmiu pozycjach niżej się nie mieści. */}
        <nav aria-label="Główna" className="hidden grow lg:block">
          <ul className="flex items-center gap-[22px]">
            {MENU_GLOWNE.map((p) => {
              const aktywna = czyAktywna(p.href, sciezka)
              return (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    aria-current={aktywna ? 'page' : undefined}
                    className={
                      aktywna
                        ? 'border-b-2 border-rope pb-0.5 text-[15px] font-semibold text-rock-900'
                        : 'text-[15px] font-medium text-rock-600 hover:text-rock-900'
                    }
                  >
                    {p.etykieta}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-0.5 lg:flex">
          <span className="rounded bg-rock-100 px-2.5 py-1.5 text-[13px] font-semibold">PL</span>
          <Link
            href="/en"
            hrefLang="en"
            className="px-2.5 py-1.5 text-[13px] font-semibold text-rock-600 hover:text-rock-900"
          >
            EN
          </Link>
        </div>

        {/* Numer w nagłówku: na dużym ekranie z podpisem, na małym sama ikona
            z etykietą dla czytnika. Renderowany tylko wtedy, gdy jest w CMS-ie —
            pusty numer dałby link `tel:` prowadzący donikąd. */}
        {telHref && (
          <a
            href={telHref}
            aria-label={telefon ? `Zadzwoń: ${telefon}` : 'Zadzwoń'}
            className="ml-auto flex shrink-0 items-center gap-2 text-[15px] font-semibold text-rock-900 lg:ml-0"
          >
            <Telefon className="text-rope" />
            <span className="hidden lg:inline">{telefon}</span>
          </a>
        )}

        <Link
          href="/kontakt"
          className="hidden shrink-0 rounded-lg bg-rope px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-rope-dark lg:block"
        >
          Zapisz się
        </Link>

        <button
          type="button"
          onClick={() => setOtwarte((o) => !o)}
          aria-expanded={otwarte}
          aria-controls={idMenu}
          aria-label={otwarte ? 'Zamknij menu' : 'Otwórz menu'}
          className="shrink-0 rounded-md p-2 text-rock-900 hover:bg-rock-100 lg:hidden"
        >
          {otwarte ? <Krzyzyk rozmiar={22} /> : <Menu rozmiar={22} />}
        </button>
      </div>

      {/* Panel mobilny. Ukrywany atrybutem `hidden`, a nie wycinany z drzewa —
          treść zostaje w HTML-u niezależnie od stanu. */}
      <div id={idMenu} hidden={!otwarte} className="border-t border-rock-100 bg-rock-50 lg:hidden">
        <nav aria-label="Główna (mobilna)" className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6">
          <ul className="flex flex-col">
            {MENU_GLOWNE.map((p) => {
              const aktywna = czyAktywna(p.href, sciezka)
              return (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    aria-current={aktywna ? 'page' : undefined}
                    className={
                      aktywna
                        ? 'block border-l-2 border-rope py-2.5 pl-3 font-semibold text-rock-900'
                        : 'block border-l-2 border-transparent py-2.5 pl-3 text-rock-600'
                    }
                  >
                    {p.etykieta}
                  </Link>
                </li>
              )
            })}
            <li className="mt-2 border-t border-rock-100 pt-3">
              <Link href="/en" hrefLang="en" className="block py-2 pl-3 text-rock-600">
                In English
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
