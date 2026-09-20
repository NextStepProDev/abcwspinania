/**
 * Jedno źródło pozycji menu.
 *
 * Nagłówek (desktop i mobile) oraz stopka czytają stąd. Trzymanie tego w trzech
 * miejscach kończy się tym, że nowa podstrona pojawia się w dwóch z nich.
 *
 * Świadomie NIE jest to treść z CMS-a: struktura nawigacji wynika z tego, jakie
 * trasy istnieją w kodzie, więc pozwolenie na jej edycję w panelu pozwalałoby
 * wyłącznie zepsuć ją linkiem do nieistniejącej strony.
 */
export interface PozycjaMenu {
  href: string
  etykieta: string
}

export const MENU_GLOWNE: PozycjaMenu[] = [
  { href: '/', etykieta: 'Start' },
  { href: '/kursy', etykieta: 'Kursy' },
  { href: '/obozy', etykieta: 'Obozy i wyjazdy' },
  { href: '/terminarz', etykieta: 'Terminarz' },
  { href: '/aktualnosci', etykieta: 'Aktualności' },
  { href: '/o-nas', etykieta: 'O nas' },
  { href: '/kontakt', etykieta: 'Kontakt' },
]

export const MENU_OFERTA: PozycjaMenu[] = [
  { href: '/kursy', etykieta: 'Kursy' },
  { href: '/obozy', etykieta: 'Obozy i wyjazdy' },
  { href: '/terminarz', etykieta: 'Terminarz' },
  { href: '/opinie', etykieta: 'Opinie kursantów' },
]

export const MENU_SZKOLA: PozycjaMenu[] = [
  { href: '/o-nas', etykieta: 'O nas' },
  { href: '/aktualnosci', etykieta: 'Aktualności' },
  { href: '/kontakt', etykieta: 'Kontakt' },
  { href: '/en', etykieta: 'In English' },
]

/**
 * Czy pozycja menu odpowiada bieżącej ścieżce.
 *
 * `/` musi być porównywane dokładnie — inaczej `startsWith` zaznaczyłoby
 * „Start" na każdej podstronie serwisu.
 */
export function czyAktywna(href: string, sciezka: string): boolean {
  return href === '/' ? sciezka === '/' : sciezka === href || sciezka.startsWith(`${href}/`)
}
