import type { GlobalConfig } from 'payload'

/**
 * Copy for the "Obozy i wyjazdy" page.
 *
 * Only the intro under the heading lives here — the camps themselves, their
 * sessions and the daily schedule come from the `camps` and `sessions`
 * collections. The intro used to be hard-coded in the page, so every change of
 * wording needed a deploy.
 */
export const CampsPage: GlobalConfig = {
  slug: 'camps-page',
  label: 'Strona „Obozy i wyjazdy”',
  admin: {
    group: 'Treść stron',
    description: 'Obozy, terminy i plan dnia zaciągają się z osobnych list.',
  },
  access: { read: () => true },
  fields: [
    {
      name: 'intro',
      type: 'textarea',
      maxLength: 500,
      label: 'Wstęp',
      admin: { description: 'Tekst pod nagłówkiem, na ciemnym tle.' },
    },
  ],
}
