import { BOOKING_STATUS_OPTIONS } from '@/lib/bookings'
import { DELIVERY_STATUS_OPTIONS } from '@/lib/broadcasts'
import { LANGUAGE_OPTIONS_FOR_PAYLOAD } from '@/lib/email/language'
import { escapeHtml } from '@/lib/email/layout'
import { CONTROLLER } from '@/lib/legal'
import { TOPICS } from '@/lib/topics'

/**
 * The copy of a person's data as a document the PERSON can read (decided
 * 12.10.2026) — what the school sends back to "what do you hold about me?".
 * The JSON from `personDataCopy` stays for moving data elsewhere, but a file
 * of `firstName` and `"status": "paid"` is no answer for a participant.
 *
 * One HTML file: it opens with a double click in any browser, on a phone
 * too, and prints or saves as PDF from there. Polish labels, dates in Polish
 * time, the controller at the top. Every value passes through `escapeHtml` —
 * names and messages were typed by visitors. Pure, tested under `node --test`.
 */

/**
 * What `personDataCopy` returns — rows already cut to the allowed fields.
 * ⚠️ A field added to that allow-list needs a row in the lists below, or it
 * reaches the JSON but not the document the person reads.
 */
export interface PersonDataCopy {
  email: string
  madeAt: string
  account: Record<string, unknown> | null
  bookings: Record<string, unknown>[]
  messages: Record<string, unknown>[]
  newsletter: Record<string, unknown>[]
  messagesSentToThem: Record<string, unknown>[]
}

type Format = (value: unknown) => string | null

const text: Format = (value) => (typeof value === 'string' && value.trim() !== '' ? value : null)

const date: Format = (value) => {
  if (typeof value !== 'string' || value === '') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(parsed)
}

const oneOf =
  (options: readonly { value: string; label: string }[]): Format =>
  (value) =>
    typeof value === 'string' && value !== ''
      ? (options.find((o) => o.value === value)?.label ?? value)
      : null

const language = oneOf(LANGUAGE_OPTIONS_FOR_PAYLOAD)

const yesNo: Format = (value) => (typeof value === 'boolean' ? (value ? 'tak' : 'nie') : null)

const NEWSLETTER_STATUS = [
  { value: 'pending', label: 'czeka na potwierdzenie' },
  { value: 'subscribed', label: 'zapisany' },
  { value: 'unsubscribed', label: 'wypisany' },
]

type Field = [label: string, key: string, format: Format]

const ACCOUNT: Field[] = [
  ['Imię', 'firstName', text],
  ['Nazwisko', 'lastName', text],
  ['E-mail', 'email', text],
  ['Telefon', 'phone', text],
  ['Język maili', 'language', language],
  ['Adres potwierdzony', '_verified', yesNo],
  ['Konto założone', 'createdAt', date],
  ['Ostatnia zmiana', 'updatedAt', date],
  ['Data zgody', 'consentDate', date],
  ['Treść zgody', 'consentText', text],
]

const BOOKING: Field[] = [
  ['Kurs i termin', 'session', text],
  ['Status', 'status', oneOf(BOOKING_STATUS_OPTIONS)],
  ['Imię', 'firstName', text],
  ['Nazwisko', 'lastName', text],
  ['E-mail', 'email', text],
  ['Telefon', 'phone', text],
  ['Uwagi', 'notes', text],
  ['Język maili', 'language', language],
  ['Data zapisu', 'createdAt', date],
  ['Data zgody', 'consentDate', date],
  ['Treść zgody', 'consentText', text],
]

const MESSAGE: Field[] = [
  ['Wysłana', 'createdAt', date],
  ['Temat', 'topic', oneOf(TOPICS)],
  ['Imię i nazwisko', 'name', text],
  ['E-mail', 'email', text],
  ['Telefon', 'phone', text],
  ['Preferowany termin', 'preferredDate', text],
  ['Treść', 'message', text],
  ['Język', 'language', language],
  ['Data zgody', 'consentDate', date],
  ['Treść zgody', 'consentText', text],
]

