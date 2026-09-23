import type { GlobalConfig } from 'payload'

/**
 * The English page — ONE page, not a full translation of the site.
 *
 * A deliberate decision: English-speaking traffic amounts to occasional
 * enquiries, whereas full bilingualism would mean translating every course,
 * camp and post on every change — and in practice a second version of the site
 * that is out of date within six months. What lives here is a summary of the
 * offer and how to get there; prices are pulled from the same courses as the
 * Polish side, so the two cannot drift apart.
 */
export const EnglishPage: GlobalConfig = {
  slug: 'english-page',
  label: 'Strona po angielsku',
  admin: {
    group: 'Treść stron',
    description: 'Tabela kursów składa się sama z cen podanych przy kursach.',
  },
  access: { read: () => true },
  fields: [
    { name: 'badge', type: 'text', label: 'Odznaka nad nagłówkiem' },
    { name: 'title', type: 'text', label: 'Nagłówek' },
    { name: 'lead', type: 'textarea', maxLength: 500, label: 'Zdanie pod nagłówkiem' },
    { name: 'about', type: 'textarea', maxLength: 1500, label: 'Who we are' },
    { name: 'accommodation', type: 'textarea', maxLength: 800, label: 'Accommodation' },
    { name: 'season', type: 'textarea', maxLength: 800, label: 'Season and dates' },
    { name: 'directions', type: 'textarea', maxLength: 800, label: 'Getting here' },
    {
      name: 'coursesNote',
      type: 'text',
      label: 'Dopisek pod tabelą cen',
      admin: { description: 'Np. co jest wliczone w cenę.' },
    },
  ],
}
