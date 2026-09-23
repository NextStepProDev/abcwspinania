import type { CollectionConfig } from 'payload'

/**
 * Camps, trips and recurring classes.
 *
 * DELIBERATELY a separate collection from `Courses`, even though both have a
 * name, a price, a description and dates. The reason is the admin panel, not
 * the code: a camp is described by different questions (what age range, is
 * accommodation included, what does a day look like), and folding both into one
 * collection behind a toggle would produce a form where half the fields are
 * always irrelevant.
 *
 * The `kind` field separates three things that share a way of being described
 * but differ in where they belong on the site: week-long camps, one-off trips
 * (school outings, cave descents) and recurring classes.
 */
export const Camps: CollectionConfig = {
  slug: 'camps',
  labels: {
    singular: 'Obóz lub wyjazd',
    plural: 'Obozy i wyjazdy',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'price', 'order'],
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
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'camp',
      label: 'Rodzaj pozycji',
      options: [
        { label: 'obóz (kilkudniowy, z noclegiem)', value: 'camp' },
        { label: 'wyjazd lub wycieczka (jednorazowa)', value: 'trip' },
        { label: 'zajęcia cykliczne', value: 'classes' },
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
          name: 'ageFrom',
          type: 'number',
          min: 0,
          label: 'Wiek od',
          admin: { width: '50%' },
        },
        {
          name: 'ageTo',
          type: 'number',
          min: 0,
          label: 'Wiek do',
          admin: { width: '50%', description: 'Puste przy obu polach = brak ograniczeń wieku.' },
        },
      ],
    },
    {
      name: 'level',
      type: 'select',
      label: 'Dla kogo',
      options: [
        { label: 'rekreacyjny — bez doświadczenia', value: 'recreational' },
        { label: 'zaawansowany — po kursie wspinaczkowym', value: 'advanced' },
      ],
      admin: {
        description: 'Odpowiednik oznaczeń R i Z używanych w nazwach turnusów.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          min: 0,
          label: 'Cena (zł)',
          admin: { width: '50%', description: 'Puste znaczy „wycena indywidualna”.' },
        },
        {
          name: 'priceFrom',
          type: 'checkbox',
          label: 'Pokaż jako „od tej kwoty”',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'priceUnit',
      type: 'text',
      label: 'Dopisek przy cenie',
      admin: { description: 'Np. „/ mies.” przy zajęciach cyklicznych. Zwykle puste.' },
    },
    {
      name: 'duration',
      type: 'text',
      label: 'Czas trwania',
      admin: { description: 'Opisowo, np. „8 dni” albo „1,5 h tygodniowo”.' },
    },
    {
      name: 'maxGroupSize',
      type: 'number',
      min: 1,
      label: 'Maksymalna liczba uczestników',
    },
    { name: 'location', type: 'text', label: 'Miejsce' },
    {
      type: 'row',
      fields: [
        {
          name: 'accommodation',
          type: 'checkbox',
          label: 'Nocleg w cenie',
          admin: { width: '50%' },
        },
        {
          name: 'meals',
          type: 'checkbox',
          label: 'Wyżywienie w cenie',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'highlights',
      type: 'array',
      label: 'Co w programie',
      labels: { singular: 'Pozycja', plural: 'Pozycje' },
      fields: [{ name: 'item', type: 'text', required: true, label: 'Pozycja' }],
    },
    {
      name: 'dailySchedule',
      type: 'array',
      label: 'Jak wygląda dzień',
      labels: { singular: 'Punkt dnia', plural: 'Punkty dnia' },
      admin: { description: 'Dotyczy obozów. Przy wyjazdach zwykle puste.' },
      fields: [
        { name: 'time', type: 'text', required: true, label: 'Godzina' },
        { name: 'title', type: 'text', required: true, label: 'Co się dzieje' },
        { name: 'description', type: 'textarea', maxLength: 400, label: 'Szczegóły' },
      ],
    },
    {
      name: 'icon',
      type: 'select',
      label: 'Ikona',
      defaultValue: 'mountains',
      options: [
        { label: 'góry', value: 'mountains' },
        { label: 'ludzie', value: 'people' },
        { label: 'dom', value: 'house' },
        { label: 'tarcza', value: 'shield' },
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
