import type { CollectionConfig } from 'payload'

/**
 * Obozy, wycieczki i zajęcia cykliczne.
 *
 * ŚWIADOMIE osobna kolekcja od `Kursy`, mimo że oba typy mają nazwę, cenę,
 * opis i terminy. Powód jest po stronie panelu, nie kodu: obóz opisuje się
 * innymi pytaniami (dla jakiego wieku, czy z noclegiem, jak wygląda dzień),
 * a wrzucenie obu w jedną kolekcję z przełącznikiem dawałoby formularz,
 * w którym połowa pól jest zawsze nieistotna.
 *
 * Pole `typ` rozróżnia trzy rzeczy, które łączy sposób opisu, a dzieli
 * miejsce na stronie: tygodniowe obozy, jednorazowe wyjazdy (wycieczki
 * szkolne, wejścia jaskiniowe) i zajęcia cykliczne.
 */
export const Obozy: CollectionConfig = {
  slug: 'obozy',
  labels: {
    singular: 'Obóz lub wyjazd',
    plural: 'Obozy i wyjazdy',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'typ', 'cena', 'order'],
    group: 'Treść',
  },
  access: {
    read: () => true,
  },
  versions: {
    drafts: true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'typ',
      type: 'select',
      required: true,
      defaultValue: 'oboz',
      label: 'Rodzaj pozycji',
      options: [
        { label: 'obóz (kilkudniowy, z noclegiem)', value: 'oboz' },
        { label: 'wyjazd lub wycieczka (jednorazowa)', value: 'wyjazd' },
        { label: 'zajęcia cykliczne', value: 'zajecia' },
      ],
      admin: {
        description: 'Obozy pokazują się osobno, wyjazdy i zajęcia w sekcji „Poza obozami”.',
      },
    },
    { name: 'title', type: 'text', required: true, label: 'Nazwa' },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Adres (slug)',
      admin: { description: 'Fragment adresu, np. „oboz-mlodziezowy”. Bez polskich znaków.' },
    },
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 400,
      label: 'Krótki opis',
      admin: { description: 'Na kafel. Dwa–trzy zdania.' },
    },
    { name: 'description', type: 'richText', label: 'Pełny opis' },
    {
      type: 'row',
      fields: [
        {
          name: 'wiekOd',
          type: 'number',
          min: 0,
          label: 'Wiek od',
          admin: { width: '50%' },
        },
        {
          name: 'wiekDo',
          type: 'number',
          min: 0,
          label: 'Wiek do',
          admin: { width: '50%', description: 'Puste przy obu polach = brak ograniczeń wieku.' },
        },
      ],
    },
    {
      name: 'poziom',
      type: 'select',
      label: 'Dla kogo',
      options: [
        { label: 'rekreacyjny — bez doświadczenia', value: 'rekreacyjny' },
        { label: 'zaawansowany — po kursie wspinaczkowym', value: 'zaawansowany' },
      ],
      admin: {
        description: 'Odpowiednik oznaczeń R i Z używanych w nazwach turnusów.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'cena',
          type: 'number',
          min: 0,
          label: 'Cena (zł)',
          admin: { width: '50%', description: 'Puste znaczy „wycena indywidualna”.' },
        },
        {
          name: 'cenaOd',
          type: 'checkbox',
          label: 'Pokaż jako „od tej kwoty”',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'jednostkaCeny',
      type: 'text',
      label: 'Dopisek przy cenie',
      admin: { description: 'Np. „/ mies.” przy zajęciach cyklicznych. Zwykle puste.' },
    },
    {
      name: 'czas',
      type: 'text',
      label: 'Czas trwania',
      admin: { description: 'Opisowo, np. „8 dni” albo „1,5 h tygodniowo”.' },
    },
    {
      name: 'grupaMax',
      type: 'number',
      min: 1,
      label: 'Maksymalna liczba uczestników',
    },
    { name: 'miejsce', type: 'text', label: 'Miejsce' },
    {
      type: 'row',
      fields: [
        {
          name: 'nocleg',
          type: 'checkbox',
          label: 'Nocleg w cenie',
          admin: { width: '50%' },
        },
        {
          name: 'wyzywienie',
          type: 'checkbox',
          label: 'Wyżywienie w cenie',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'atrakcje',
      type: 'array',
      label: 'Co w programie',
      labels: { singular: 'Pozycja', plural: 'Pozycje' },
      fields: [{ name: 'pozycja', type: 'text', required: true, label: 'Pozycja' }],
    },
    {
      name: 'planDnia',
      type: 'array',
      label: 'Jak wygląda dzień',
      labels: { singular: 'Punkt dnia', plural: 'Punkty dnia' },
      admin: { description: 'Dotyczy obozów. Przy wyjazdach zwykle puste.' },
      fields: [
        { name: 'godzina', type: 'text', required: true, label: 'Godzina' },
        { name: 'tytul', type: 'text', required: true, label: 'Co się dzieje' },
        { name: 'opis', type: 'textarea', maxLength: 400, label: 'Szczegóły' },
      ],
    },
    {
      name: 'ikona',
      type: 'select',
      label: 'Ikona',
      defaultValue: 'gory',
      options: [
        { label: 'góry', value: 'gory' },
        { label: 'ludzie', value: 'ludzie' },
        { label: 'dom', value: 'dom' },
        { label: 'tarcza', value: 'tarcza' },
      ],
      admin: { description: 'Używana w sekcji „Poza obozami”, gdy nie ma zdjęcia.' },
    },
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Zdjęcie' },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Kolejność',
      admin: { description: 'Mniejsza liczba = wyżej na liście.' },
    },
  ],
}
