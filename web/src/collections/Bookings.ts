import type { CollectionConfig } from 'payload'

import { adminOrOwner, isAdmin } from '../lib/access'
import { BOOKING_STATUS_OPTIONS, statusEmailFor, type BookingStatus } from '../lib/bookings'
import { idOf, recordEmailIssue, recountSession, sendStatusEmail } from '../lib/bookingEffects'
import { LANGUAGE_OPTIONS_FOR_PAYLOAD } from '../lib/email/language'

/**
 * Bookings — one person on one session (decided 02.10.2026: a couple books
 * twice, so the school has every participant's name for the list and the
 * insurance).
 *
 * The contact details are a COPY taken at booking time, also when the booking
 * belongs to an account: what the person gave for this course stays as given,
 * even if they later edit their account — and a booking made without an
 * account has nowhere else to keep them.
 *
 * Created only by the site's server action (`kursy/[slug]/zapis/actions.ts`)
 * or by the school in the panel (a phone booking). REST create is closed:
 * a public one would let anyone fill a session with fake bookings, past the
 * form's validation and consent.
 *
 * Side effects (`lib/bookingEffects.ts`): every change recounts the session's
 * spots; a status change to confirmed / paid / cancelled emails the
 * participant (when the booking has an address). A booking the SCHOOL
 * creates in the panel sends nothing — it was arranged in person.
 */
