import type { GlobalConfig } from 'payload'

/**
 * Teksty strony głównej.
 *
 * Global, a nie kolekcja, bo strona główna jest dokładnie jedna — kolekcja
 * z jednym wpisem zmusza do pilnowania, który wpis jest „tym właściwym”.
 *
 * Trzymamy tu TEKSTY i LICZBY, nie układ. Sekcje są w kodzie w ustalonej
 * kolejności; panel nie pozwala ich przestawiać i to jest celowe — dowolny
 * konstruktor stron kończy się układami, których nikt nie zaprojektował.
 */
export const StronaGlowna: GlobalConfig = {
  slug: 'strona-glowna',
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
          name: 'heroOdznaka',
          type: 'text',
          label: 'Odznaka nad nagłówkiem',
          admin: { description: 'Krótkie wyróżnienie, np. „Licencja PZA”.' },
        },
        {
          name: 'heroPodtytul',
          type: 'text',
          label: 'Tekst obok odznaki',
        },
        {
          name: 'heroTytul',
          type: 'text',
          required: true,
          label: 'Nagłówek główny',
          admin: {
            description:
              'Jedyny nagłówek pierwszego stopnia na tej stronie — nie powtarzaj go niżej.',
          },
        },
        {
          name: 'heroTekst',
          type: 'textarea',
          maxLength: 400,
          label: 'Zdanie pod nagłówkiem',
        },
      ],
    },
    {
      name: 'liczby',
      type: 'array',
      label: 'Kafle z liczbami',
      maxRows: 4,
      labels: { singular: 'Kafel', plural: 'Kafle' },
      admin: {
        description: 'Pasek pod nagłówkiem. Cztery kafle wyglądają najlepiej.',
      },
      fields: [
        { name: 'wartosc', type: 'text', required: true, label: 'Liczba lub hasło' },
        { name: 'opis', type: 'text', required: true, label: 'Podpis' },
        {
          name: 'wyrozniony',
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
        { name: 'kursyTytul', type: 'text', label: 'Nagłówek sekcji' },
        { name: 'kursyTekst', type: 'textarea', maxLength: 400, label: 'Wprowadzenie' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Sekcja „Obozy”',
      fields: [
        { name: 'obozyOdznaka', type: 'text', label: 'Odznaka' },
        { name: 'obozyTytul', type: 'text', label: 'Nagłówek' },
        { name: 'obozyTekst', type: 'textarea', maxLength: 500, label: 'Opis' },
        {
          name: 'obozyZdjecie',
          type: 'upload',
          relationTo: 'media',
          label: 'Zdjęcie',
        },
      ],
    },
    {
      name: 'dlaczego',
      type: 'array',
      label: 'Sekcja „Dlaczego instruktor z licencją”',
      maxRows: 3,
      labels: { singular: 'Powód', plural: 'Powody' },
      fields: [
        { name: 'tytul', type: 'text', required: true, label: 'Nagłówek' },
        { name: 'opis', type: 'textarea', required: true, maxLength: 400, label: 'Opis' },
        {
          name: 'ikona',
          type: 'select',
          label: 'Ikona',
          defaultValue: 'tarcza',
          options: [
            { label: 'tarcza (bezpieczeństwo, uprawnienia)', value: 'tarcza' },
            { label: 'ludzie (wielkość grupy)', value: 'ludzie' },
            { label: 'góry (teren, skała)', value: 'gory' },
            { label: 'dom (baza, nocleg)', value: 'dom' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Wezwanie na dole strony',
      fields: [
        { name: 'ctaTytul', type: 'text', label: 'Nagłówek' },
        { name: 'ctaTekst', type: 'textarea', maxLength: 300, label: 'Tekst' },
      ],
    },
  ],
}
