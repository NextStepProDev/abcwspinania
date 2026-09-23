import type { CollectionConfig } from 'payload'

/**
 * Scheduled runs of courses and camps — one source for the schedule page, the
 * course cards and the "upcoming dates" section on the homepage.
 *
 * A session points at EITHER a course OR a camp. Payload supports polymorphic
 * relationships (`relationTo: ['courses','camps']`), but those yield a value
 * shaped `{ relationTo, value }` that has to be unpacked at every use. Two
 * separate optional fields read better both in the panel and in the code — at
 * the cost of one validation rule making sure exactly one is filled in.
 *
 * Spots left are NOT computed — the client types them in. Online booking is a
 * separate, later stage; until then a counter derived from anything in the
 * database would be fiction, because sign-ups arrive by phone and email.
 */
export const Sessions: CollectionConfig = {
  slug: 'sessions',
  labels: {
    singular: 'Termin',
    plural: 'Terminy',
  },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'startDate', 'spotsLeft', 'status'],
    group: 'Treść',
    description: 'Kalendarz kursów i obozów. Najbliższe terminy są u góry.',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'startDate',
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Podpis na liście',
      admin: {
        readOnly: true,
        description: 'Składany automatycznie z dat i nazwy — służy tylko do rozpoznania wpisu.',
      },
      hooks: {
        // Without this the session list in the panel would show bare ids and
        // nothing in it could be found.
        beforeChange: [
          async ({ data, req }) => {
            if (!data?.startDate) return data?.label
            const from = new Date(data.startDate)
            const to = data.endDate ? new Date(data.endDate) : null
            const fmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })
            const range = to
              ? `${fmt.format(from)}–${fmt.format(to)} ${to.getFullYear()}`
              : `${fmt.format(from)} ${from.getFullYear()}`

            let name = ''
            try {
              if (data.course) {
                const d = await req.payload.findByID({
                  collection: 'courses',
                  id: data.course,
                  depth: 0,
                })
                name = d?.title ?? ''
              } else if (data.camp) {
                const d = await req.payload.findByID({
                  collection: 'camps',
                  id: data.camp,
                  depth: 0,
                })
                name = d?.title ?? ''
              }
            } catch {
              // The label is a convenience, not data — when the related entry
              // cannot be read, the date range stands alone instead of failing
              // the save.
            }
            return name ? `${range} · ${name}` : range
          },
        ],
      },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      label: 'Kurs',
      admin: {
        description: 'Wypełnij ALBO to pole, ALBO „Obóz lub wyjazd” — nie oba naraz.',
      },
      validate: (value: unknown, { data }: { data: Partial<{ camp: unknown }> }) => {
        if (value && data?.camp) return 'Termin dotyczy kursu albo obozu, nie obu naraz.'
        if (!value && !data?.camp) return 'Wskaż kurs albo obóz, którego dotyczy ten termin.'
        return true
      },
    },
    {
      name: 'camp',
      type: 'relationship',
      relationTo: 'camps',
      label: 'Obóz lub wyjazd',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startDate',
          type: 'date',
          required: true,
          label: 'Od',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
          },
        },
        {
          name: 'endDate',
          type: 'date',
          label: 'Do',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
            description: 'Puste przy zajęciach jednodniowych.',
          },
        },
      ],
    },
    {
      name: 'location',
      type: 'text',
      label: 'Miejsce',
      admin: { description: 'Np. „Rzędkowice”. Puste = weźmiemy miejsce z kursu lub obozu.' },
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      label: 'Cena dla tego terminu (zł)',
      admin: { description: 'Puste = cena z kursu lub obozu. Wypełnij tylko przy odstępstwie.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'capacity',
          type: 'number',
          min: 1,
          label: 'Liczba miejsc',
          admin: { width: '50%' },
        },
        {
          name: 'spotsLeft',
          type: 'number',
          min: 0,
          label: 'Wolne miejsca',
          admin: {
            width: '50%',
            description: 'Zmniejsz po każdym zapisie. Puste = strona napisze „zapytaj o miejsca”.',
          },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      required: true,
      label: 'Status',
      options: [
        { label: 'zapisy otwarte', value: 'open' },
        { label: 'brak miejsc — lista rezerwowa', value: 'waitlist' },
        { label: 'odwołany', value: 'cancelled' },
        { label: 'zakończony', value: 'finished' },
      ],
      admin: {
        description: 'Odwołane i zakończone znikają ze strony, ale zostają w panelu.',
      },
    },
    {
      name: 'note',
      type: 'text',
      label: 'Dopisek',
      admin: { description: 'Np. „wariant weekendowy” albo „grupa w tygodniu”.' },
    },
  ],
}
