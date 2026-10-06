/**
 * Addresses of the old Joomla site (abcwspinania.info until the switch) and
 * where each one lives now — `redirects()` in `next.config.ts`, permanent
 * (308), so search engines move the old page's standing to the new one and
 * saved links keep working.
 *
 * Collected 05.10.2026 by walking every internal link of the old site (it had
 * no sitemap): about forty content pages, plus the calendar and the tag
 * lists, which generate addresses without end and are covered by one prefix
 * each.
 *
 * Rules:
 *  - EXACT old paths only, never a pattern over a prefix the new site uses
 *    (`/kursy/*`, `/aktualnosci/*`, `/obozy/*`). The new post
 *    `/aktualnosci/25-lat-abc-wspinania` starts with digits just like the old
 *    `/aktualnosci/107-20lat` — a "numbered slug" pattern would swallow it.
 *    `legacyRedirects.test.ts` checks every source against the new routes.
 *  - Each old page goes to its counterpart when there is one; an old article
 *    that was not carried over goes to `/aktualnosci`, an old "about" page to
 *    `/o-nas`.
 *  - Paths only. Next.js matches the path and passes the query string on, so
 *    `/aktualnosci?start=10` (old pagination) simply opens `/aktualnosci`.
 *
 * Pure data, no imports — read by `next.config.ts` and by the test.
 */

export interface LegacyRedirect {
  source: string
  destination: string
}

/** Old path → new path, one per old page. */
const PAGES: [string, string][] = [
  // Home and Joomla's own entry point.
  ['/index.php', '/'],

  // Courses.
  ['/kursy/kurs-skalkowy-pza', '/kursy/kurs-wspinaczki-skalnej-pza'],
  ['/kursy/kurs-tradowy', '/kursy/kurs-asekuracji-tradycyjnej'],
  ['/kursy/kursnaubezpioeczonych', '/kursy/kurs-na-drogach-ubezpieczonych'],
  ['/kursy/na-sztucznej-sciance', '/kursy/kurs-na-sztucznej-sciance'],
  ['/kursy/cennikkursow', '/kursy'],
  ['/kursy/opinie', '/opinie'],
  ['/kursy/19-sample-data/joomla/22-o-abcwspinania', '/o-nas'],

  // Camps and trips ("Rekreacja" on the old site).
  ['/rekreacja', '/obozy'],
  ['/rekreacja/obozy-jura-lato', '/obozy/oboz-przygodowy'],
  ['/rekreacja/obozy-jura-lato/terminy-i-ceny', '/terminarz'],
  ['/rekreacja/zielonewycieczki', '/obozy/wycieczki-i-zielone-szkoly'],
  ['/rekreacja/jaskinia', '/aktualnosci/jaskinia-berkowa'],
  ['/rekreacja/73-wspinanie-dzieci', '/aktualnosci/wspinanie-i-dzieci'],
  ['/rekreacja/rekomendacje', '/opinie'],
  ['/rekreacja/jaskinia/79-ciekawostki/112-25lat', '/aktualnosci/25-lat-abc-wspinania'],
  ['/rekreacja/jaskinia/79-ciekawostki/75-jura-historiawspinania', '/aktualnosci'],
  ['/rekreacja/jaskinia/79-ciekawostki/94-leonidio-grecja-marzec-2018', '/aktualnosci'],

  // About the school.
  ['/home-page/hiden', '/o-nas'],
  ['/home-page/hiden/historia', '/o-nas'],
  ['/home-page/instrktorpza', '/aktualnosci/dlaczego-instruktor-pza'],

  // Articles with a counterpart.
  ['/79-ciekawostki/112-25lat', '/aktualnosci/25-lat-abc-wspinania'],
  ['/aktualnosci/79-dlaczego-instruktor-pza', '/aktualnosci/dlaczego-instruktor-pza'],
  ['/aktualnosci/101-dzickopowinnosiewspinac', '/aktualnosci/wspinanie-i-dzieci'],
  ['/aktualnosci/106-zapisy', '/obozy/oboz-przygodowy'],
  ['/aktualnosci/57-inenglish', '/en'],
  ['/aktualnosci/107-20lat', '/o-nas'],

  // Articles not carried over — the news list.
  ['/aktualnosci/100-nieprzewidywalnosc-wspinaczki', '/aktualnosci'],
  ['/aktualnosci/102-zakonczenie-sezonu-2019', '/aktualnosci'],
  ['/aktualnosci/103-z-najlepszymi-zyczeniami-dla-was-i-waszych-pociech', '/aktualnosci'],
  ['/aktualnosci/104-jura-bez-wirusa', '/aktualnosci'],
  ['/aktualnosci/108-wosp', '/aktualnosci'],
  ['/aktualnosci/109-technikaruchu', '/aktualnosci'],
  ['/aktualnosci/110-zakonczeniesezonu2023', '/aktualnosci'],
  ['/aktualnosci/111-skale', '/aktualnosci'],
  ['/aktualnosci/84-filmy', '/aktualnosci'],
  ['/aktualnosci/87-przygotowania-do-sezonu-wspinaczkowego', '/aktualnosci'],
  ['/aktualnosci/88-obryw-w-scianie-anica-kuk', '/aktualnosci'],
  ['/aktualnosci/95-weekendowa-akademia-wspinania', '/aktualnosci'],
]

/**
 * Whole old sections — every address under them, of which there is no
 * fixed list: the calendar makes a page for every day, week and month, the
 * tag pages one per tag. None of these prefixes exists on the new site.
 */
const SECTIONS: [string, string][] = [
  ['/kalendarz', '/terminarz'],
  ['/list-of-all-tags', '/aktualnosci'],
  ['/tagged-items', '/aktualnosci'],
]

export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  ...PAGES.map(([source, destination]) => ({ source, destination })),
  ...SECTIONS.flatMap(([section, destination]) => [
    { source: section, destination },
    { source: `${section}/:rest*`, destination },
  ]),
  // Joomla answers the same page under `/index.php/<path>` too, and some
  // links to the old site carry it. Strip it; the rules above then apply.
  { source: '/index.php/:rest*', destination: '/:rest*' },
]
