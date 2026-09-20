import type { CollectionConfig } from 'payload'

/**
 * Aktualności: relacje z kursów, historia rejonu, poradniki.
 *
 * Czasu czytania NIE ma wśród pól — liczymy go z treści przy renderowaniu.
 * Wpisywany ręcznie rozjeżdża się przy pierwszej korekcie tekstu i nikt tego
 * nie zauważa, bo nikt nie mierzy.
 */
export const Wpisy: CollectionConfig = {
  slug: 'wpisy',
  labels: { singular: 'Wpis', plural: 'Aktualności' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kategoria', 'publishedAt'],
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
      name: 'kategoria',
      type: 'select',
      required: true,
      defaultValue: 'z-zycia-szkoly',
      label: 'Temat',
      options: [
        { label: 'Z życia szkoły', value: 'z-zycia-szkoly' },
        { label: 'Historia Jury', value: 'historia-jury' },
        { label: 'Poradniki', value: 'poradniki' },
        { label: 'Relacje', value: 'relacje' },
      ],
    },
    {
      name: 'lead',
      type: 'textarea',
      maxLength: 500,
      label: 'Zajawka',
      admin: { description: 'Dwa–trzy zdania na kafel i do opisu w wyszukiwarce.' },
    },
    { name: 'tresc', type: 'richText', label: 'Treść' },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      label: 'Data publikacji',
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
    },
    {
      name: 'autor',
      type: 'text',
      defaultValue: 'Krzysztof Wróbel',
      label: 'Autor',
    },
    {
      name: 'wyrozniony',
      type: 'checkbox',
      label: 'Pokaż jako wyróżniony',
      admin: { description: 'Duży kafel na górze listy. Sensownie: jeden wpis.' },
    },
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Zdjęcie' },
  ],
}
