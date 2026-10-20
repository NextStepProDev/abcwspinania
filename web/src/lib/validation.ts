import { childKey } from '@/lib/bookings'
import { pluralPl } from '@/lib/format'
import { checkPesel } from '@/lib/pesel'
import { TOPIC_VALUES } from '@/lib/topics'

/**
 * Contact form validation — pure functions, no imports from Payload or Next, so
 * they can be tested under bare `node --test`.
 *
 * The same rules apply on the server side. Validation in the browser is a
 * convenience, not a safeguard — HTML `required` attributes are bypassed by
 * anyone sending a request without the form.
 *
 * The messages are Polish because the visitor reads them.
 */

export interface ContactFormData {
  name: string
  email: string
  phone: string
  message: string
  /** A choice from a list; empty means "not specified", not an error. */
  topic: string
  /** Free text, e.g. "pierwsza połowa czerwca". */
  preferredDate: string
  consent: boolean
}

export type ValidationErrors = Partial<Record<keyof ContactFormData, string>>

const LIMITS = {
  name: 120,
  email: 254, // maximum email address length per RFC 5321
  phone: 30,
  message: 4000,
  preferredDate: 200,
} as const

// The set of allowed topics is checked server-side even though the browser
// renders a `<select>`: a request sent without the form can carry anything, and
// Payload would reject an unknown value with a database error — a 500 instead
// of a message. The list comes from `lib/topics.ts`, the shared source for the
// collection, the validation and the form.

/**
 * Deliberately liberal. Email addresses are too varied to sieve with a regular
 * expression — a stricter pattern rejects valid addresses and loses the enquiry.
 * The only thing genuinely checked is that there is an at sign with something on
 * both sides and a dot in the domain.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Shown under an unticked consent box — by the server and, earlier, by the browser. */
export const ACCOUNT_CONSENT_MISSING = 'Bez tej zgody nie możemy prowadzić konta.'
export const BOOKING_CONSENT_MISSING = 'Bez tej zgody nie możemy przyjąć zapisu.'

export function validateContact(data: ContactFormData): ValidationErrors {
  const errors: ValidationErrors = {}

  const name = data.name.trim()
  if (!name) errors.name = 'Podaj imię.'
  else if (name.length > LIMITS.name) errors.name = `Imię może mieć najwyżej ${LIMITS.name} znaków.`

  const email = data.email.trim()
  if (!email) errors.email = 'Podaj adres e-mail.'
  else if (email.length > LIMITS.email) errors.email = 'Adres e-mail jest za długi.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Ten adres e-mail wygląda na niepełny.'

  const phone = data.phone.trim()
  if (phone.length > LIMITS.phone) errors.phone = 'Numer telefonu jest za długi.'

  const message = data.message.trim()
  if (!message) errors.message = 'Napisz, w czym możemy pomóc.'
  else if (message.length > LIMITS.message)
    errors.message = `Wiadomość może mieć najwyżej ${LIMITS.message} znaków.`

  const preferredDate = data.preferredDate.trim()
  if (preferredDate.length > LIMITS.preferredDate)
    errors.preferredDate = 'Ten opis terminu jest za długi.'

  // An empty field is fine — choosing a topic is not mandatory. We only reject
  // values outside the list, because those can only come from a request forged
  // outside the form.
  const topic = data.topic.trim()
  if (topic && !TOPIC_VALUES.includes(topic)) errors.topic = 'Nie znamy takiego tematu zgłoszenia.'

  if (!data.consent) errors.consent = 'Bez zgody na przetwarzanie danych nie możemy odpisać.'

  return errors
}

export function isValid(errors: object): boolean {
  return Object.keys(errors).length === 0
}

/**
 * A honeypot for bots. The field is hidden from humans, so only an automated
 * blind form submitter fills it in. We deliberately do NOT return an error —
 * we fake success, so the bot's author never learns what gave it away.
 */
export function looksLikeBot(honeypot: string): boolean {
  return honeypot.trim().length > 0
}

/**
 * Newsletter sign-up validation.
 *
 * A separate function rather than a parameter to `validateContact()`: the
 * newsletter collects one field and a different consent, and a shared function
 * with half its fields optional stops enforcing anything very quickly.
 */
export interface NewsletterData {
  email: string
  consent: boolean
}

export type NewsletterErrors = Partial<Record<keyof NewsletterData, string>>

