import type { GlobalConfig } from 'payload'

/**
 * Strona po angielsku — JEDNA podstrona, nie pełne tłumaczenie serwisu.
 *
 * Świadoma decyzja: ruch anglojęzyczny to pojedyncze zapytania, a pełna
 * dwujęzyczność oznaczałaby tłumaczenie każdego kursu, obozu i wpisu przy
 * każdej zmianie — i w praktyce drugą wersję strony, która po pół roku jest
 * nieaktualna. Tutaj jest skrót oferty i dojazd, a ceny zaciągają się z tych
 * samych kursów co po polsku, więc nie mogą się rozjechać.
 */
export const StronaEn: GlobalConfig = {
  slug: 'strona-en',
  label: 'Strona po angielsku',
  admin: {
    group: 'Treść stron',
    description: 'Tabela kursów składa się sama z cen podanych przy kursach.',
  },
  access: { read: () => true },
  fields: [
    { name: 'badge', type: 'text', label: 'Odznaka nad nagłówkiem' },
    { name: 'tytul', type: 'text', label: 'Nagłówek' },
    { name: 'lead', type: 'textarea', maxLength: 500, label: 'Zdanie pod nagłówkiem' },
    { name: 'oNas', type: 'textarea', maxLength: 1500, label: 'Who we are' },
    { name: 'baza', type: 'textarea', maxLength: 800, label: 'Accommodation' },
    { name: 'sezon', type: 'textarea', maxLength: 800, label: 'Season and dates' },
    { name: 'dojazd', type: 'textarea', maxLength: 800, label: 'Getting here' },
    {
      name: 'kursOpis',
      type: 'text',
      label: 'Dopisek pod tabelą cen',
      admin: { description: 'Np. co jest wliczone w cenę.' },
    },
  ],
}
