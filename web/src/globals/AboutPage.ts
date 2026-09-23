import type { GlobalConfig } from 'payload'

/** Copy for the "O nas" page. */
export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'Strona „O nas”',
  admin: {
    group: 'Treść stron',
    description: 'Instruktorzy zaciągają się z osobnej listy.',
  },
  access: { read: () => true },
  fields: [
    { name: 'title', type: 'text', label: 'Nagłówek' },
    { name: 'intro', type: 'textarea', maxLength: 900, label: 'Wstęp' },
    { name: 'content', type: 'richText', label: 'Historia szkoły' },
    {
      name: 'licenceReasons',
      type: 'array',
      label: 'Dlaczego licencja PZA ma znaczenie',
      maxRows: 3,
      labels: { singular: 'Powód', plural: 'Powody' },
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Nagłówek' },
        { name: 'description', type: 'textarea', required: true, maxLength: 500, label: 'Opis' },
      ],
    },
    {
      name: 'juraFacts',
      type: 'array',
      label: 'Liczby o rejonie',
      maxRows: 4,
      labels: { singular: 'Liczba', plural: 'Liczby' },
      fields: [
        { name: 'value', type: 'text', required: true, label: 'Wartość' },
        { name: 'caption', type: 'text', required: true, label: 'Podpis' },
      ],
    },
    { name: 'aboutJura', type: 'textarea', maxLength: 900, label: 'O wspinaniu na Jurze' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Zdjęcie' },
  ],
}
