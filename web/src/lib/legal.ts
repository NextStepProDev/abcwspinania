/**
 * Who is legally responsible for the visitors' data — one place for the
 * privacy policy (`/polityka-prywatnosci`) and the consent clauses
 * (`consent.ts`), so a change of business details is one edit.
 *
 * "ABC Wspinania" is the school's NAME, not a legal entity, and a consent
 * clause naming only a brand does not say who the controller is. The school
 * is run by Krzysztof Wróbel as a sole proprietorship registered in CEIDG.
 * Checked 06.10.2026 in the Ministry of Finance white list
 * (wl-api.mf.gov.pl, NIP 6311726535: active, VAT-exempt, since 2004-06-01);
 * the business name and address from CEIDG listings, the same address as on
 * the site. The "ABC Wspinania Krzysztof Wróbel Sp. j." that business
 * directories still show has no current KRS extract — not this one.
 * ⚠️ To be confirmed by Krzysiek (asked 06.10.2026).
 *
 * Pure data — imported by `consent.ts`, which is tested under `node --test`.
 */
export const CONTROLLER = {
  person: 'Krzysztof Wróbel',
  businessName: 'IQ SERVICE Krzysztof Wróbel',
  street: 'ul. Jurajska 47',
  postcode: '42-421',
  town: 'Rzędkowice',
  nip: '631-17-26-535',
  regon: '273538759',
  /** The school's public address, the one Krzysiek answers — also for data matters. */
  email: 'biuro@abcwspinania.info',
} as const

/** For a consent clause: who, as briefly as the law allows. */
export const CONTROLLER_SHORT = `${CONTROLLER.person}, prowadzący szkołę ABC Wspinania (${CONTROLLER.businessName}, ${CONTROLLER.street}, ${CONTROLLER.postcode} ${CONTROLLER.town})`

/** The privacy policy's address, for links next to the clauses. */
export const PRIVACY_POLICY_PATH = '/polityka-prywatnosci'

/** Version of the policy text — change it with every change of substance. */
export const PRIVACY_POLICY_VERSION = '2026-10-10'