const NEWSLETTER: Field[] = [
  ['E-mail', 'email', text],
  ['Status', 'status', oneOf(NEWSLETTER_STATUS)],
  ['Język', 'language', language],
  ['Zapis', 'createdAt', date],
  ['Potwierdzenie', 'confirmedAt', date],
  ['Wypisanie', 'unsubscribedAt', date],
  ['Data zgody', 'consentDate', date],
  ['Treść zgody', 'consentText', text],
]

const SENT: Field[] = [
  ['Temat', 'subject', text],
  ['Status', 'status', oneOf(DELIVERY_STATUS_OPTIONS)],
  ['Wysłana', 'sentAt', date],
]

/** One record as a two-column table; fields with no value are left out. */
function record(row: Record<string, unknown>, fields: Field[]): string {
  const lines = fields
    .map(([label, key, format]) => [label, format(row[key])] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null)
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value).replace(/\r?\n/g, '<br>')}</td></tr>`,
    )
  return `<table>${lines.join('')}</table>`
}

function section(title: string, rows: Record<string, unknown>[], fields: Field[]): string {
  const body = rows.length
    ? rows.map((row) => record(row, fields)).join('')
    : '<p class="none">Brak.</p>'
  return `<h2>${escapeHtml(title)}</h2>${body}`
}

const STYLE = `
body{font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#1f2933;max-width:760px;margin:32px auto;padding:0 16px;line-height:1.5}
h1{font-size:26px;margin:0 0 8px}h2{font-size:19px;margin:32px 0 8px;padding-bottom:4px;border-bottom:2px solid #e4e7eb}
.lead{color:#52606d;margin:0 0 16px}.box{background:#f5f7fa;border-radius:8px;padding:12px 16px;margin:16px 0}
table{width:100%;border-collapse:collapse;margin:0 0 16px;border:1px solid #e4e7eb}
th,td{text-align:left;vertical-align:top;padding:6px 10px;border-bottom:1px solid #e4e7eb}
th{width:34%;font-weight:600;color:#52606d}.none{color:#7b8794}footer{margin-top:32px;color:#52606d;font-size:14px}
@media print{body{margin:0}table{page-break-inside:avoid}}`

/** The whole document — a standalone HTML page. */
export function personDataDocument(copy: PersonDataCopy): string {
  const made = date(copy.madeAt) ?? ''
  const controller = `${CONTROLLER.person}, ${CONTROLLER.businessName}, ${CONTROLLER.street}, ${CONTROLLER.postcode} ${CONTROLLER.town}, NIP ${CONTROLLER.nip}`
  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Twoje dane w ABC Wspinania</title><style>${STYLE}</style></head><body>
<h1>Twoje dane w ABC Wspinania</h1>
<p class="lead">Kopia danych osobowych, które szkoła przechowuje pod adresem <strong>${escapeHtml(copy.email)}</strong>. Stan na ${escapeHtml(made)}.</p>
<div class="box">Administrator danych: ${escapeHtml(controller)}.<br>W sprawie danych: ${escapeHtml(CONTROLLER.email)}.</div>
${section('Konto na stronie', copy.account ? [copy.account] : [], ACCOUNT)}
${section('Zapisy na kursy', copy.bookings, BOOKING)}
${section('Wiadomości z formularza kontaktowego', copy.messages, MESSAGE)}
${section('Newsletter', copy.newsletter, NEWSLETTER)}
${section('Wiadomości wysłane do Ciebie przez szkołę', copy.messagesSentToThem, SENT)}
${copy.account ? '<footer>Hasła do konta nie znamy — przechowujemy je wyłącznie w postaci zaszyfrowanej, z której nie da się go odczytać. Dlatego nie ma go w tej kopii.</footer>' : ''}
</body></html>
`
}
