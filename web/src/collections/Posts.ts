import type { CollectionConfig } from 'payload'

/**
 * News: course reports, history of the region, how-to guides.
 *
 * Reading time is NOT among the fields — it is computed from the content at
 * render time. Typed in by hand it drifts with the first correction to the text
 * and nobody notices, because nobody measures.
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Wpis', plural: 'Aktualności' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt'],
    group: 'Treść',
    description: 'Teksty na stronie. Najnowsze u góry.',
  },
  access: {
    read: () => true,
  },
  versions: { drafts: true },
  defaultSort: '-publishedAt',
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Tytuł' },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Adres (slug)',
      admin: { description: 'Fragment adresu, bez polskich znaków.' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'school-life',
      label: 'Temat',
      options: [
        { label: 'Z życia szkoły', value: 'school-life' },
        { label: 'Historia Jury', value: 'jura-history' },
        { label: 'Poradniki', value: 'guides' },
        { label: 'Relacje', value: 'reports' },
      ],
    },
    {
      name: 'lead',
      type: 'textarea',
      maxLength: 500,
      label: 'Zajawka',
      admin: { description: 'Dwa–trzy zdania na kafel i do opisu w wyszukiwarce.' },
    },
    { name: 'content', type: 'richText', label: 'Treść' },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      label: 'Data publikacji',
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'Krzysztof Wróbel',
      label: 'Autor',
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Pokaż jako wyróżniony',
      admin: { description: 'Duży kafel na górze listy. Sensownie: jeden wpis.' },
    },
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Zdjęcie' },
  ],
}
