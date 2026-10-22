import type { GlobalConfig } from 'payload'

import { isAdmin } from '../lib/access'
import { DEFAULT_PRE_CAMP_TEMPLATE, PRE_CAMP_REMINDER_DAYS } from '../lib/campPreCamp'

/**
 * "Ustawienia obozów" — what the camp paperwork needs once, not per turnus:
 * the organiser's stamp and signature for the contract (Krzysiek, 22.10.2026:
 * "OK — pieczątka z podpisem"), when to remind the school about the email
 * before a camp, and that email's standard part.
 *
 * School only, read included: the signature is a private file, and the
 * template is an internal draft.
 */
export const CampConfig: GlobalConfig = {
  slug: 'camp-config',
  label: 'Ustawienia obozów',
  admin: { group: 'Ustawienia' },
  access: { read: isAdmin, update: isAdmin },
  fields: [
    {
      name: 'contractSignature',
      type: 'upload',
      relationTo: 'private-files',
      label: 'Pieczątka z podpisem do umowy',
      admin: {
        description:
          'Wstawiana do każdej umowy obozowej w miejsce podpisu organizatora. PNG albo JPG, najlepiej na białym tle. Bez niej umowa wychodzi z pustym miejscem na podpis.',
      },
    },
    {
      name: 'preCampReminderDays',
      type: 'number',
      min: 1,
      max: 60,
      defaultValue: PRE_CAMP_REMINDER_DAYS,
      required: true,
      label: 'Przypomnienie o mailu przed obozem — ile dni przed turnusem',
      admin: {
        description:
          'Tyle dni przed początkiem turnusu dostaniesz mail z linkiem do gotowego szkicu wiadomości dla rodziców.',
      },
    },
    {
      name: 'preCampTemplate',
      type: 'textarea',
      defaultValue: DEFAULT_PRE_CAMP_TEMPLATE,
      label: 'Część standardowa maila przed obozem',
      admin: {
        rows: 18,
        description:
          'Wstawiana do szkicu wysyłki dla rodziców z danego turnusu. Fragmenty w nawiasach kwadratowych, np. [miejsce zbiórki], uzupełniasz w szkicu. Pusta linia = nowy akapit, linia zaczynająca się od „- ” = punkt listy.',
      },
    },
  ],
}
