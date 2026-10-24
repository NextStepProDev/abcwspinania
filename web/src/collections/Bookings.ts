import {
  APIError,
  type CollectionConfig,
  type FieldHook,
  type RelationshipFieldSingleValidation,
} from 'payload'

import { adminOrOwner, isAdmin } from '../lib/access'
import {
  BOOKING_KIND_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  kindMismatch,
  sessionFilterFor,
  statusEmailForKind,
  type BookingStatus,
} from '../lib/bookings'
import { BOOKINGS_DESCRIPTION } from '../lib/bookingsList'
import { idOf, recordEmailIssue, recountSession, sendStatusEmail } from '../lib/bookingEffects'
import { LANGUAGE_OPTIONS_FOR_PAYLOAD } from '../lib/email/language'
import {
  contractHandler,
  movedUpFromWaitlist,
  registrationLinkHandler,
  sendRegistrationLink,
} from '../lib/campRegistration'

/**
 * "Zduplikuj" in the panel is how the school adds a sibling by phone: the
 * copy keeps the parent and the turnus, but everything of the FIRST child's
 * sign-up starts again — the status (a copy of a paid booking was "paid"),
 * the form link (sharing it would put the copy into the other child's form
 * and contract), the form, the deposit, the contract and the photo consent,
 * which was given for that child only.
 */
const clearOnDuplicate: FieldHook = () => null
const noOnDuplicate: FieldHook = () => false
/** The copy is a new child: a new sign-up, not one already paid for. */
const newOnDuplicate: FieldHook = () => 'new'

/** A field the camp booking needs and the course booking does not have. */
function requiredOnCamp(message: string) {
  return (value: unknown, { data }: { data: Partial<{ kind: unknown }> }) =>
    data?.kind !== 'camp' || (value !== null && value !== undefined && String(value).trim() !== '')
      ? true
      : message
}

/**
 * The session must be of the booking's kind — the save-time half of the
 * panel's `filterOptions`, with a message that says what to change.
 */
const sessionMatchesKind: RelationshipFieldSingleValidation = async (value, { data, req }) => {
  // One collection, no polymorphism: an id, or the session itself when populated.
  const sessionId = idOf(value as number | { id: number } | null | undefined)
  if (!sessionId) return 'Wybierz termin.'
  const session = await req.payload.findByID({
    collection: 'sessions',
    id: sessionId,
    depth: 0,
    joins: false,
    overrideAccess: true,
    disableErrors: true,
    req,
  })
  if (!session) return 'Nie ma takiego terminu.'
  const sessionKind = session.camp ? 'camp' : session.course ? 'course' : null
  return kindMismatch((data as { kind?: unknown })?.kind, sessionKind) ?? true
}