export function validateNewsletter(data: NewsletterData): NewsletterErrors {
  const errors: NewsletterErrors = {}

  const email = data.email.trim()
  if (!email) errors.email = 'Podaj adres e-mail.'
  else if (email.length > LIMITS.email) errors.email = 'Adres e-mail jest za długi.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Ten adres e-mail wygląda na niepełny.'

  if (!data.consent) errors.consent = 'Bez zgody nie możemy nic wysyłać.'

  return errors
}

// --- Participant accounts ----------------------------------------------------

/**
 * Password rules: length, nothing else. Composition rules ("a digit and a
 * capital") make people write `Haslo123!` on a sticky note; a long password
 * of plain words is both stronger and memorable (NIST SP 800-63B, 5.1.1.2).
 * The upper bound only stops a megabyte "password" from being hashed.
 */
export const PASSWORD_MIN = 10
const PASSWORD_MAX = 128

/**
 * Single-field rules, exported for the forms: the browser shows the same
 * messages live (`components/AccountForm.tsx`) that the server returns on
 * submit. One function, two callers — a second copy in the form would sooner
 * or later accept what the server rejects.
 */

/**
 * At least two LETTERS, and nothing but letters, spaces, hyphens,
 * apostrophes and dots. Two, not three (decided 02.10.2026): real surnames
 * (Li, Wu, Ng) and first names (Al, Ed, Bo) have two, and a rule that turns
 * a person away at the form is worse than the typo it catches.
 */
export function checkName(raw: string, empty = 'To pole jest wymagane.'): string | undefined {
  const name = raw.trim()
  if (!name) return empty
  if (name.length > LIMITS.name) return `Najwyżej ${LIMITS.name} znaków.`
  if (!/^[\p{L}\s.'’-]+$/u.test(name)) return 'Tylko litery — bez cyfr i znaków specjalnych.'
  if ((name.match(/\p{L}/gu) ?? []).length < 2) return 'Co najmniej 2 litery.'
  return undefined
}

export function checkEmail(raw: string): string | undefined {
  const email = raw.trim()
  if (!email) return 'Podaj adres e-mail.'
  if (email.length > LIMITS.email) return 'Adres e-mail jest za długi.'
  if (!EMAIL_PATTERN.test(email)) return 'Ten adres e-mail wygląda na niepełny.'
  return undefined
}

/**
 * The live counter under a new password. Below the minimum it counts towards
 * it ("3 / 10 znaków" — the noun goes with the 10); from the minimum up it
 * confirms with the real count, in proper Polish: 22 znaki, 25 znaków.
 */
export function passwordLengthLabel(length: number, min: number): string {
  if (length < min) return `${length} / ${min} znaków`
  return `Długość w porządku (${length} ${pluralPl(length, 'znak', 'znaki', 'znaków')}).`
}

export function checkNewPassword(password: string): string | undefined {
  // Not trimmed: a space is a legitimate character of a password.
  if (!password) return 'Wpisz hasło.'
  if (password.length < PASSWORD_MIN) return `Hasło musi mieć co najmniej ${PASSWORD_MIN} znaków.`
  if (password.length > PASSWORD_MAX) return `Hasło może mieć najwyżej ${PASSWORD_MAX} znaków.`
  return undefined
}

/**
 * A phone number in the international form — the same rule as Next Step
 * Pro's registration (`^\+[0-9]{1,4}[0-9]{9}$`, its `AuthDtos.java` and
 * `utils/validation.ts`), so both schools' data look alike: a plus, the
 * country code, nine digits.
 *
 * What it checks is the shape — a plus and 10 to 13 digits — not that the
 * number exists: `{1,4}` + `{9}` cannot tell "+48 and 8 digits" from "+4 and
 * 9 digits". Good enough to catch a missing country code or a typo'd length.
 *
 * One difference, deliberate: spaces, dashes and brackets are dropped BEFORE
 * checking. People type `+48 600 100 200` from habit, and rejecting the
 * exact number we asked for, only because of its spacing, loses a sign-up
 * over nothing. What is stored is the normalised form.
 */
const PHONE_PATTERN = /^\+[0-9]{1,4}[0-9]{9}$/

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-()]/g, '')
}

export function checkPhone(raw: string): string | undefined {
  const phone = normalizePhone(raw)
  if (!phone) return 'Podaj numer telefonu.'
  if (!PHONE_PATTERN.test(phone)) return 'Wpisz numer z kierunkowym kraju, np. +48 600 100 200.'
  return undefined
}

export interface RegistrationData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  consent: boolean
}

