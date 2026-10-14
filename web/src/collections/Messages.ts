import type { CollectionConfig } from 'payload'

import { isAdmin, visitorsOnly } from '../lib/access'
import { TOPICS_FOR_PAYLOAD } from '../lib/topics'
import { LANGUAGE_OPTIONS_FOR_PAYLOAD } from '../lib/email/language'
import { publicUrl } from '../lib/email/links'
import { newMessageNotification } from '../lib/email/templates'
import { MESSAGE_STATUS_OPTIONS } from '../lib/messages'

/**
 * Messages from the contact form.
 *
 * A form rather than a bare email address on the page: an address has to be
 * copied out by hand, a form is filled in on the spot. Some enquiries only ever
 * happen when they cost nobody an extra step.
 *
 * Messages land IN THE DATABASE first and the school is notified by email
 * second (the `afterChange` hook below). The order matters: a failed email —
 * Brevo down, daily limit reached — is logged and the message still waits in
 * the panel. The other way round, an email outage would lose enquiries.
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
    // Visitors and participants create — this is a public form. The school
    // does not (decided 10.10.2026): its "Stwórz nowy" was Payload's default,
    // and an entry made there emailed the school itself and asked for a
    // consent nobody gave. Only the school may read, change or delete:
    // messages carry personal data (name, email, phone).
    // NOT `Boolean(req.user)` — a logged-in participant is not the school.
    create: visitorsOnly,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: '-createdAt',
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const to = process.env.ADMIN_NOTIFY_EMAIL
        if (!to) {
          req.payload.logger.warn(
            'ADMIN_NOTIFY_EMAIL is not set — no notification for a new message',
          )
          return doc
        }
        try {
          let courseTitle: string | null = null
          if (doc.course) {
            const id = typeof doc.course === 'object' ? doc.course.id : doc.course
            const course = await req.payload.findByID({ collection: 'courses', id, depth: 0, req })
            courseTitle = course?.title ?? null
          }
          const email = newMessageNotification({
            ...doc,
            courseTitle,
            adminUrl: `${publicUrl()}/admin/collections/messages/${doc.id}`,
          })
          await req.payload.sendEmail({
            to,
            // Replying to the notification answers the person who wrote.
            replyTo: { name: doc.name, address: doc.email },
            subject: email.subject,
            html: email.html,
            text: email.text,
          })
        } catch (error) {
          // The message is already saved — a failed notification must not
          // turn the visitor's successful submission into an error.
          req.payload.logger.error({ err: error }, 'Failed to send the new-message notification')
        }
        return doc
      },
    ],
  },
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
        description:
          'Wybrane przez osobę piszącą. Przy „Kurs” — który, w polu „Dotyczy kursu”. Wypełnia się samo, gdy pisze z podstrony kursu.',
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
        description:
          'Wybrany przez osobę piszącą (lista kursów ze strony) albo wypełniony sam, gdy pisze z podstrony kursu.',
      },
    },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'pl',
      label: 'Język odpowiedzi',
      options: LANGUAGE_OPTIONS_FOR_PAYLOAD,
      admin: {
        readOnly: true,
        description: 'Z ustawień przeglądarki osoby piszącej — w tym języku warto odpisać.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      label: 'Status',
      options: [...MESSAGE_STATUS_OPTIONS],
      admin: {
        // Changed straight in the list (`MessageStatusCell`).
        components: { Cell: '/components/admin/MessageStatusCell#MessageStatusCell' },
      },
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
