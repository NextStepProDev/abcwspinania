import type { CollectionConfig } from 'payload'

/**
 * Admin panel accounts.
 *
 * A difference from Strapi worth remembering: there were TWO independent worlds
 * of users there (panel administrators and, separately, API users from the
 * users-permissions plugin) that knew nothing of each other. Here logging in is
 * an ordinary property of a collection (`auth: true`), so participant accounts
 * at the booking stage will simply be a second collection using the same
 * mechanism.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  // Polish labels — without them Payload derives the name from the slug and
  // "Users" stuck out in the menu next to "Kursy", "Opinie" and "Wiadomości".
  // The client operates this panel, not a developer.
  labels: {
    singular: 'Konto',
    plural: 'Konta panelu',
  },
  admin: {
    useAsTitle: 'email',
    group: 'System',
  },
  auth: true,
  // No `access.read: () => true` — account data is not public. Payload requires
  // authentication by default, so we deliberately do NOT open this up.
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Imię i nazwisko',
    },
  ],
}
