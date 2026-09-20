import type { CollectionConfig } from 'payload'

/**
 * Opinie kursantów i rodziców.
 *
 * Podpis rozbity na `autor` i `czego` zamiast jednego pola tekstowego —
 * dzięki temu da się filtrować listę po rodzaju szkolenia bez zgadywania
 * z treści podpisu.
 *
 * Domyślnie NIEOPUBLIKOWANA. Opinia to cudza wypowiedź; wrzucenie jej na
 * stronę samym zapisaniem w panelu za łatwo kończy się publikacją czegoś,
 * na co autor się nie zgodził.
 */
export const Opinie: CollectionConfig = {
  slug: 'opinie',
  labels: { singular: 'Opinia', plural: 'Opinie' },
  admin: {
    useAsTitle: 'autor',
    defaultColumns: ['autor', 'czego', 'opublikowana', 'order'],
    group: 'Treść',
    description: 'Wypowiedzi kursantów i rodziców. Publikujemy w całości, także krytyczne.',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'tresc',
      type: 'textarea',
      required: true,
      maxLength: 2000,
      label: 'Treść opinii',
      admin: { description: 'Bez skracania. Literówki autora zostawiamy.' },
    },
    {
      name: 'autor',
      type: 'text',
      required: true,
      label: 'Podpis',
      admin: { description: 'Imię albo inicjały — nigdy pełne nazwisko bez zgody.' },
    },
    {
      name: 'czego',
      type: 'select',
      required: true,
      defaultValue: 'kurs',
      label: 'Czego dotyczy',
      options: [
        { label: 'Kurs skałkowy PZA', value: 'kurs-skalkowy' },
        { label: 'Drogi ubezpieczone', value: 'drogi-ubezpieczone' },
        { label: 'Asekuracja tradycyjna', value: 'trad' },
        { label: 'Obóz', value: 'oboz' },
        { label: 'Inne szkolenie', value: 'kurs' },
      ],
    },
    {
      name: 'termin',
      type: 'text',
      label: 'Kiedy',
      admin: { description: 'Np. „maj 2017”. Puste = nie pokazujemy daty.' },
    },
    {
      name: 'opublikowana',
      type: 'checkbox',
      defaultValue: false,
      label: 'Pokaż na stronie',
    },
    {
      name: 'naStronieGlownej',
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