export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>

export function validateRegistration(data: RegistrationData): RegistrationErrors {
  const errors: RegistrationErrors = {}

  const firstName = checkName(data.firstName, 'Podaj imię.')
  if (firstName) errors.firstName = firstName

  const lastName = checkName(data.lastName, 'Podaj nazwisko.')
  if (lastName) errors.lastName = lastName

  const email = checkEmail(data.email)
  if (email) errors.email = email

  const phone = checkPhone(data.phone)
  if (phone) errors.phone = phone

  const password = checkNewPassword(data.password)
  if (password) errors.password = password

  if (!data.consent) errors.consent = ACCOUNT_CONSENT_MISSING

  return errors
}

/** "Twoje dane" in Moje konto — the address is not among them (see `updateAccountDetails`). */
export interface AccountDetailsData {
  firstName: string
  lastName: string
  phone: string
}

export type AccountDetailsErrors = Partial<Record<keyof AccountDetailsData, string>>

/** The same rules and messages as registration — one person, one standard. */
export function validateAccountDetails(data: AccountDetailsData): AccountDetailsErrors {
  const errors: AccountDetailsErrors = {}
  const firstName = checkName(data.firstName, 'Podaj imię.')
  if (firstName) errors.firstName = firstName
  const lastName = checkName(data.lastName, 'Podaj nazwisko.')
  if (lastName) errors.lastName = lastName
  const phone = checkPhone(data.phone)
  if (phone) errors.phone = phone
  return errors
}

/**
 * Whether the form still holds what is saved — then "Zapisz" has nothing to
 * do and stays disabled. Compared the way the server stores it (trimmed, the
 * phone without spaces), so retyping the same number with spaces is no
 * change; letter case is.
 */
export function sameAccountDetails(saved: AccountDetailsData, typed: AccountDetailsData): boolean {
  return (
    saved.firstName.trim() === typed.firstName.trim() &&
    saved.lastName.trim() === typed.lastName.trim() &&
    normalizePhone(saved.phone) === normalizePhone(typed.phone)
  )
}

export interface LoginData {
  email: string
  password: string
}

export type LoginErrors = Partial<Record<keyof LoginData, string>>

/**
 * Only presence is checked. Length rules here would tell someone probing the
 * form which passwords cannot exist — and an old account must still be able
 * to log in if the rules ever tighten.
 */
export function validateLogin(data: LoginData): LoginErrors {
  const errors: LoginErrors = {}
  const email = checkEmail(data.email)
  if (email) errors.email = email
  if (!data.password) errors.password = 'Wpisz hasło.'
  return errors
}

export function validateEmailOnly(email: string): { email?: string } {
  const error = checkEmail(email)
  return error ? { email: error } : {}
}

export function validateNewPassword(password: string): { password?: string } {
  const error = checkNewPassword(password)
  return error ? { password: error } : {}
}

/**
 * Where to go after logging in. Only a path on THIS site: `?next=` comes from
 * the address bar, and accepting `//evil.example` or `https://…` would turn
 * the login page into an open redirect for phishing.
 */
export function safeNextPath(raw: unknown, fallback = '/konto'): string {
  if (typeof raw !== 'string') return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}

// --- Course bookings ---------------------------------------------------------

export interface BookingData {
  /** The id of the chosen session, as sent by the form. */
  sessionId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
  consent: boolean
}

export type BookingErrors = Partial<Record<keyof BookingData, string>>

const NOTES_MAX = 2000

/**
 * A course booking. Logged in, the contact details come from the account,
 * so only the session, the notes and the consent are checked here; without
 * an account every contact field is — with the same rules as registration.
 */
export function validateBooking(data: BookingData, loggedIn: boolean): BookingErrors {
  const errors: BookingErrors = {}

  if (!/^[1-9]\d*$/.test(data.sessionId.trim())) errors.sessionId = 'Wybierz termin.'

  if (!loggedIn) {
    const firstName = checkName(data.firstName, 'Podaj imię.')
    if (firstName) errors.firstName = firstName
    const lastName = checkName(data.lastName, 'Podaj nazwisko.')
    if (lastName) errors.lastName = lastName
    const email = checkEmail(data.email)
    if (email) errors.email = email
    const phone = checkPhone(data.phone)
    if (phone) errors.phone = phone
  }

  if (data.notes.trim().length > NOTES_MAX)
    errors.notes = `Uwagi mogą mieć najwyżej ${NOTES_MAX} znaków.`

  if (!data.consent) errors.consent = BOOKING_CONSENT_MISSING

  return errors
}

