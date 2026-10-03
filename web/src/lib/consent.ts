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
export const CONSENT_VERSION = '2026-09-19'

export const CONSENT_TEXT =
  'Wyrażam zgodę na przetwarzanie moich danych osobowych (imię, adres e-mail, ' +
  'numer telefonu) w celu udzielenia odpowiedzi na przesłane zapytanie. ' +
  'Administratorem danych jest ABC Wspinania. Podanie danych jest dobrowolne, ' +
  'a zgodę mogę wycofać w każdej chwili.'

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
export const NEWSLETTER_CONSENT_VERSION = '2026-09-20'

export const NEWSLETTER_CONSENT_TEXT =
  'Wyrażam zgodę na otrzymywanie na podany adres e-mail informacji o terminach ' +
  'kursów i obozów oraz nowych tekstach publikowanych przez ABC Wspinania. ' +
  'Administratorem danych jest ABC Wspinania. Zgodę mogę wycofać w każdej chwili, ' +
  'a jej wycofanie nie wpływa na zgodność z prawem wysyłek dokonanych wcześniej.'

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
export const ACCOUNT_CONSENT_VERSION = '2026-10-02'

export const ACCOUNT_CONSENT_TEXT =
  'Zakładam konto w serwisie ABC Wspinania i wyrażam zgodę na przetwarzanie ' +
  'moich danych (imię, nazwisko, adres e-mail, numer telefonu) w celu ' +
  'prowadzenia konta i obsługi zapisów, których przez nie dokonam. ' +
  'Administratorem danych jest ABC Wspinania. W każdej chwili mogę poprosić ' +
  'o usunięcie konta.'

export function accountConsentForStorage(): string {
  return `[${ACCOUNT_CONSENT_VERSION}] ${ACCOUNT_CONSENT_TEXT}`
}

/**
 * Accepted with every course booking — its own purpose (organising the
 * course the person signs up for), so its own text and version.
 */
export const BOOKING_CONSENT_VERSION = '2026-10-02'

export const BOOKING_CONSENT_TEXT =
  'Wyrażam zgodę na przetwarzanie moich danych (imię, nazwisko, adres e-mail, ' +
  'numer telefonu) w celu zapisu na wybrany kurs, kontaktu w jego sprawie ' +
  'i jego organizacji. Administratorem danych jest ABC Wspinania.'

export function bookingConsentForStorage(): string {
  return `[${BOOKING_CONSENT_VERSION}] ${BOOKING_CONSENT_TEXT}`
}
