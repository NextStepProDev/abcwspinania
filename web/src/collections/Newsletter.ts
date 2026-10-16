import type { CollectionConfig } from 'payload'

import { isAdmin } from '../lib/access'
import { LANGUAGE_OPTIONS_FOR_PAYLOAD } from '../lib/email/language'
import { unsubscribeHandler } from '../lib/newsletter'

/**
 * Newsletter subscriptions.
 *
 * A separate collection from `Messages`, even though both collect email
 * addresses: this is a different legal basis for processing (marketing consent
 * versus answering an enquiry), a different retention period and a different
 * withdrawal path. Keeping them together ends with the newsletter going out to
 * people who merely asked a question.
 *
 * As with the contact form, WE STORE THE CONSENT TEXT, not a bare "yes" — once
 * the wording of the clause changes there is otherwise no way to show what a
 * given person actually agreed to.
 *
 * DOUBLE OPT-IN (decided 03.10.2026): the form creates the address as
 * `pending` and emails a confirmation link; only `subscribed` addresses get
 * broadcasts. Without it anyone could sign up someone else's address, and
 * the "this is spam" clicks that follow can get the Brevo account blocked.
 * Addresses from before that date stay `subscribed` — they gave the same
 * consent, the stored clause shows which.
 *
 * Written only by the site's server actions (`kontakt/actions.ts`,
 * `newsletter/*`): REST `create` is closed, otherwise a POST to
 * `/api/newsletter` could set `status: subscribed` and skip the confirmation.
 *
 * One `token` per address, for the confirmation link and the unsubscribe
 * link in every newsletter. A new one is drawn each time the address goes
 * back to `pending`, never while it is subscribed — unsubscribe links in
 * emails already sent keep working.
 */
export const Newsletter: CollectionConfig = {
  slug: 'newsletter',
  labels: { singular: 'Zapis na newsletter', plural: 'Newsletter' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'createdAt'],
    group: 'Kontakt',
    description:
      'Adresy zapisane przez formularz w stopce. Wysyłki dostają tylko adresy „zapisany” — czyli potwierdzone kliknięciem w link z maila. Niepotwierdzone znikają same po 7 dniach.',
  },
  access: {
    // The form writes through a server action (see above); REST is the
    // school's only. A list of addresses is personal data.
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: '-createdAt',
  endpoints: [
    // The one-click unsubscribe from the `List-Unsubscribe-Post` header
    // (RFC 8058) — Gmail and others show an "Unsubscribe" button that POSTs here.
    { path: '/unsubscribe', method: 'post', handler: unsubscribeHandler },
  ],
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      label: 'Adres e-mail',
      admin: {
        description: 'Unikalny — powtórny zapis tego samego adresu nie tworzy drugiego wpisu.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      label: 'Status',
      options: [
        { label: 'czeka na potwierdzenie', value: 'pending' },
        { label: 'zapisany', value: 'subscribed' },
        { label: 'wypisany', value: 'unsubscribed' },
      ],
      admin: {
        description: 'Wypisanych NIE kasujemy — trzeba móc wykazać, że i kiedy ktoś zgodę wycofał.',
      },
    },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'pl',
      label: 'Język wiadomości',
      options: LANGUAGE_OPTIONS_FOR_PAYLOAD,
      admin: {
        description:
          'Nowy zapis dostaje polski. Ustaw angielski, a ta osoba dostanie angielską wersję wysyłki, jeśli ją dopiszesz.',
      },
    },
    {
      name: 'token',
      type: 'text',
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'confirmationSentAt',
      type: 'date',
      label: 'Link potwierdzający wysłany',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd.MM.yyyy, HH:mm' },
      },
    },
    {
      name: 'confirmedAt',
      type: 'date',
      label: 'Potwierdzony',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd.MM.yyyy, HH:mm' },
      },
    },
    {
      name: 'unsubscribedAt',
      type: 'date',
      label: 'Wypisany',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd.MM.yyyy, HH:mm' },
      },
    },
    {
      name: 'consentText',
      type: 'textarea',
      required: true,
      label: 'Treść zgody',
      admin: {
        readOnly: true,
        description: 'Dokładne brzmienie klauzuli zaakceptowanej przy zapisie.',
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
