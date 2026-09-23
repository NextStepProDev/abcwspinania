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

export function isValid(errors: ValidationErrors): boolean {
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
