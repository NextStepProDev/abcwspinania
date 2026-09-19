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
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      label: 'Zdjęcie',
    },
  ],
}
