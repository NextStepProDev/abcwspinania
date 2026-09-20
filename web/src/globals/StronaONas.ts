import type { GlobalConfig } from 'payload'

/** Teksty podstrony „O nas”. */
export const StronaONas: GlobalConfig = {
  slug: 'strona-o-nas',
  label: 'Strona „O nas”',
  admin: {
    group: 'Treść stron',
    description: 'Instruktorzy zaciągają się z osobnej listy.',
  },
  access: { read: () => true },
  fields: [
    { name: 'tytul', type: 'text', label: 'Nagłówek' },
    { name: 'wstep', type: 'textarea', maxLength: 900, label: 'Wstęp' },
    { name: 'tresc', type: 'richText', label: 'Historia szkoły' },
    {
      name: 'powodyLicencji',
      type: 'array',
      label: 'Dlaczego licencja PZA ma znaczenie',
      maxRows: 3,
      labels: { singular: 'Powód', plural: 'Powody' },
      fields: [
        { name: 'tytul', type: 'text', required: true, label: 'Nagłówek' },
        { name: 'opis', type: 'textarea', required: true, maxLength: 500, label: 'Opis' },
      ],
    },
    {
      name: 'liczbyJura',
      type: 'array',
      label: 'Liczby o rejonie',
      maxRows: 4,
      labels: { singular: 'Liczba', plural: 'Liczby' },
      fields: [
        { name: 'wartosc', type: 'text', required: true, label: 'Wartość' },
        { name: 'opis', type: 'text', required: true, label: 'Podpis' },
      ],
    },
    { name: 'oJurze', type: 'textarea', maxLength: 900, label: 'O wspinaniu na Jurze' },
    { name: 'zdjecie', type: 'upload', relationTo: 'media', label: 'Zdjęcie' },
  ],
}