// --- Camp bookings -----------------------------------------------------------

export interface ChildData {
  firstName: string
  lastName: string
}

/** The parent's details (the contact, as on a course) and the children. */
export interface CampBookingData extends BookingData {
  children: ChildData[]
}

export type ChildErrors = Partial<Record<keyof ChildData, string>>

export type CampBookingErrors = BookingErrors & {
  /** Per child, in the form's order; an empty slot is a child without errors. */
  children?: (ChildErrors | undefined)[]
  /** No child at all, or more than the form allows. */
  childrenCount?: string
}

/**
 * A camp booking: the parent as on a course booking (`validateBooking`), and
 * one to `maxChildren` children with a first and last name each — the rest
 * of the child's details come later, in the registration form. The same
 * child twice is caught here; the service would store it once anyway.
 */
export function validateCampBooking(
  data: CampBookingData,
  loggedIn: boolean,
  maxChildren: number,
): CampBookingErrors {
  const errors: CampBookingErrors = validateBooking(data, loggedIn)

  if (data.children.length === 0) errors.childrenCount = 'Wpisz dane dziecka.'
  else if (data.children.length > maxChildren)
    errors.childrenCount = `Jednym zgłoszeniem zapiszesz najwyżej ${maxChildren} dzieci.`

  const seen = new Set<string>()
  const children = data.children.map((child) => {
    const childErrors: ChildErrors = {}
    const firstName = checkName(child.firstName, 'Podaj imię dziecka.')
    if (firstName) childErrors.firstName = firstName
    const lastName = checkName(child.lastName, 'Podaj nazwisko dziecka.')
    if (lastName) childErrors.lastName = lastName
    const key = childKey(child.firstName, child.lastName)
    if (!firstName && !lastName && seen.has(key))
      childErrors.firstName = 'To dziecko jest już wpisane wyżej.'
    seen.add(key)
    return isValid(childErrors) ? undefined : childErrors
  })
  if (children.some(Boolean)) errors.children = children

  return errors
}

// --- Camp registration form --------------------------------------------------

export interface CampRegistrationData {
  pesel: string
  /** Centimetres, as typed. */
  height: string
  allergies: string
  medications: string
  diet: string
  conditions: string
  activitiesConsent: boolean
  photoConsent: boolean
  invoiceRequested: boolean
  consent: boolean
}

export type CampRegistrationErrors = Partial<Record<keyof CampRegistrationData, string>>

export const HEALTH_TEXT_MAX = 2000
export const HEIGHT_MIN_CM = 80
export const HEIGHT_MAX_CM = 210

export const ACTIVITIES_CONSENT_MISSING = 'Bez tej zgody dziecko nie może wziąć udziału w obozie.'
export const REGISTRATION_CONSENT_MISSING = 'Bez tej zgody nie możemy przyjąć formularza.'

/** The height the T-shirts are ordered by — whole centimetres, a child's range. */
export function checkHeight(raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return 'Podaj wzrost dziecka.'
  if (!/^\d{2,3}$/.test(value)) return 'Wpisz wzrost w centymetrach, np. 142.'
  const cm = Number(value)
  if (cm < HEIGHT_MIN_CM || cm > HEIGHT_MAX_CM)
    return `Wzrost w centymetrach, od ${HEIGHT_MIN_CM} do ${HEIGHT_MAX_CM}.`
  return undefined
}

/**
 * The registration form (camp step 2). The health questions may stay empty —
 * "nothing to report" is an answer — but each is bounded; the PESEL, the
 * height and both consents are required. The PESEL rule is `checkPesel`.
 */
export function validateCampRegistration(data: CampRegistrationData): CampRegistrationErrors {
  const errors: CampRegistrationErrors = {}
  const pesel = checkPesel(data.pesel)
  if (pesel) errors.pesel = pesel
  const height = checkHeight(data.height)
  if (height) errors.height = height
  for (const key of ['allergies', 'medications', 'diet', 'conditions'] as const) {
    if (data[key].trim().length > HEALTH_TEXT_MAX)
      errors[key] = `To pole może mieć najwyżej ${HEALTH_TEXT_MAX} znaków.`
  }
  if (!data.activitiesConsent) errors.activitiesConsent = ACTIVITIES_CONSENT_MISSING
  if (!data.consent) errors.consent = REGISTRATION_CONSENT_MISSING
  return errors
}
