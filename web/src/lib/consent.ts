import { CONTROLLER_SHORT } from '@/lib/legal'

/**
 * The consent text stored alongside a message.
 *
 * One source: the same string goes under the form and into the database. If the
 * clause lived separately in the view and in the write path, a change of wording
 * would leave no way to show what a given person actually consented to.
 *
 * Versioned by date: change the text — change `CONSENT_VERSION` too, so the
 * clauses can be told apart in the database.
 */
export const CONSENT_VERSION = '2026-10-06'

export const CONSENT_TEXT =
  'Wyrażam zgodę na przetwarzanie moich danych osobowych (imię, adres e-mail, ' +
  'numer telefonu) w celu udzielenia odpowiedzi na przesłane zapytanie. ' +
  `Administratorem danych jest ${CONTROLLER_SHORT}. Podanie danych jest ` +
  'dobrowolne, a zgodę mogę wycofać w każdej chwili. Szczegóły w polityce prywatności.'

/** What goes into the database: the text plus its version, so the row stands alone. */
export function consentForStorage(): string {
  return `[${CONSENT_VERSION}] ${CONSENT_TEXT}`
}

/**
 * Marketing consent for the newsletter.
 *
 * SEPARATE from the contact form consent and with its own version. It is a
 * different basis for processing: answering an enquiry versus commercial
 * mailing. A shared clause would mean everyone who ever asked a question gets
 * the newsletter — which nobody promised them.
 *
 * Versioned by date, exactly as above: change the text — change the version.
 */
export const NEWSLETTER_CONSENT_VERSION = '2026-10-06'

export const NEWSLETTER_CONSENT_TEXT =
  'Wyrażam zgodę na otrzymywanie na podany adres e-mail informacji o terminach ' +
  'kursów i obozów oraz nowych tekstach publikowanych przez ABC Wspinania. ' +
  `Administratorem danych jest ${CONTROLLER_SHORT}. Zgodę mogę wycofać w każdej ` +
  'chwili, a jej wycofanie nie wpływa na zgodność z prawem wysyłek dokonanych ' +
  'wcześniej. Szczegóły w polityce prywatności.'

export function newsletterConsentForStorage(): string {
  return `[${NEWSLETTER_CONSENT_VERSION}] ${NEWSLETTER_CONSENT_TEXT}`
}

/**
 * Accepted when creating a participant account.
 *
 * Its own text and version, apart from the contact and newsletter clauses:
 * an account is a different processing purpose (keeping a profile and the
 * sign-ups made from it) and must not be stretched into marketing — the
 * newsletter keeps its own consent. Same rule: change the text, change the
 * version.
 */
export const ACCOUNT_CONSENT_VERSION = '2026-10-06'

export const ACCOUNT_CONSENT_TEXT =
  'Zakładam konto w serwisie ABC Wspinania i wyrażam zgodę na przetwarzanie ' +
  'moich danych (imię, nazwisko, adres e-mail, numer telefonu) w celu ' +
  'prowadzenia konta i obsługi zapisów, których przez nie dokonam. ' +
  `Administratorem danych jest ${CONTROLLER_SHORT}. Konto mogę w każdej chwili ` +
  'usunąć sam w Moim koncie. Szczegóły w polityce prywatności.'

export function accountConsentForStorage(): string {
  return `[${ACCOUNT_CONSENT_VERSION}] ${ACCOUNT_CONSENT_TEXT}`
}

/**
 * Accepted with every course booking — its own purpose (organising the
 * course the person signs up for), so its own text and version.
 */
export const BOOKING_CONSENT_VERSION = '2026-10-06'

export const BOOKING_CONSENT_TEXT =
  'Wyrażam zgodę na przetwarzanie moich danych (imię, nazwisko, adres e-mail, ' +
  'numer telefonu) w celu zapisu na wybrany kurs, kontaktu w jego sprawie ' +
  `i jego organizacji. Administratorem danych jest ${CONTROLLER_SHORT}. ` +
  'Szczegóły w polityce prywatności.'

export function bookingConsentForStorage(): string {
  return `[${BOOKING_CONSENT_VERSION}] ${BOOKING_CONSENT_TEXT}`
}