/**
 * Bookings — one person on one session (decided 02.10.2026: a couple books
 * twice, so the school has every participant's name for the list and the
 * insurance).
 *
 * Course AND camp bookings, in one collection (decided 19.10.2026): the
 * spot counting, the waiting list, broadcasts, erasure and the dashboard all
 * work on this one, and a second collection would mean building and testing
 * each of them again. `kind` tells them apart; the panel menu has a link to
 * each half (`BookingsNavLinks`). On a camp booking the person's fields are
 * the PARENT's (the contact), and the participant is the child in `child*`.
 * Health data from the qualification card does NOT go here — it has a
 * shorter retention and gets its own collection.
 *
 * The contact details are a COPY taken at booking time, also when the booking
 * belongs to an account: what the person gave for this course stays as given,
 * even if they later edit their account — and a booking made without an
 * account has nowhere else to keep them.
 *
 * Created only by the site's server actions (`kursy/[slug]/zapis/actions.ts`,
 * `obozy/[slug]/zapis/actions.ts`) or by the school in the panel (a phone
 * booking). REST create is closed:
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
  deposit: 'Mail „zaliczka wpłynęła”',
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
    defaultColumns: ['participant', 'session', 'status', 'phone', 'createdAt'],
    group: 'Zapisy',
    // Under the heading the list says which half it shows — courses or
    // camps, from the menu's filter (`BookingsListDescription`).
    description: BOOKINGS_DESCRIPTION,
    components: {
      Description: '/components/admin/BookingsListDescription#BookingsListDescription',
    },
    listSearchableFields: ['label', 'email', 'phone'],
    // Anonymized bookings (five years after the course, `lib/expiry.ts`) are
    // a trace for statistics, not work: rows with no name would only clutter
    // the list. They stay in the database.
    baseFilter: () => ({ anonymizedAt: { exists: false } }),
    // Payload shows 10 rows a page; a turnus alone has more (asked for
    // 24.10.2026: more of the list at once).
    pagination: { defaultLimit: 100, limits: [25, 50, 100, 200] },
  },
  access: {
    create: isAdmin,
    // Own bookings only — "Moje konto" reads through this rule.
    read: adminOrOwner('customer'),
    update: isAdmin,
    delete: isAdmin,
  },
  // By the session's date, the nearest first — a turnus or a course is one
  // block on the list (asked for 24.10.2026: the newest-first list mixed
  // every date). New sign-ups are on the dashboard's tiles.
  defaultSort: 'sessionStart',
  endpoints: [
    { path: '/:id/registration-link', method: 'post', handler: registrationLinkHandler },
    { path: '/:id/contract', method: 'get', handler: contractHandler },
  ],
  hooks: {
    beforeDelete: [
      // The registration form goes with its booking — its `booking` is
      // required, so Postgres would refuse the delete otherwise (as with
      // sessions and their bookings), and the health data must not outlive
      // it. Covers the panel, the erasure of a person and the test cleanup.
      async ({ id, req }) => {
        // A bulk delete reports a refusal in `errors` instead of throwing —
        // without this the booking's own delete would fail on Postgres with
        // "Failed query", which says nothing about the form.
        const { errors } = await req.payload.delete({
          collection: 'camp-registrations',
          where: { booking: { equals: id } },
          overrideAccess: true,
          req,
        })
        if (errors.length) {
          throw new APIError(
            'Nie udało się usunąć formularza rejestracyjnego tego zapisu.',
            500,
            null,
            true,
          )
        }
      },
    ],
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
            // A copy for the list order — a relationship's own date is no
            // sort key the panel's list takes (see the field).
            data.sessionStart = session?.startDate ?? null
          } catch {
            // A label is a convenience — never a reason to fail the save.
          }
        }
        // A camp booking is named after the child — that is who the school
        // looks for on the list; the parent is the contact.
        const camp = (data.kind ?? originalDoc?.kind) === 'camp'
        const name = [
          camp
            ? (data.childFirstName ?? originalDoc?.childFirstName)
            : (data.firstName ?? originalDoc?.firstName),
          camp
            ? (data.childLastName ?? originalDoc?.childLastName)
            : (data.lastName ?? originalDoc?.lastName),
        ]
          .filter(Boolean)
          .join(' ')
        data.participant = name || null
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

        // A camp child moved up from the waiting list: the sign-up email had
        // no form link, so the parent gets it now. Not when the form is in.
        if (
          doc.kind === 'camp' &&
          !doc.registeredAt &&
          movedUpFromWaitlist(previousDoc?.status, doc.status)
        ) {
          await sendRegistrationLink(req.payload, doc.id, 'place', req).catch((error) =>
            req.payload.logger.error({ err: error }, 'Failed to send the registration link'),
          )
        }
        const previousStatus = previousDoc?.status as BookingStatus | undefined
        let status = statusEmailForKind(doc.kind, previousStatus, doc.status as BookingStatus)
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
          status = statusEmailForKind(
            doc.kind,
            previousStatus,
            doc.status as BookingStatus,
            session?.startDate,
          )
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
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'course',
      index: true,
      label: 'Rodzaj zapisu',
      options: BOOKING_KIND_OPTIONS,
      admin: {
        description: 'Najpierw wybierz rodzaj — lista terminów pokaże tylko pasujące.',
        // A new booking starts as the list it was created from.
        components: { Field: '/components/admin/BookingKindField#BookingKindField' },
      },
    },
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'sessions',
      required: true,
      index: true,
      label: 'Termin',
      // The panel lists only sessions of the chosen kind; `validate` holds
      // the same rule on save (it replaces Payload's own check of this
      // filter, whose message would be "nieprawidłowe wybory: 1").
      filterOptions: ({ data }) => sessionFilterFor(data?.kind),
      validate: sessionMatchesKind,
    },
    {
      // The list's first column — who (the child on a camp), apart from the
      // date and camp in "Termin" (asked for 24.10.2026: the one label with
      // both read badly). Set with the label; never shown in the form, which
      // has the names themselves.
      name: 'participant',
      type: 'text',
      index: true,
      label: 'Uczestnik',
      admin: { readOnly: true, condition: () => false },
    },
    {
      // A copy of the session's start (the label hook and `Sessions`
      // afterChange keep it in step): the list sorts and filters by it.
      // Sorting by "session.startDate" works in the Local API, but the
      // panel's filter builder cannot show such a condition — it would be
      // applied and invisible.
      name: 'sessionStart',
      type: 'date',
      index: true,
      label: 'Początek terminu',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd.MM.yyyy' },
      },
    },
    {
      name: 'status',
      hooks: { beforeDuplicate: [newOnDuplicate] },
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
          '„Lista rezerwowa” i „rezygnacja” nie zajmują miejsca. Zmiana na „potwierdzony” lub „rezygnacja” wysyła maila (kursantowi albo rodzicowi); na „opłacony” — tylko przed pierwszym dniem. Przy obozie także „zaliczka wpłacona” — rodzic dostaje maila, ile zostało do zapłaty; przy rodzeństwie jeden mail, gdy zaznaczysz ostatnie dziecko ze zgłoszenia.',
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
      // The parent's address — for the contract and the invoice (Krzysiek,
      // 21.10.2026). Asked once in the registration form and copied onto each
      // child's booking, like the contact. Not required here: a booking made
      // in the panel may not have it yet.
      type: 'row',
      admin: { condition: (data) => data?.kind === 'camp' },
      fields: [
        {
          name: 'addressStreet',
          type: 'text',
          maxLength: 200,
          label: 'Adres rodzica — ulica i numer',
          admin: { width: '50%' },
        },
        {
          name: 'addressPostcode',
          type: 'text',
          maxLength: 12,
          label: 'Kod pocztowy',
          admin: { width: '20%' },
        },
        {
          name: 'addressCity',
          type: 'text',
          maxLength: 200,
          label: 'Miejscowość',
          admin: { width: '30%' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Uczestnik obozu (dziecko)',
      admin: { condition: (data) => data?.kind === 'camp' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'childFirstName',
              type: 'text',
              maxLength: 120,
              label: 'Imię dziecka',
              validate: requiredOnCamp('Podaj imię dziecka.'),
              admin: { width: '50%' },
            },
            {
              name: 'childLastName',
              type: 'text',
              maxLength: 120,
              label: 'Nazwisko dziecka',
              validate: requiredOnCamp('Podaj nazwisko dziecka.'),
              admin: { width: '50%' },
            },
          ],
        },
        {
          // Not required: the sign-up asks only for the names, the date comes
          // with the registration form (decided 20.10.2026).
          name: 'childBirthDate',
          hooks: { beforeDuplicate: [clearOnDuplicate] },
          type: 'date',
          label: 'Data urodzenia',
          admin: {
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd.MM.yyyy' },
            description: 'Rodzic podaje ją w formularzu rejestracyjnym.',
          },
        },
        {
          // Optional, its own consent (decided 19.10.2026): the school sees
          // whom not to show in published photos. Ticked by the parent on the
          // site (with the clause stored below) or by the school after a
          // consent given in person; unticking it is the withdrawal.
          name: 'photoConsent',
          hooks: { beforeDuplicate: [noOnDuplicate] },
          type: 'checkbox',
          defaultValue: false,
          label: 'Zgoda na publikację zdjęć dziecka',
          admin: {
            description:
              'Na stronie i w mediach społecznościowych. Bez zaznaczenia — nie publikować zdjęć, na których dziecko da się rozpoznać.',
          },
        },
        {
          name: 'photoConsentText',
          hooks: { beforeDuplicate: [clearOnDuplicate] },
          type: 'textarea',
          label: 'Treść zgody na zdjęcia',
          admin: {
            readOnly: true,
            condition: (data) => Boolean(data?.photoConsentText),
          },
        },
      ],
    },
    {
      // The key in the parent's link to the registration form — the form
      // needs no account, so whoever holds the link fills it in. Hidden:
      // never in the panel or in an API response, the participant's own
      // included. Not part of the person's data copy (a key, not data).
      name: 'registrationToken',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      type: 'text',
      index: true,
      hidden: true,
    },
    {
      name: 'registrationSentAt',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      type: 'date',
      hidden: true,
    },
    {
      // The reminder (`sendRegistrationReminders`) goes once.
      name: 'registrationReminderAt',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      type: 'date',
      hidden: true,
    },
    {
      name: 'registeredAt',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      type: 'date',
      label: 'Formularz rejestracyjny wypełniony',
      index: true,
      // Shown by `RegistrationPanel` with its date — a field of its own beside
      // it said the same thing twice. Kept in the API: the list can filter by it.
      admin: { hidden: true },
    },
    {
      // The form's status, a link to its data and "Wyślij link" — see the component.
      name: 'registrationPanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.kind === 'camp',
        components: { Field: '/components/admin/RegistrationPanel#RegistrationPanel' },
      },
    },
    {
      // `DEPOSIT_DAYS` after the email with the payment details — the first
      // save of the registration form. Past it, without a deposit, the parent
      // is reminded once (`depositReminderWhere`); the place is not released.
      name: 'depositDueAt',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      type: 'date',
      label: 'Termin wpłaty zaliczki',
      index: true,
      admin: {
        position: 'sidebar',
        condition: (data) => data?.kind === 'camp',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd.MM.yyyy' },
        description:
          'Ustawia się sam po wypełnieniu formularza (7 dni). Można przesunąć, np. po rozmowie z rodzicem.',
      },
    },
    {
      // When the parent was told the deposit came — siblings get one email
      // between them, sometimes from the daily sweep (`sendWaitingDepositEmails`).
      name: 'depositEmailAt',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      type: 'date',
      hidden: true,
    },
    {
      name: 'depositReminderAt',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      type: 'date',
      hidden: true,
    },
    {
      // Set by the parent in the registration form; the school issues the
      // invoice itself (decided 20.10.2026) from "Dane do faktury"
      // (`InvoicePanel`) — to the parent, or to a company below.
      name: 'invoiceRequested',
      type: 'checkbox',
      defaultValue: false,
      label: 'Rodzic chce fakturę',
      admin: { position: 'sidebar', condition: (data) => data?.kind === 'camp' },
    },
    {
      // An invoice for a company (Krzysiek, 22.10.2026: it happens — then
      // with the NIP, through KSeF). Asked in the registration form only when
      // the parent chooses a company. Empty — the invoice is in the parent's
      // name; the school may also fill it in after a phone call.
      type: 'collapsible',
      label: 'Faktura na firmę',
      admin: {
        position: 'sidebar',
        initCollapsed: true,
        condition: (data) => data?.kind === 'camp' && Boolean(data?.invoiceRequested),
      },
      fields: [
        { name: 'invoiceCompanyName', type: 'text', maxLength: 300, label: 'Nazwa firmy' },
        { name: 'invoiceNip', type: 'text', maxLength: 13, label: 'NIP' },
        {
          name: 'invoiceCompanyAddress',
          type: 'textarea',
          maxLength: 300,
          label: 'Adres firmy',
        },
      ],
    },
    {
      // The contract (`campContract.ts`) as sent: the day it went out — the day
      // it is concluded, which the deposit's 7 days count from — and the price
      // per child that day. A later change of price in the panel leaves a
      // sent contract as it was (Krzysiek, 22.10.2026).
      name: 'contractSentAt',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      type: 'date',
      label: 'Umowa wysłana',
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data) => data?.kind === 'camp' && Boolean(data?.contractSentAt),
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd.MM.yyyy' },
      },
    },
    {
      name: 'contractPrice',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      type: 'number',
      label: 'Cena w umowie (zł)',
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data) => data?.kind === 'camp' && typeof data?.contractPrice === 'number',
      },
    },
    {
      // What the invoice needs, in one place to copy from — see the component.
      name: 'invoicePanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.kind === 'camp' && Boolean(data?.invoiceRequested),
        components: { Field: '/components/admin/InvoicePanel#InvoicePanel' },
      },
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
      hooks: { beforeDuplicate: [clearOnDuplicate] },
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
      hooks: { beforeDuplicate: [clearOnDuplicate] },
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
      hooks: { beforeDuplicate: [noOnDuplicate] },
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
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd.MM.yyyy, HH:mm' },
      },
    },
    {
      name: 'anonymizedAt',
      type: 'date',
      index: true,
      label: 'Zanonimizowany',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd.MM.yyyy, HH:mm' },
        position: 'sidebar',
        description:
          'Dane osobowe usunięte po okresie przechowywania — zostały termin i status, do statystyk.',
        condition: (data) => Boolean(data?.anonymizedAt),
      },
    },
  ],
  timestamps: true,
}
