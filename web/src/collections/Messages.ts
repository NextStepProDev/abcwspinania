import type { CollectionConfig } from 'payload'

import { TOPICS_FOR_PAYLOAD } from '../lib/topics'

/**
 * Messages from the contact form.
 *
 * A form rather than a bare email address on the page: an address has to be
 * copied out by hand, a form is filled in on the spot. Some enquiries only ever
 * happen when they cost nobody an extra step.
 *
 * Messages land IN THE DATABASE, not in an inbox. That is deliberate: there is
 * no email adapter yet (Brevo is a separate stage), while persisting to the
 * database works from day one and nothing is lost on the way. The email
 * notification will arrive as an `afterChange` hook without changing any of
 * this.
 */
export const Messages: CollectionConfig = {
  slug: 'messages',
  labels: {
    singular: 'Wiadomość',
    plural: 'Wiadomości',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'status', 'createdAt'],
    group: 'Kontakt',
    description: 'Zgłoszenia z formularza na stronie. Nowe są u góry.',
  },
  access: {
    // ANYONE may create — this is a public form. Only authenticated users may
    // read, change or delete: messages carry personal data (name, email,
    // phone), so public read access would be a leak, not a convenience.
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 120,
      label: 'Imię',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      label: 'E-mail',
    },
    {
      name: 'phone',
      type: 'text',
      maxLength: 30,
      label: 'Telefon',
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      maxLength: 4000,
      label: 'Treść',
    },
    {
      name: 'topic',
      type: 'select',
      label: 'Czego dotyczy',
      options: TOPICS_FOR_PAYLOAD,
      admin: {
        description: 'Wybrane przez osobę piszącą. Wypełnia się samo, gdy pisze z podstrony kursu.',
      },
    },
    {
      name: 'preferredDate',
      type: 'text',
      maxLength: 200,
      label: 'Preferowany termin',
      admin: { description: 'Nieobowiązkowe, wpisywane własnymi słowami.' },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      label: 'Dotyczy kursu',
      admin: {
        description: 'Wypełnione automatycznie, gdy ktoś pisze z podstrony kursu.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      label: 'Status',
      options: [
        { label: 'nowa', value: 'new' },
        { label: 'w toku', value: 'in-progress' },
        { label: 'załatwiona', value: 'resolved' },
      ],
    },
    // --- GDPR: consent must be documented, not presumed ---
    {
      name: 'consentText',
      type: 'textarea',
      required: true,
      label: 'Treść zgody',
      admin: {
        readOnly: true,
        description:
          'Dokładne brzmienie klauzuli zaakceptowanej przez osobę wysyłającą. ' +
          'Zapisujemy TREŚĆ, a nie samo „tak" — inaczej po zmianie klauzuli ' +
          'nie da się wykazać, na co ktoś faktycznie wyraził zgodę.',
      },
    },
    {
      name: 'consentDate',
      type: 'date',
      required: true,
      label: 'Data zgody',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
