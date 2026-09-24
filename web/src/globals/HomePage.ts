import type { GlobalConfig } from 'payload'

/**
 * Copy for the homepage.
 *
 * A global rather than a collection, because there is exactly one homepage — a
 * collection holding a single entry forces someone to keep track of which entry
 * is "the real one".
 *
 * What lives here is COPY and NUMBERS, not layout. The sections sit in code in
 * a fixed order; the panel does not allow reordering them, and that is
 * deliberate — any page builder ends in layouts nobody designed.
 */
export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Strona główna',
  admin: {
    group: 'Treść stron',
    description: 'Teksty na stronie startowej. Kursy, terminy i wpisy zaciągają się same.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Nagłówek powitalny',
      fields: [
        {
          name: 'heroBadge',
          type: 'text',
          label: 'Odznaka nad nagłówkiem',
          admin: { description: 'Krótkie wyróżnienie, np. „Licencja PZA”.' },
        },
        {
          name: 'heroSubtitle',
          type: 'text',
          label: 'Tekst obok odznaki',
        },
        {
          name: 'heroTitle',
          type: 'text',
          required: true,
          label: 'Nagłówek główny',
          admin: {
            description:
              'Jedyny nagłówek pierwszego stopnia na tej stronie — nie powtarzaj go niżej.',
          },
        },
        {
          name: 'heroText',
          type: 'textarea',
          maxLength: 400,
          label: 'Zdanie pod nagłówkiem',
        },
        {
          name: 'heroImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Zdjęcie w tle',
          admin: {
            description:
              'Szerokie, poziome zdjęcie. Lewa strona jest przyciemniana pod tekst, ' +
              'więc to, co najciekawsze, powinno być po prawej. Puste pole zostawia ' +
              'dotychczasową ilustrację grani.',
          },
        },
      ],
    },
    {
      name: 'stats',
      type: 'array',
      label: 'Kafle z liczbami',
      maxRows: 4,
      labels: { singular: 'Kafel', plural: 'Kafle' },
      admin: {
        description: 'Pasek pod nagłówkiem. Cztery kafle wyglądają najlepiej.',
      },
      fields: [
        { name: 'value', type: 'text', required: true, label: 'Liczba lub hasło' },
        { name: 'caption', type: 'text', required: true, label: 'Podpis' },
        {
          name: 'highlighted',
          type: 'checkbox',
          label: 'Wyróżnij kolorem',
          admin: { description: 'Zwykle tylko pierwszy kafel.' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Sekcja „Kursy”',
      fields: [
        { name: 'coursesTitle', type: 'text', label: 'Nagłówek sekcji' },
        { name: 'coursesText', type: 'textarea', maxLength: 400, label: 'Wprowadzenie' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Sekcja „Obozy”',
      fields: [
        { name: 'campsBadge', type: 'text', label: 'Odznaka' },
        { name: 'campsTitle', type: 'text', label: 'Nagłówek' },
        { name: 'campsText', type: 'textarea', maxLength: 500, label: 'Opis' },
        {
          name: 'campsImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Zdjęcie',
          admin: {
            description:
              'Pionowe zdjęcie w proporcji 3:4 (np. 1200 × 1600). Inne proporcje ' +
              'zostaną przycięte do tego kształtu.',
          },
        },
      ],
    },
    {
      name: 'reasons',
      type: 'array',
      label: 'Sekcja „Dlaczego instruktor z licencją”',
      maxRows: 3,
      labels: { singular: 'Powód', plural: 'Powody' },
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Nagłówek' },
        { name: 'description', type: 'textarea', required: true, maxLength: 400, label: 'Opis' },
        {
          name: 'icon',
          type: 'select',
          label: 'Ikona',
          defaultValue: 'shield',
          options: [
            { label: 'tarcza (bezpieczeństwo, uprawnienia)', value: 'shield' },
            { label: 'ludzie (wielkość grupy)', value: 'people' },
            { label: 'góry (teren, skała)', value: 'mountains' },
            { label: 'dom (baza, nocleg)', value: 'house' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Wezwanie na dole strony',
      fields: [
        { name: 'ctaTitle', type: 'text', label: 'Nagłówek' },
        { name: 'ctaText', type: 'textarea', maxLength: 300, label: 'Tekst' },
      ],
    },
  ],
}
