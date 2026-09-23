import type { CollectionConfig } from 'payload'

/**
 * Course and training offer.
 *
 * This is the equivalent of the Strapi `Kurs` content type, with one crucial
 * difference: the model now lives in code, in git, and ships with the deploy.
 * In Strapi it was clicked together in the Content-Type Builder, so nothing
 * guaranteed that dev and production had the same shape.
 *
 * Identifiers are English; every `label` stays Polish because the client reads
 * them in the admin panel.
 */
export const Courses: CollectionConfig = {
  slug: 'courses',
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
    // Public read — one line instead of clicking find/findOne permissions
    // through the panel, separately in every environment.
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
      name: 'priceFrom',
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
        { label: 'początkujący', value: 'beginner' },
        { label: 'średniozaawansowany', value: 'intermediate' },
        { label: 'zaawansowany', value: 'advanced' },
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
      name: 'maxGroupSize',
      type: 'number',
      min: 1,
      label: 'Maksymalna liczba uczestników',
      admin: {
        description:
          'Na jednego instruktora. Przepisy PZA dopuszczają najwyżej 4 przy kursach skalnych.',
      },
    },
    {
      name: 'location',
      type: 'text',
      label: 'Miejsce zajęć',
      admin: { description: 'Np. „Rzędkowice” albo „Jura, rejon dobierany do grupy”.' },
    },
    {
      name: 'certificate',
      type: 'text',
      label: 'Co dostaje absolwent',
      admin: { description: 'Np. „zaświadczenie PZA”. Puste = nie pokazujemy tej pozycji.' },
    },
    {
      name: 'audience',
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
          name: 'caption',
          type: 'text',
          label: 'Podpis',
          admin: { description: 'Np. „Dzień 1”. Puste = policzymy numer automatycznie.' },
        },
        { name: 'title', type: 'text', required: true, label: 'Temat dnia' },
        { name: 'description', type: 'textarea', maxLength: 600, label: 'Co robimy' },
      ],
    },
    {
      name: 'included',
      type: 'array',
      label: 'W cenie',
      labels: { singular: 'Pozycja', plural: 'Pozycje' },
      fields: [{ name: 'item', type: 'text', required: true, label: 'Pozycja' }],
    },
    {
      name: 'excluded',
      type: 'array',
      label: 'Poza ceną',
      labels: { singular: 'Pozycja', plural: 'Pozycje' },
      fields: [{ name: 'item', type: 'text', required: true, label: 'Pozycja' }],
    },
    {
      name: 'variants',
      type: 'array',
      label: 'Warianty cenowe',
      labels: { singular: 'Wariant', plural: 'Warianty' },
      admin: {
        description:
          'Realny cennik ma warianty (inny rejon, tryb weekendowy, mniejsza grupa). ' +
          'Jeśli dodasz choć jeden, zaznacz też „Pokaż jako od tej kwoty” wyżej.',
      },
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Nazwa wariantu' },
        { name: 'price', type: 'number', min: 0, label: 'Cena (zł)' },
        { name: 'note', type: 'text', label: 'Dopisek' },
      ],
    },
    {
      name: 'faq',
      type: 'array',
      label: 'Częste pytania',
      labels: { singular: 'Pytanie', plural: 'Pytania' },
      fields: [
        { name: 'question', type: 'text', required: true, label: 'Pytanie' },
        { name: 'answer', type: 'textarea', required: true, maxLength: 800, label: 'Odpowiedź' },
      ],
    },
    {
      name: 'titleEn',
      type: 'text',
      label: 'Nazwa po angielsku',
      admin: {
        description: 'Na stronę /en. Puste = pokażemy nazwę polską.',
      },
    },
    {
      name: 'featured',
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
