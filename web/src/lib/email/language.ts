/**
 * The language an email goes out in.
 *
 * The site is Polish with one English page, but people from abroad sign up for
 * courses too, and an email they cannot read is an email that did not arrive.
 * Two languages, no more: a third would need every template written again, and
 * English is what a visitor who is not Polish can be assumed to read.
 *
 * Pure functions, no imports from Payload or Next — tested under `node --test`.
 */
export const EMAIL_LANGUAGES = ['pl', 'en'] as const

export type EmailLanguage = (typeof EMAIL_LANGUAGES)[number]

/** For `select` fields in the panel — the client reads these labels. */
export const LANGUAGE_OPTIONS_FOR_PAYLOAD = [
  { label: 'polski', value: 'pl' },
  { label: 'angielski', value: 'en' },
] satisfies { label: string; value: EmailLanguage }[]

/**
 * Picks the language from the browser's `Accept-Language` header.
 *
 * The browser's FIRST preference decides — the one with the highest weight,
 * ties going to whichever comes first. Polish in any regional form means
 * Polish; anything else means English. A missing or unreadable header means
 * Polish: this is a Polish school, and that is who most visitors are.
 *
 * Deliberately not "Polish appears anywhere in the list": a German browser
 * routinely carries `pl` far down the list after a holiday in Poland, and that
 * person still reads English better than Polish.
 */
export function pickLanguage(acceptLanguage: string | null | undefined): EmailLanguage {
  if (!acceptLanguage) return 'pl'

  let best: { tag: string; weight: number } | null = null
  for (const part of acceptLanguage.split(',')) {
    const [rawTag, ...params] = part.trim().split(';')
    const tag = rawTag.trim().toLowerCase()
    if (!tag || tag === '*') continue

    let weight = 1
    for (const param of params) {
      const [key, value] = param.trim().split('=')
      if (key === 'q') weight = Number(value)
    }
    if (!Number.isFinite(weight) || weight <= 0) continue

    if (!best || weight > best.weight) best = { tag, weight }
  }

  if (!best) return 'pl'
  return best.tag === 'pl' || best.tag.startsWith('pl-') ? 'pl' : 'en'
}
