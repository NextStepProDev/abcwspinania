import type { CollectionConfig } from 'payload'

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
 * Sending is not wired up yet (Brevo is a separate stage). Persisting to the
 * database works from day one and nothing is lost on the way — the addresses
 * wait for the provider to be plugged in.
 */
export const Newsletter: CollectionConfig = {
  slug: 'newsletter',
  labels: { singular: 'Zapis na newsletter', plural: 'Newsletter' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'createdAt'],
    group: 'Kontakt',
    description: 'Adresy zapisane przez formularz w stopce. Wysyłki jeszcze nie ma.',
  },
  access: {
    // Anyone may subscribe — this is a public form. Only authenticated users
    // may read or delete: a list of addresses is personal data.
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
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
      defaultValue: 'subscribed',
      required: true,
      label: 'Status',
      options: [
        { label: 'zapisany', value: 'subscribed' },
        { label: 'wypisany', value: 'unsubscribed' },
      ],
      admin: {
        description: 'Wypisanych NIE kasujemy — trzeba móc wykazać, że i kiedy ktoś zgodę wycofał.',
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
