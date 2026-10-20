import type { CollectionConfig } from 'payload'

import { isAdmin } from '../lib/access'
import { idOf } from '../lib/bookingEffects'
import { HEALTH_TEXT_MAX, HEIGHT_MAX_CM, HEIGHT_MIN_CM } from '../lib/validation'

/**
 * The camp registration form (step 2 of the school's procedure, 20.10.2026):
 * the child's PESEL, height and health — one row per camp booking.
 *
 * A collection of its own, not fields on the booking, because of the
 * retention: this is deleted a month after the camp
 * (`CAMP_HEALTH_RETENTION_MONTHS`, daily sweep), while the booking stays five
 * years. Health data is a special category; keeping it apart also keeps it
 * out of everything that reads bookings — the list, the broadcasts, the
 * CSV export.
 *
 * Written only by the registration form (`obozy/rejestracja/actions.ts`,
 * after its own token check) and read only by the school. The child's birth
 * date (from the PESEL), the photo consent and the invoice request go onto
 * the booking: they outlive the camp.
 */
export const CampRegistrations: CollectionConfig = {
  slug: 'camp-registrations',
  labels: {
    singular: 'Formularz rejestracyjny',
    plural: 'Formularze rejestracyjne',
  },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'heightCm', 'allergies', 'diet', 'updatedAt'],
    group: 'Zapisy',
    description:
      'Dane z formularza rejestracyjnego obozu — PESEL i zdrowie dziecka. Usuwane same miesiąc po zakończeniu obozu.',
    listSearchableFields: ['label'],
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: '-updatedAt',
  hooks: {
    beforeChange: [
      // The list label is the booking's: "Zosia Nowak · 26 cze–3 lip 2027 · Obóz …".
      async ({ data, req, originalDoc }) => {
        const bookingId = idOf(data.booking ?? originalDoc?.booking)
        if (!bookingId) return data
        const booking = await req.payload
          .findByID({
            collection: 'bookings',
            id: bookingId,
            depth: 0,
            overrideAccess: true,
            disableErrors: true,
            req,
          })
          .catch(() => null)
        if (booking?.label) data.label = booking.label
        return data
      },
    ],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Uczestnik',
      admin: { readOnly: true },
    },
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
      required: true,
      unique: true,
      index: true,
      label: 'Zapis',
      admin: { position: 'sidebar' },
    },
    {
      name: 'pesel',
      type: 'text',
      required: true,
      maxLength: 11,
      label: 'PESEL',
    },
    {
      name: 'heightCm',
      type: 'number',
      min: HEIGHT_MIN_CM,
      max: HEIGHT_MAX_CM,
      label: 'Wzrost (cm)',
      admin: { description: 'Do zamówienia koszulek.' },
    },
    {
      name: 'allergies',
      type: 'textarea',
      maxLength: HEALTH_TEXT_MAX,
      label: 'Uczulenia',
    },
    {
      name: 'medications',
      type: 'textarea',
      maxLength: HEALTH_TEXT_MAX,
      label: 'Przyjmowane leki',
    },
    {
      name: 'diet',
      type: 'textarea',
      maxLength: HEALTH_TEXT_MAX,
      label: 'Dieta',
    },
    {
      name: 'conditions',
      type: 'textarea',
      maxLength: HEALTH_TEXT_MAX,
      label: 'Choroby i przeciwwskazania',
      admin: {
        description: 'Co może mieć wpływ na bezpieczeństwo albo zachowanie dziecka na obozie.',
      },
    },
    // --- what the parent accepted, as text (`lib/consent.ts`) ---
    {
      name: 'activitiesConsentText',
      type: 'textarea',
      label: 'Zgoda na udział w zajęciach',
      admin: { readOnly: true },
    },
    {
      name: 'consentText',
      type: 'textarea',
      label: 'Treść zgody (dane i zdrowie dziecka)',
      admin: { readOnly: true },
    },
    {
      name: 'consentDate',
      type: 'date',
      label: 'Data zgody',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
