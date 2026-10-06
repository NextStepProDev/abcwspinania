import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { LEGACY_REDIRECTS } from '@/lib/legacyRedirects'

/**
 * The redirects from the old site must never take over an address of the new
 * one, and must cover every old address that was found.
 */

/** Static pages of the site, read from the app directory: `.../kontakt/page.tsx` → `/kontakt`. */
function staticRoutes(): string[] {
  const root = path.join(process.cwd(), 'src/app/(frontend)')
  const routes: string[] = []
  const walk = (dir: string, url: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) {
        if (name.startsWith('[')) continue // dynamic — covered by CONTENT below
        walk(full, name.startsWith('(') ? url : `${url}/${name}`)
      } else if (name === 'page.tsx') {
        routes.push(url || '/')
      }
    }
  }
  walk(root, '')
  return routes
}

/**
 * Addresses of the content in the panel, as on 05.10.2026 (production and
 * local alike). Renaming a slug in the panel does not update this list —
 * re-check it when an old page's counterpart changes.
 */
const CONTENT = [
  '/kursy/kurs-asekuracji-tradycyjnej',
  '/kursy/kurs-do-prac-wysokosciowych',
  '/kursy/kurs-na-drogach-ubezpieczonych',
  '/kursy/kurs-na-sztucznej-sciance',
  '/kursy/kurs-wspinaczki-skalnej-pza',
  '/kursy/kurs-wspinaczki-wielowyciagowej',
  '/kursy/szkolenie-indywidualne',
  '/obozy/oboz-dla-zaawansowanych',
  '/obozy/oboz-przygodowy',
  '/obozy/wycieczki-i-zielone-szkoly',
  '/obozy/wyjscia-jaskiniowe',
  '/obozy/zajecia-dla-dzieci',
  '/aktualnosci/25-lat-abc-wspinania',
  '/aktualnosci/dlaczego-instruktor-pza',
  '/aktualnosci/jaskinia-berkowa',
  '/aktualnosci/wspinanie-i-dzieci',
]

/** Every content address of the old site found on 05.10.2026 (query strings left out). */
const OLD_SITE = [
  '/',
  '/79-ciekawostki/112-25lat',
  '/aktualnosci',
  '/aktualnosci/100-nieprzewidywalnosc-wspinaczki',
  '/aktualnosci/101-dzickopowinnosiewspinac',
  '/aktualnosci/102-zakonczenie-sezonu-2019',
  '/aktualnosci/103-z-najlepszymi-zyczeniami-dla-was-i-waszych-pociech',
  '/aktualnosci/104-jura-bez-wirusa',
  '/aktualnosci/106-zapisy',
  '/aktualnosci/107-20lat',
  '/aktualnosci/108-wosp',
  '/aktualnosci/109-technikaruchu',
  '/aktualnosci/110-zakonczeniesezonu2023',
  '/aktualnosci/111-skale',
  '/aktualnosci/57-inenglish',
  '/aktualnosci/79-dlaczego-instruktor-pza',
  '/aktualnosci/84-filmy',
  '/aktualnosci/87-przygotowania-do-sezonu-wspinaczkowego',
  '/aktualnosci/88-obryw-w-scianie-anica-kuk',
  '/aktualnosci/95-weekendowa-akademia-wspinania',
  '/home-page/hiden',
  '/home-page/hiden/historia',
  '/home-page/instrktorpza',
  '/index.php',
  '/kalendarz',
  '/kalendarz/wydarzeniawdniu/2026/10/05/-',
  '/kalendarz/szczegolywydarzenia/2026/07/01/123-oboz',
  '/kontakt',
  '/kursy',
  '/kursy/19-sample-data/joomla/22-o-abcwspinania',
  '/kursy/cennikkursow',
  '/kursy/kurs-skalkowy-pza',
  '/kursy/kurs-tradowy',
  '/kursy/kursnaubezpioeczonych',
  '/kursy/na-sztucznej-sciance',
  '/kursy/opinie',
  '/list-of-all-tags/obozy',
  '/tagged-items',
  '/rekreacja',
  '/rekreacja/73-wspinanie-dzieci',
  '/rekreacja/jaskinia',
  '/rekreacja/jaskinia/79-ciekawostki/112-25lat',
  '/rekreacja/jaskinia/79-ciekawostki/75-jura-historiawspinania',
  '/rekreacja/jaskinia/79-ciekawostki/94-leonidio-grecja-marzec-2018',
  '/rekreacja/obozy-jura-lato',
  '/rekreacja/obozy-jura-lato/terminy-i-ceny',
  '/rekreacja/rekomendacje',
  '/rekreacja/zielonewycieczki',
]

/** `/kalendarz/:rest*` → a regular expression over whole paths, the way Next matches it. */
function matcher(source: string): RegExp {
  const pattern = source
    .split('/')
    .map((part) => (part === ':rest*' ? '(?:.*)' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/')
    .replace(/\/\(\?:\.\*\)$/, '(?:/.*)?')
  return new RegExp(`^${pattern}$`)
}

function redirected(pathname: string): string | null {
  const rule = LEGACY_REDIRECTS.find((r) => matcher(r.source).test(pathname))
  if (!rule) return null
  if (rule.destination === '/:rest*') return pathname.replace(/^\/index\.php/, '') || '/'
  return rule.destination
}

const NEW_SITE = [...staticRoutes(), ...CONTENT]

test('the app directory is read — the route list is not empty', () => {
  for (const route of ['/', '/kursy', '/kontakt', '/terminarz', '/o-nas', '/aktualnosci']) {
    assert.ok(NEW_SITE.includes(route), `${route} missing from the route list`)
  }
})

test('no redirect takes over an address of the new site', () => {
  for (const route of NEW_SITE) {
    assert.equal(redirected(route), null, `${route} would be redirected`)
  }
})

test('every redirect lands on a page that exists', () => {
  for (const { source, destination } of LEGACY_REDIRECTS) {
    if (destination === '/:rest*') continue
    assert.ok(NEW_SITE.includes(destination), `${source} → ${destination}, which does not exist`)
  }
})

test('every address found on the old site is either still there or redirected', () => {
  for (const old of OLD_SITE) {
    assert.ok(NEW_SITE.includes(old) || redirected(old) !== null, `${old} would end on "not found"`)
  }
})

test('one rule per old address, and no redirect leads into another', () => {
  const sources = LEGACY_REDIRECTS.map((r) => r.source)
  assert.equal(new Set(sources).size, sources.length, 'a source appears twice')
  for (const { source, destination } of LEGACY_REDIRECTS) {
    if (destination === '/:rest*') continue
    assert.equal(redirected(destination), null, `${source} → ${destination} → redirects again`)
  }
})

test('old addresses under /index.php/ reach the same place as without it', () => {
  assert.equal(redirected('/index.php/kursy/kurs-tradowy'), '/kursy/kurs-tradowy')
  assert.equal(redirected('/kursy/kurs-tradowy'), '/kursy/kurs-asekuracji-tradycyjnej')
  assert.equal(redirected('/index.php'), '/')
})

test('the calendar and the tags are covered whole, the new schedule is not touched', () => {
  assert.equal(redirected('/kalendarz/kalendarzmiesiaca/2019/03/-'), '/terminarz')
  assert.equal(redirected('/kalendarz'), '/terminarz')
  assert.equal(redirected('/list-of-all-tags/sardynia'), '/aktualnosci')
  assert.equal(redirected('/terminarz'), null)
  assert.equal(redirected('/kalendarzyk'), null)
})
