import type { CollectionConfig } from 'payload'

/** School staff — the "Instruktorzy" section on the About page. */
export const Instructors: CollectionConfig = {
  slug: 'instructors',
  labels: { singular: 'Instruktor', plural: 'Instruktorzy' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'order'],
    group: 'Treść',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Imię i nazwisko' },
    {
      name: 'role',
      type: 'text',
      label: 'Funkcja',
      admin: { description: 'Np. „Szef szkoły, instruktor PZA”.' },
    },
    {
      name: 'license',
      type: 'text',
      label: 'Numer licencji',
      admin: { description: 'Np. „PZA 366/WS”. Można sprawdzić na liście Związku.' },
    },
    {
      name: 'bio',
      type: 'textarea',
      maxLength: 1200,
      label: 'O instruktorze',
      admin: { description: 'Od kiedy się wspina, czym się zajmuje, ulubiony rejon.' },
    },
    { name: 'portrait', type: 'upload', relationTo: 'media', label: 'Zdjęcie' },
    { name: 'order', type: 'number', defaultValue: 0, label: 'Kolejność' },
  ],
}
