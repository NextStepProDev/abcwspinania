import { APIError, type CollectionConfig } from 'payload'

import { recountSession } from '../lib/bookingEffects'
import { exportSessionHandler } from '../lib/sessionExport'

import { anyone, isAdmin } from '../lib/access'

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
 * Spots left are COUNTED from bookings when the session has a capacity
 * (decided 02.10.2026, `lib/bookingEffects.ts`): capacity minus the active
 * bookings, and `open` ↔ `waitlist` switches by itself. A phone booking
 * counts once the school adds it under "Zapisy". Without a capacity nothing
 * is counted and the site says "ask about places".
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
    read: anyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: 'startDate',
  // The participant list as a spreadsheet — see `lib/sessionExport.ts`.
  endpoints: [{ path: '/:id/export', method: 'get', handler: exportSessionHandler }],
  hooks: {
    beforeDelete: [
      // A session with bookings is never deleted: the bookings' `session` is
      // required, so Postgres refuses anyway (measured 03.10.2026) — but with
      // "Failed query: delete from sessions", which tells the school nothing.
      // This says why and what to do instead; the history stays.
      async ({ id, req }) => {
        const { totalDocs } = await req.payload.count({
          collection: 'bookings',
          where: { session: { equals: id } },
          req,
          overrideAccess: true,
        })
        if (totalDocs > 0) {
          throw new APIError(
            `Ten termin ma zapisy (${totalDocs}). Zamiast usuwać, ustaw status „odwołany” albo „zakończony” — zniknie ze strony, a zapisy zostaną w historii.`,
            400,
            null,
            true,
          )
        }
      },
    ],
    afterChange: [
      // A new capacity changes the spots left. Skipped for the recount's own
      // write (`context.recountingSpots`), which would otherwise call itself.
      async ({ doc, previousDoc, operation, req, context }) => {
        if (context.recountingSpots) return doc
        if (operation === 'update' && previousDoc?.capacity === doc.capacity) return doc
        try {
          await recountSession(req.payload, doc.id, req)
        } catch (error) {
          req.payload.logger.error({ err: error }, 'Failed to recount session spots')
        }
        return doc
      },
    ],
  },
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
            description:
              'Liczone samo z zapisów, gdy podana jest liczba miejsc. Ręcznie tylko bez niej; puste = „zapytaj o miejsca”.',
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
    {
      name: 'bookings',
      type: 'join',
      collection: 'bookings',
      on: 'session',
      label: 'Zapisani',
      admin: {
        defaultColumns: ['label', 'status', 'phone'],
        description: 'Wszystkie zapisy na ten termin — także rezerwowe i rezygnacje.',
      },
    },
    {
      // A button on the session's page that downloads its participant list.
      name: 'exportLink',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/admin/SessionExportLink#SessionExportLink' },
      },
    },
  ],
}
