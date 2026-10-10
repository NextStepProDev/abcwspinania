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
 * The language switch. There is an English homepage and a few translated
 * pages (`TRANSLATED_PAGES`), not a translated site, so "switching to Polish"
 * from `/en` means going to the Polish homepage.
 */
const POLISH = { code: 'pl', short: 'PL', label: 'Po polsku', href: '/' } as const
const ENGLISH = { code: 'en', short: 'EN', label: 'In English', href: '/en' } as const

/** Named rather than indexed, so reordering the switch cannot swap the languages. */
export const LANGUAGES = [POLISH, ENGLISH] as const

/**
 * Pages that exist in both languages, as [Polish, English]. On these the
 * switch leads to the same page in the other language; everywhere else to
 * the other language's homepage. Added 10.10.2026 with the English privacy
 * policy — before, "EN" on the policy led to `/en` and "PL" there back to the
 * homepage, and the policy could not be read in English at all.
 */
export const TRANSLATED_PAGES: readonly (readonly [string, string])[] = [
  ['/polityka-prywatnosci', '/en/privacy-policy'],
]

/** Where the switch to `code` leads from the page at `pathname`. */
export function languageHref(code: 'pl' | 'en', pathname: string): string {
  for (const [pl, en] of TRANSLATED_PAGES) {
    if (pathname === pl || pathname === en) return code === 'pl' ? pl : en
  }
  return code === 'pl' ? POLISH.href : ENGLISH.href
}

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
