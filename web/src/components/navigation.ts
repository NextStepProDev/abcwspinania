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
  { href: '/galeria', label: 'Galeria' },
  { href: '/o-nas', label: 'O nas' },
  { href: '/kontakt', label: 'Kontakt' },
]

/**
 * The language switch. There is one English page, not a translated site, so
 * "switching to Polish" from `/en` means going to the Polish homepage.
 */
const POLISH = { code: 'pl', short: 'PL', label: 'Po polsku', href: '/' } as const
const ENGLISH = { code: 'en', short: 'EN', label: 'In English', href: '/en' } as const

/** Named rather than indexed, so reordering the switch cannot swap the languages. */
export const LANGUAGES = [POLISH, ENGLISH] as const

export const OFFER_NAV: NavItem[] = [
  { href: '/kursy', label: 'Kursy' },
  { href: '/obozy', label: 'Obozy i wyjazdy' },
  { href: '/terminarz', label: 'Terminarz' },
  { href: '/opinie', label: 'Opinie kursantów' },
]

export const SCHOOL_NAV: NavItem[] = [
  { href: '/o-nas', label: 'O nas' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/aktualnosci', label: 'Aktualności' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: ENGLISH.href, label: ENGLISH.label },
]

/**
 * Which language the page at `pathname` is in. Matched by `isActive` rules, so
 * `/english-camp` would stay Polish.
 */
export function languageOf(pathname: string): (typeof LANGUAGES)[number]['code'] {
  return isActive(ENGLISH.href, pathname) ? ENGLISH.code : POLISH.code
}

/**
 * Whether a menu entry matches the current path.
 *
 * `/` has to be compared exactly — otherwise `startsWith` would mark "Start"
 * active on every page of the site.
 */
export function isActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}
