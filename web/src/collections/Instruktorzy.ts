import type { CollectionConfig } from 'payload'

/** Kadra szkoły — sekcja „Instruktorzy” na podstronie O nas. */
export const Instruktorzy: CollectionConfig = {
  slug: 'instruktorzy',
  labels: { singular: 'Instruktor', plural: 'Instruktorzy' },
  admin: {
    useAsTitle: 'imie',
    defaultColumns: ['imie', 'rola', 'order'],
    group: 'Treść',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    { name: 'imie', type: 'text', required: true, label: 'Imię i nazwisko' },
    {
      name: 'rola',
      type: 'text',
      label: 'Funkcja',
      admin: { description: 'Np. „Szef szkoły, instruktor PZA”.' },
    },
    {
      name: 'licencja',
      type: 'text',
      label: 'Numer licencji',
      admin: { description: 'Np. „PZA 366/WS”. Można sprawdzić na liście Związku.' },
    },
    {
      name: 'opis',
      type: 'textarea',
      maxLength: 1200,
      label: 'O instruktorze',
      admin: { description: 'Od kiedy się wspina, czym się zajmuje, ulubiony rejon.' },
    },
    { name: 'portret', type: 'upload', relationTo: 'media', label: 'Zdjęcie' },
    { name: 'order', type: 'number', defaultValue: 0, label: 'Kolejność' },
  ],
}
