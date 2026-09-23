/**
 * One source for the menu entries.
 *
 * The header (desktop and mobile) and the footer both read from here. Keeping
 * this in three places ends with a new page appearing in two of them.
 *
 * Deliberately NOT content from the CMS: the navigation structure follows from
 * which routes exist in the code, so allowing it to be edited in the panel would
 * only ever permit breaking it with a link to a page that does not exist.
 *
 * The hrefs stay Polish — they are the site's public URLs, read by visitors and
 * indexed by search engines.
 */
export interface NavItem {
  href: string
  label: string
}

export const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Start' },
  { href: '/kursy', label: 'Kursy' },
  { href: '/obozy', label: 'Obozy i wyjazdy' },
  { href: '/terminarz', label: 'Terminarz' },
  { href: '/aktualnosci', label: 'Aktualności' },
  { href: '/o-nas', label: 'O nas' },
  { href: '/kontakt', label: 'Kontakt' },
]

export const OFFER_NAV: NavItem[] = [
  { href: '/kursy', label: 'Kursy' },
  { href: '/obozy', label: 'Obozy i wyjazdy' },
  { href: '/terminarz', label: 'Terminarz' },
  { href: '/opinie', label: 'Opinie kursantów' },
]

export const SCHOOL_NAV: NavItem[] = [
  { href: '/o-nas', label: 'O nas' },
  { href: '/aktualnosci', label: 'Aktualności' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/en', label: 'In English' },
]

/**
 * Whether a menu entry matches the current path.
 *
 * `/` has to be compared exactly — otherwise `startsWith` would mark "Start"
 * active on every page of the site.
 */
export function isActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}
