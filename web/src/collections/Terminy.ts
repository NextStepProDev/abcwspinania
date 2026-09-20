import type { CollectionConfig } from 'payload'

/**
 * Terminy kursów i obozów — jedno źródło dla terminarza, kart kursów
 * i sekcji „najbliższe terminy" na stronie głównej.
 *
 * Termin wskazuje ALBO kurs, ALBO obóz. Payload umie relację polimorficzną
 * (`relationTo: ['kursy','obozy']`), ale daje ona wartość o kształcie
 * `{ relationTo, value }`, którą trzeba rozpakowywać przy każdym użyciu.
 * Dwa osobne, opcjonalne pola są czytelniejsze i w panelu, i w kodzie —
 * kosztem jednej reguły walidacji, która pilnuje, żeby wypełnione było
 * dokładnie jedno.
 *
 * Wolnych miejsc NIE liczymy — wpisuje je Krzysiek. Rezerwacje online to
 * osobny, późniejszy etap; do tego czasu licznik wyliczany z czegokolwiek
 * w bazie byłby fikcją, bo zapisy idą telefonicznie i mailem.
 */
export const Terminy: CollectionConfig = {
  slug: 'terminy',
  labels: {
    singular: 'Termin',
    plural: 'Terminy',
  },
  admin: {
    useAsTitle: 'etykieta',
    defaultColumns: ['etykieta', 'dataOd', 'wolneMiejsca', 'status'],
    group: 'Treść',
    description: 'Kalendarz kursów i obozów. Najbliższe terminy są u góry.',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'dataOd',
  fields: [
    {
      name: 'etykieta',
      type: 'text',
      label: 'Podpis na liście',
      admin: {
        readOnly: true,
        description: 'Składany automatycznie z dat i nazwy — służy tylko do rozpoznania wpisu.',
      },
      hooks: {
        // Bez tego lista terminów w panelu pokazywałaby same identyfikatory
        // i nie dałoby się w niej niczego znaleźć.
        beforeChange: [
          async ({ data, req }) => {
            if (!data?.dataOd) return data?.etykieta
            const od = new Date(data.dataOd)
            const doD = data.dataDo ? new Date(data.dataDo) : null
            const fmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })
            const zakres = doD
              ? `${fmt.format(od)}–${fmt.format(doD)} ${doD.getFullYear()}`
              : `${fmt.format(od)} ${od.getFullYear()}`

            let nazwa = ''
            try {
              if (data.kurs) {
                const d = await req.payload.findByID({
                  collection: 'kursy',
                  id: data.kurs,
                  depth: 0,
                })
                nazwa = d?.title ?? ''
              } else if (data.oboz) {
                const d = await req.payload.findByID({
                  collection: 'obozy',
                  id: data.oboz,
                  depth: 0,
                })
                nazwa = d?.title ?? ''
              }
            } catch {
              // Podpis jest wygodą, nie danymi — gdy powiązanego wpisu nie da
              // się odczytać, zostaje sam zakres dat zamiast błędu zapisu.
            }
            return nazwa ? `${zakres} · ${nazwa}` : zakres
          },
        ],
      },
    },
    {
      name: 'kurs',
      type: 'relationship',
      relationTo: 'kursy',
      label: 'Kurs',
      admin: {
        description: 'Wypełnij ALBO to pole, ALBO „Obóz lub wyjazd” — nie oba naraz.',
      },
      validate: (value: unknown, { data }: { data: Partial<{ oboz: unknown }> }) => {
        if (value && data?.oboz) return 'Termin dotyczy kursu albo obozu, nie obu naraz.'
        if (!value && !data?.oboz) return 'Wskaż kurs albo obóz, którego dotyczy ten termin.'
        return true
      },
    },
    {
      name: 'oboz',
      type: 'relationship',
      relationTo: 'obozy',
      label: 'Obóz lub wyjazd',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'dataOd',
          type: 'date',
          required: true,
          label: 'Od',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
          },
        },
        {
          name: 'dataDo',
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
      name: 'miejsce',
      type: 'text',
      label: 'Miejsce',
      admin: { description: 'Np. „Rzędkowice”. Puste = weźmiemy miejsce z kursu lub obozu.' },
    },
    {
      name: 'cena',
      type: 'number',
      min: 0,
      label: 'Cena dla tego terminu (zł)',
      admin: { description: 'Puste = cena z kursu lub obozu. Wypełnij tylko przy odstępstwie.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'limitMiejsc',
          type: 'number',
          min: 1,
          label: 'Liczba miejsc',
          admin: { width: '50%' },
        },
        {
          name: 'wolneMiejsca',
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
      defaultValue: 'otwarty',
      required: true,
      label: 'Status',
      options: [
        { label: 'zapisy otwarte', value: 'otwarty' },
        { label: 'brak miejsc — lista rezerwowa', value: 'brak-miejsc' },
        { label: 'odwołany', value: 'odwolany' },
        { label: 'zakończony', value: 'zakonczony' },
      ],
      admin: {
        description: 'Odwołane i zakończone znikają ze strony, ale zostają w panelu.',
      },
    },
    {
      name: 'uwagi',
      type: 'text',
      label: 'Dopisek',
      admin: { description: 'Np. „wariant weekendowy” albo „grupa w tygodniu”.' },
    },
  ],
}
