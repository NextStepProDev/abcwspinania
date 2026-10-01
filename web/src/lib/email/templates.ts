import { TOPICS } from '@/lib/topics'

import type { EmailLanguage } from '@/lib/email/language'
import { renderEmail, type RenderedEmail } from '@/lib/email/layout'

/**
 * Email templates — one function per email, each returning a subject and the
 * rendered body.
 *
 * Emails to VISITORS are to keep Polish and English side by side, in one
 * object per template (`{ pl: …, en: … }` typed as `Record<EmailLanguage, …>`),
 * so a sentence added to one language and forgotten in the other fails the
 * type check. (The first such template arrives with course bookings.)
 *
 * Emails to the SCHOOL are Polish only — Krzysiek reads them — and say which
 * language the person wrote in, so the reply goes out in that one.
 *
 * Pure functions: the caller fetches the data and passes plain values in. That
 * keeps these testable under `node --test` and keeps Payload out of them.
 */

export interface Email extends RenderedEmail {
  subject: string
}

/**
 * Collapses line breaks in text that goes into a subject. A subject is one
 * header line; a name typed as `Anna\r\nBcc: …` must not become two. Brevo
 * builds the header itself, so what it would do with a raw line break is
 * guesswork — and a refused send means a notification that never arrives.
 */
function oneLine(value: string): string {
  return value.replace(/\s*[\r\n]+\s*/g, ' ').trim()
}

/** Krzysiek's note on the person's language, empty for Polish. */
function languageNote(lang: EmailLanguage | null | undefined): string | undefined {
  return lang === 'en'
    ? 'Ta osoba ma przeglądarkę po angielsku — odpowiedz po angielsku.'
    : undefined
}

export interface NewMessageData {
  name: string
  email: string
  phone?: string | null
  message: string
  topic?: string | null
  preferredDate?: string | null
  courseTitle?: string | null
  language?: EmailLanguage | null
  /** Where the message opens in the panel. */
  adminUrl: string
}

/** To the school: someone filled in the contact form. */
export function newMessageNotification(data: NewMessageData): Email {
  const topic = TOPICS.find((t) => t.value === data.topic)?.label
  const details: [string, string][] = [
    ['Od', data.name],
    ['E-mail', data.email],
  ]
  if (data.phone) details.push(['Telefon', data.phone])
  if (topic) details.push(['Temat', topic])
  if (data.courseTitle) details.push(['Kurs', data.courseTitle])
  if (data.preferredDate) details.push(['Termin', data.preferredDate])
  details.push(['Treść', data.message])

  const intro =
    'Ktoś napisał przez formularz kontaktowy na stronie. Odpowiedź na ten mail trafi wprost do tej osoby.'
  const note = languageNote(data.language)

  return {
    subject: oneLine(`Nowa wiadomość: ${data.name}${topic ? ` — ${topic}` : ''}`),
    ...renderEmail({
      lang: 'pl',
      preheader: data.message.slice(0, 120),
      heading: 'Nowa wiadomość z formularza',
      paragraphs: note ? [intro, note] : [intro],
      details,
      action: { label: 'Otwórz w panelu', href: data.adminUrl },
    }),
  }
}
