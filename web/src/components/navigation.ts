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

/**
 * Pages where the visitor is already signing up or filling in a form — and
 * the schedule itself, where the call would lead to the page it is on.
 * `/kontakt` is also the camp sign-up (`signUpPath` in `lib/bookings.ts`).
 */
const FORM_PAGES = [
  /^\/kursy\/[^/]+\/zapis$/,
  /^\/(kontakt|terminarz|logowanie|rejestracja)$/,
  /^\/(konto|newsletter)(\/|$)/,
]

/**
 * Where "Zapisz się" — the header button and the phone's bottom bar — leads
 * from the page at `pathname`, or null where it must not show. Reported
 * 12.10.2026: on the booking form the bar sent the visitor to the schedule,
 * mid-form. On a course or camp page it leads where that page's own button
 * does (a course without dates: its booking page says "write to us"); on the
 * course or camp list, to the schedule showing only those (13.10.2026 — from
 * the camps the full schedule mixed in every course). The `show` values
 * are the schedule's own filter (`terminarz/page.tsx`).
 */
export function signUpHref(pathname: string): string | null {
  if (FORM_PAGES.some((page) => page.test(pathname))) return null
  const course = /^\/kursy\/([^/]+)$/.exec(pathname)
  if (course) return `/kursy/${course[1]}/zapis`
  const camp = /^\/obozy\/([^/]+)$/.exec(pathname)
  if (camp) return `/kontakt?camp=${camp[1]}`
  if (pathname === '/kursy') return '/terminarz?show=courses'
  if (pathname === '/obozy') return '/terminarz?show=camps'
  return '/terminarz'
}