/** How the panel names each status email when one does not go out. */
const STATUS_EMAIL_LABEL = {
  confirmed: 'Mail „miejsce potwierdzone”',
  paid: 'Mail „płatność zaksięgowana”',
  cancelled: 'Mail „zapis anulowany”',
} as const

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: {
    singular: 'Zapis',
    plural: 'Zapisy',
  },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'status', 'phone', 'createdAt'],
    group: 'Zapisy',
    description:
      'Zapisy na kursy. Zmiana statusu na „potwierdzony”, „opłacony” albo „rezygnacja” wysyła kursantowi maila. Zapis telefoniczny dodaj tu ręcznie — wtedy liczy się do wolnych miejsc.',
    listSearchableFields: ['label', 'email', 'phone'],
    // Anonymized bookings (five years after the course, `lib/expiry.ts`) are
    // a trace for statistics, not work: rows with no name would only clutter
    // the list. They stay in the database.
    baseFilter: () => ({ anonymizedAt: { exists: false } }),
  },
  access: {
    create: isAdmin,
    // Own bookings only — "Moje konto" reads through this rule.
    read: adminOrOwner('customer'),
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [
      // One spelling of every address: claiming bookings for an account
      // (`claimBookings`) and the duplicate check compare emails exactly, and
      // Postgres compares case-sensitively — a phone booking typed in the
      // panel as "Ola@Gmail.com" would never reach that person's account.
      // An empty field is no address at all (a phone booking without one),
      // so it is stored as null, not "".
      ({ data }) => {
        if (typeof data.email === 'string') data.email = data.email.trim().toLowerCase() || null
        return data
      },
      // The list label: "Ola Nowak · 4–9 maj 2027 · Kurs PZA", from the
      // session's own label — without it the panel would list bare ids.
      async ({ data, req, originalDoc }) => {
        const sessionId = idOf(data.session ?? originalDoc?.session)
        let sessionLabel = ''
        if (sessionId) {
          try {
            const session = await req.payload.findByID({
              collection: 'sessions',
              id: sessionId,
              depth: 0,
              joins: false,
              req,
              overrideAccess: true,
            })
            sessionLabel = session?.label ?? ''
          } catch {
            // A label is a convenience — never a reason to fail the save.
          }
        }
        const name = [
          data.firstName ?? originalDoc?.firstName,
          data.lastName ?? originalDoc?.lastName,
        ]
          .filter(Boolean)
          .join(' ')
        data.label = [name, sessionLabel].filter(Boolean).join(' · ')
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req, context }) => {
        // A note about a failed email (`recordEmailIssue`) changes nothing to count.
        if (context.skipRecount) return doc
        const sessionId = idOf(doc.session)
        const previousSessionId = idOf(previousDoc?.session)
        try {
          if (sessionId) await recountSession(req.payload, sessionId, req)
          // Moved to another session: the old one got a place back.
          if (previousSessionId && previousSessionId !== sessionId)
            await recountSession(req.payload, previousSessionId, req)
        } catch (error) {
          req.payload.logger.error({ err: error }, 'Failed to recount session spots')
        }

        if (operation !== 'update' || context.skipStatusEmail) return doc
        const previousStatus = previousDoc?.status as BookingStatus | undefined
        let status = statusEmailFor(previousStatus, doc.status as BookingStatus)
        // "Paid" emails only before the course starts (`statusEmailFor`), so
        // that one needs the session's first day. `joins: false` — the
        // session's join carries every participant's data.
        if (status === 'paid' && sessionId) {
          // A failed read must not fail the save: without the start the
          // email goes, as it did before this rule.
          const session = await req.payload
            .findByID({
              collection: 'sessions',
              id: sessionId,
              depth: 0,
              joins: false,
              overrideAccess: true,
              disableErrors: true,
              req,
            })
            .catch(() => null)
          status = statusEmailFor(previousStatus, doc.status as BookingStatus, session?.startDate)
        }
        if (!status) return doc
        try {
          await sendStatusEmail(req.payload, doc, status, req)
        } catch (error) {
          // The status is saved; a failed email must not undo it — but the
          // school must learn that the participant was not told.
          await recordEmailIssue(req.payload, doc.id, STATUS_EMAIL_LABEL[status], error, req)
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const sessionId = idOf(doc.session)
        if (!sessionId) return
        try {
          await recountSession(req.payload, sessionId, req)
        } catch (error) {
          req.payload.logger.error({ err: error }, 'Failed to recount session spots')
        }
      },
    ],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Zapis',
      admin: {
        readOnly: true,
        description: 'Składany automatycznie z imienia, nazwiska i terminu.',
      },
    },
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'sessions',
      required: true,
      index: true,
      label: 'Termin',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      label: 'Status',
      options: BOOKING_STATUS_OPTIONS,
      admin: {
        // A select in the list itself — see the component.
        components: { Cell: '/components/admin/BookingStatusCell#BookingStatusCell' },
        description:
          '„Lista rezerwowa” i „rezygnacja” nie zajmują miejsca. Zmiana na „potwierdzony” lub „rezygnacja” wysyła kursantowi maila; na „opłacony” — tylko przed pierwszym dniem kursu.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'firstName',
          type: 'text',
          required: true,
          maxLength: 120,
          label: 'Imię',
          admin: { width: '50%' },
        },
        {
          name: 'lastName',
          type: 'text',
          required: true,
          maxLength: 120,
          label: 'Nazwisko',
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          // Optional for the school only (decided 12.10.2026): someone booking
          // by phone may have no address to give. The site's form still
          // requires one (`validateBooking`). Without it nothing is emailed —
          // no status emails, no broadcasts — and the phone is the contact.
          name: 'email',
          type: 'email',
          index: true,
          label: 'E-mail',
          admin: {
            width: '50%',
            description:
              'Można pominąć przy zapisie telefonicznym — wtedy ta osoba nie dostaje maili ani wysyłek.',
          },
        },
        {
          name: 'phone',
          type: 'text',
          required: true,
          maxLength: 30,
          label: 'Telefon',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      maxLength: 2000,
      label: 'Uwagi od kursanta',
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      label: 'Notatki szkoły',
      // The participant reads their own booking (Moje konto, REST): the
      // school's notes are not part of what they see.
      access: { read: isAdmin },
      admin: { description: 'Widoczne tylko w panelu — kursant ich nie widzi.' },
    },
    {
      // Set by `recordEmailIssue` when an email to the participant did not go
      // out; counted on the dashboard until the school ticks "Załatwione".
      name: 'emailIssue',
      type: 'text',
      label: 'Mail, który nie doszedł',
      access: { read: isAdmin },
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data) => Boolean(data?.emailIssue),
        description: 'Kursant tego maila nie dostał — skontaktuj się sam i zaznacz „Załatwione”.',
      },
    },
    {
      name: 'emailIssueAt',
      type: 'date',
      label: 'Kiedy',
      index: true,
      access: { read: isAdmin },
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data) => Boolean(data?.emailIssue),
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd.MM.yyyy, HH:mm' },
      },
    },
    {
      name: 'emailIssueHandled',
      type: 'checkbox',
      label: 'Załatwione',
      defaultValue: false,
      access: { read: isAdmin },
      admin: {
        position: 'sidebar',
        condition: (data) => Boolean(data?.emailIssue),
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      index: true,
      label: 'Konto uczestnika',
      admin: {
        position: 'sidebar',
        description:
          'Puste przy zapisie bez konta. Zapis trafia na konto, gdy osoba potwierdzi ten sam adres.',
      },
    },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'pl',
      required: true,
      label: 'Język maili',
      options: LANGUAGE_OPTIONS_FOR_PAYLOAD,
      admin: { position: 'sidebar' },
    },
    // --- GDPR: the clause accepted with this booking ---
    {
      name: 'consentText',
      type: 'textarea',
      label: 'Treść zgody',
      admin: {
        readOnly: true,
        description: 'Przy zapisie przez stronę. Puste przy zapisie dodanym ręcznie w panelu.',
      },
    },
    {
      name: 'consentDate',
      type: 'date',
      label: 'Data zgody',
      admin: { readOnly: true },
    },
    {
      name: 'anonymizedAt',
      type: 'date',
      index: true,
      label: 'Zanonimizowany',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'Dane osobowe usunięte po okresie przechowywania — zostały termin i status, do statystyk.',
        condition: (data) => Boolean(data?.anonymizedAt),
      },
    },
  ],
  timestamps: true,
}