/**
 * Accepted with every camp booking — given by the PARENT, for their own
 * details and the children's names (the rest of the child's details come
 * with the registration form, under its own clause). Its own purpose
 * (signing a child up for a camp), so its own text and version.
 */
export const CAMP_BOOKING_CONSENT_VERSION = '2026-10-20'

export const CAMP_BOOKING_CONSENT_TEXT =
  'Wyrażam zgodę na przetwarzanie moich danych (imię, nazwisko, adres e-mail, ' +
  'numer telefonu) oraz imienia i nazwiska dziecka w celu zapisu dziecka na ' +
  'wybrany obóz, kontaktu w jego sprawie i jego organizacji. ' +
  `Administratorem danych jest ${CONTROLLER_SHORT}. Szczegóły w polityce prywatności.`

export function campBookingConsentForStorage(): string {
  return `[${CAMP_BOOKING_CONSENT_VERSION}] ${CAMP_BOOKING_CONSENT_TEXT}`
}

/**
 * The camp registration form (step 2): the child's details and HEALTH data.
 * Health data is a special category (art. 9 GDPR) and needs explicit
 * consent; the clause says what is collected, why, and when the health data
 * and the PESEL go (`CAMP_HEALTH_RETENTION_MONTHS` in `lib/expiry.ts` — the
 * sentence below repeats it, change both).
 */
export const CAMP_REGISTRATION_CONSENT_VERSION = '2026-10-20'

export const CAMP_REGISTRATION_CONSENT_TEXT =
  'Wyrażam zgodę na przetwarzanie danych mojego dziecka podanych w tym formularzu ' +
  '(PESEL, data urodzenia, wzrost) oraz informacji o jego zdrowiu (uczulenia, ' +
  'przyjmowane leki, dieta, choroby) w celu zawarcia umowy, organizacji obozu ' +
  'i zapewnienia dziecku bezpieczeństwa i opieki. PESEL i informacje o zdrowiu ' +
  'usuwamy miesiąc po zakończeniu obozu. ' +
  `Administratorem danych jest ${CONTROLLER_SHORT}. Szczegóły w polityce prywatności.`

export function campRegistrationConsentForStorage(): string {
  return `[${CAMP_REGISTRATION_CONSENT_VERSION}] ${CAMP_REGISTRATION_CONSENT_TEXT}`
}

/**
 * The parent's consent to the camp's activities — required (Krzysiek,
 * 20.10.2026). Not a data clause: it is what the child will do, stored as
 * text like the others so the wording at the time can be shown.
 */
export const CAMP_ACTIVITIES_CONSENT_VERSION = '2026-10-20'

export const CAMP_ACTIVITIES_CONSENT_TEXT =
  'Wyrażam zgodę na udział mojego dziecka w zajęciach wspinaczkowych, linowych ' +
  'i sportowych prowadzonych w czasie obozu przez instruktorów ABC Wspinania.'

export function campActivitiesConsentForStorage(): string {
  return `[${CAMP_ACTIVITIES_CONSENT_VERSION}] ${CAMP_ACTIVITIES_CONSENT_TEXT}`
}

/**
 * Optional consent to publish photos of the child (decided 19.10.2026): the
 * school sees on the list whom not to show. The form asks for "yes" or "no",
 * neither preselected (24.10.2026, `validateRegistrationChild`); this text is
 * the "yes". Withdrawn by answering "no" in the form again, or by the school
 * in the panel.
 */
export const PHOTO_CONSENT_VERSION = '2026-10-20'

export const PHOTO_CONSENT_TEXT =
  'Wyrażam zgodę na publikowanie zdjęć i nagrań z obozu, na których widać moje ' +
  'dziecko, na stronie ABC Wspinania i w jej mediach społecznościowych. Zgodę mogę ' +
  `wycofać w każdej chwili. Administratorem danych jest ${CONTROLLER_SHORT}. ` +
  'Szczegóły w polityce prywatności.'

export function photoConsentForStorage(): string {
  return `[${PHOTO_CONSENT_VERSION}] ${PHOTO_CONSENT_TEXT}`
}
