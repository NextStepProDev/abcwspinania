import type { CollectionConfig } from 'payload'

/**
 * Testimonials from course participants and parents.
 *
 * The attribution is split into `author` and `subject` rather than one free
 * text field — that way the list can be filtered by type of training without
 * guessing from the wording of the signature.
 *
 * UNPUBLISHED by default. A testimonial is someone else's statement; putting it
 * on the site by the mere act of saving in the panel too easily ends with
 * publishing something the author never agreed to.
 */
export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: 'Opinia', plural: 'Opinie' },
  admin: {
    useAsTitle: 'author',
    defaultColumns: ['author', 'subject', 'published', 'order'],
    group: 'Treść',
    description: 'Wypowiedzi kursantów i rodziców. Publikujemy w całości, także krytyczne.',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'quote',
      type: 'textarea',
      required: true,
      maxLength: 2000,
      label: 'Treść opinii',
      admin: { description: 'Bez skracania. Literówki autora zostawiamy.' },
    },
    {
      name: 'author',
      type: 'text',
      required: true,
      label: 'Podpis',
      admin: { description: 'Imię albo inicjały — nigdy pełne nazwisko bez zgody.' },
    },
    {
      name: 'subject',
      type: 'select',
      required: true,
      defaultValue: 'training',
      label: 'Czego dotyczy',
      options: [
        { label: 'Kurs skałkowy PZA', value: 'rock-course' },
        { label: 'Drogi ubezpieczone', value: 'bolted-routes' },
        { label: 'Asekuracja tradycyjna', value: 'trad' },
        { label: 'Obóz', value: 'camp' },
        { label: 'Inne szkolenie', value: 'training' },
      ],
    },
    {
      name: 'period',
      type: 'text',
      label: 'Kiedy',
      admin: { description: 'Np. „maj 2017”. Puste = nie pokazujemy daty.' },
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      label: 'Pokaż na stronie',
    },
    {
      name: 'onHomepage',
      type: 'checkbox',
      label: 'Pokaż też na stronie głównej',
      admin: { description: 'Na stronę startową wchodzą dwie pierwsze zaznaczone.' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Kolejność',
    },
  ],
}
