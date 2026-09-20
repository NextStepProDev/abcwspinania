import type { CollectionConfig } from 'payload'

/**
 * Oferta kursów i szkoleń.
 *
 * To jest odpowiednik typu `Kurs` ze Strapiego — z tą różnicą, że model żyje
 * teraz w kodzie, w gicie, i jedzie z deployem. W Strapim klikało się go
 * w Content-Type Builderze, więc nic nie gwarantowało, że dev i produkcja mają
 * ten sam kształt.
 */
export const Kursy: CollectionConfig = {
  slug: 'kursy',
  labels: {
    singular: 'Kurs',
    plural: 'Kursy',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'level', 'price', 'order'],
    group: 'Treść',
  },
  access: {
    // Publiczny odczyt — jedna linijka zamiast wyklikiwania uprawnień
    // find/findOne w panelu, osobno na każdym środowisku.
    read: () => true,
  },
  versions: {
    drafts: true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Nazwa kursu',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Adres (slug)',
      admin: {
        description: 'Fragment adresu, np. "kurs-skalny-podstawowy". Bez polskich znaków.',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 300,
      label: 'Krótki opis',
      admin: {
        description: 'Jedno–dwa zdania na kafel na liście kursów.',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Pełny opis',
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      label: 'Cena (zł)',
      admin: {
        description: 'Puste pole znaczy „wycena indywidualna", a nie „0 zł".',
      },
    },
    {
      name: 'cenaOd',
      type: 'checkbox',
      label: 'Pokaż jako „od tej kwoty"',
      admin: {
        description:
          'Zaznacz, gdy kurs ma warianty droższe od podstawowego (inny rejon, ' +
          'tryb weekendowy, mniejsza grupa). Inaczej cena na kaflu byłaby nieprawdą.',
      },
    },
    {
      name: 'duration',
      type: 'text',
      label: 'Czas trwania',
      admin: {
        description: 'Opisowo, np. „2 dni" albo „4 spotkania po 3 h".',
      },
    },
    {
      name: 'level',
      type: 'select',
      label: 'Poziom',
      options: [
        { label: 'początkujący', value: 'poczatkujacy' },
        { label: 'średniozaawansowany', value: 'sredniozaawansowany' },
        { label: 'zaawansowany', value: 'zaawansowany' },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Kolejność',
      admin: {
        description: 'Mniejsza liczba = wyżej na liście.',
      },
    },
    {
      name: 'grupaMax',
      type: 'number',
      min: 1,
      label: 'Maksymalna liczba uczestników',
      admin: {
        description:
          'Na jednego instruktora. Przepisy PZA dopuszczają najwyżej 4 przy kursach skalnych.',
      },
    },
    {
      name: 'miejsce',
      type: 'text',
      label: 'Miejsce zajęć',
      admin: { description: 'Np. „Rzędkowice” albo „Jura, rejon dobierany do grupy”.' },
    },
    {
      name: 'certyfikat',
      type: 'text',
      label: 'Co dostaje absolwent',
      admin: { description: 'Np. „zaświadczenie PZA”. Puste = nie pokazujemy tej pozycji.' },
    },
    {
      name: 'dlaKogo',
      type: 'richText',
      label: 'Dla kogo jest ten kurs',
      admin: { description: 'Wymagania wstępne i do kogo kurs jest kierowany.' },
    },
    {
      name: 'program',
      type: 'array',
      label: 'Program dzień po dniu',
      labels: { singular: 'Dzień', plural: 'Dni' },
      admin: { description: 'Zostaw puste, jeśli kurs nie ma sztywnego podziału na dni.' },
      fields: [
        {
          name: 'etykieta',
          type: 'text',
          label: 'Podpis',
          admin: { description: 'Np. „Dzień 1”. Puste = policzymy numer automatycznie.' },
        },
        { name: 'tytul', type: 'text', required: true, label: 'Temat dnia' },
        { name: 'opis', type: 'textarea', maxLength: 600, label: 'Co robimy' },
      ],
    },
    {
      name: 'wCenie',
      type: 'array',
      label: 'W cenie',
      labels: { singular: 'Pozycja', plural: 'Pozycje' },
      fields: [{ name: 'pozycja', type: 'text', required: true, label: 'Pozycja' }],
    },
    {
      name: 'pozaCena',
      type: 'array',
      label: 'Poza ceną',
      labels: { singular: 'Pozycja', plural: 'Pozycje' },
      fields: [{ name: 'pozycja', type: 'text', required: true, label: 'Pozycja' }],
    },
    {
      name: 'warianty',
      type: 'array',
      label: 'Warianty cenowe',
      labels: { singular: 'Wariant', plural: 'Warianty' },
      admin: {
        description:
          'Realny cennik ma warianty (inny rejon, tryb weekendowy, mniejsza grupa). ' +
          'Jeśli dodasz choć jeden, zaznacz też „Pokaż jako od tej kwoty” wyżej.',
      },
      fields: [
        { name: 'nazwa', type: 'text', required: true, label: 'Nazwa wariantu' },
        { name: 'cena', type: 'number', min: 0, label: 'Cena (zł)' },
        { name: 'opis', type: 'text', label: 'Dopisek' },
      ],
    },
    {
      name: 'faq',
      type: 'array',
      label: 'Częste pytania',
      labels: { singular: 'Pytanie', plural: 'Pytania' },
      fields: [
        { name: 'pytanie', type: 'text', required: true, label: 'Pytanie' },
        { name: 'odpowiedz', type: 'textarea', required: true, maxLength: 800, label: 'Odpowiedź' },
      ],
    },
    {
      name: 'tytulEn',
      type: 'text',
      label: 'Nazwa po angielsku',
      admin: {
        description: 'Na stronę /en. Puste = pokażemy nazwę polską.',
      },
    },
    {
      name: 'wyrozniony',
      type: 'checkbox',
      label: 'Oznacz jako najpopularniejszy',
      admin: {
        description: 'Dokłada wyróżnioną odznakę na kaflu. Sensownie: jeden kurs.',
      },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      label: 'Zdjęcie',
    },
  ],
}
