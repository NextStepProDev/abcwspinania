/**
 * The language an email goes out in.
 *
 * The site is Polish with one English page, but people from abroad sign up for
 * courses too, and an email they cannot read is an email that did not arrive.
 * Two languages, no more: a third would need every template written again, and
 * English is what a visitor who is not Polish can be assumed to read. Who
 * gets English is a choice, never a guess (see `DEFAULT_LANGUAGE`).
 *
 * No imports from Payload or Next — collections and `node --test` both load it.
 */
export const EMAIL_LANGUAGES = ['pl', 'en'] as const

export type EmailLanguage = (typeof EMAIL_LANGUAGES)[number]

/** For `select` fields in the panel — the client reads these labels. */
export const LANGUAGE_OPTIONS_FOR_PAYLOAD = [
  { label: 'polski', value: 'pl' },
  { label: 'angielski', value: 'en' },
] satisfies { label: string; value: EmailLanguage }[]

/**
 * The language of everyone who has not chosen one: a booking without an
 * account, a new account, a newsletter sign-up.
 *
 * Until 15.10.2026 the browser's `Accept-Language` picked it, and any first
 * choice other than Polish meant English. But a browser set to English is a
 * common setting in Poland and says nothing about the person — Polish
 * participants were getting English emails. English is now a choice — the
 * participant's in "Moje konto", or the school's in the panel (the only way
 * for a newsletter address, which has no account) — never a guess.
 */
export const DEFAULT_LANGUAGE: EmailLanguage = 'pl'
