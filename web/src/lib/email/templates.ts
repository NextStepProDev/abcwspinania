import { TOPICS } from '@/lib/topics'

import type { EmailLanguage } from '@/lib/email/language'
import { renderEmail, type RenderedEmail } from '@/lib/email/layout'
import { BOOKING_RETENTION_YEARS } from '@/lib/expiry'

/**
 * Email templates — one function per email, each returning a subject and the
 * rendered body.
 *
 * Emails to VISITORS keep Polish and English side by side, in one object per
 * template (`{ pl: …, en: … }` typed as `Record<EmailLanguage, …>`), so a
 * sentence added to one language and forgotten in the other fails the type
 * check.
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

// --- Participant accounts ----------------------------------------------------

interface AccountEmailData {
  firstName?: string | null
  /** The full link, token included — built by the caller (`email/links.ts`). */
  url: string
  /** Hours the link stays valid — said in the email so nobody wonders. */
  validHours?: number
}

interface AccountCopy {
  subject: string
  greeting: (name?: string | null) => string
  body: string
  action: string
  note: (hours?: number) => string
}

const VERIFY: Record<EmailLanguage, AccountCopy> = {
  pl: {
    subject: 'Potwierdź adres e-mail — ABC Wspinania',
    greeting: (name) => (name ? `Cześć ${name}!` : 'Cześć!'),
    body: 'Dziękujemy za założenie konta. Kliknij przycisk, żeby potwierdzić, że ten adres należy do Ciebie — potem możesz się zalogować.',
    action: 'Potwierdź adres',
    note: (h) =>
      `Link działa przez ${h} godz. Jeśli nie zakładasz konta w ABC Wspinania, zignoruj tę wiadomość — bez potwierdzenia konto nie zadziała.`,
  },
  en: {
    subject: 'Confirm your email address — ABC Wspinania',
    greeting: (name) => (name ? `Hi ${name}!` : 'Hi!'),
    body: 'Thank you for creating an account. Click the button to confirm this address is yours — then you can log in.',
    action: 'Confirm address',
    note: (h) =>
      `The link works for ${h} hours. If you did not create an account, ignore this email — without confirmation the account will not work.`,
  },
}

const RESET: Record<EmailLanguage, AccountCopy> = {
  pl: {
    subject: 'Ustaw nowe hasło — ABC Wspinania',
    greeting: (name) => (name ? `Cześć ${name}!` : 'Cześć!'),
    body: 'Ktoś poprosił o ustawienie nowego hasła do Twojego konta. Jeśli to Ty — kliknij przycisk i wpisz nowe hasło.',
    action: 'Ustaw nowe hasło',
    note: (h) =>
      `Link działa przez ${h} godz. i tylko raz. Jeśli to nie była Twoja prośba, zignoruj tę wiadomość — dotychczasowe hasło dalej działa.`,
  },
  en: {
    subject: 'Set a new password — ABC Wspinania',
    greeting: (name) => (name ? `Hi ${name}!` : 'Hi!'),
    body: 'Someone asked to set a new password for your account. If it was you, click the button and enter a new password.',
    action: 'Set a new password',
    note: (h) =>
      `The link works for ${h} hours and only once. If you did not ask for this, ignore this email — your current password still works.`,
  },
}

function accountEmail(copy: AccountCopy, lang: EmailLanguage, data: AccountEmailData): Email {
  return {
    subject: copy.subject,
    ...renderEmail({
      lang,
      heading: copy.greeting(data.firstName),
      paragraphs: [copy.body],
      action: { label: copy.action, href: data.url },
      note: copy.note(data.validHours),
    }),
  }
}

/** To a participant who has just registered: confirm the address. */
export function verifyAccountEmail(lang: EmailLanguage, data: AccountEmailData): Email {
  return accountEmail(VERIFY[lang], lang, data)
}

/** To a participant who asked for a new password. */
export function resetPasswordEmail(lang: EmailLanguage, data: AccountEmailData): Email {
  return accountEmail(RESET[lang], lang, data)
}

// --- Registration on an address that already has an account -----------------

interface AccountExistsData {
  firstName?: string | null
  loginUrl: string
  /** A fresh "set a new password" link, for someone who forgot it. */
  resetUrl: string
  validHours: number
  /**
   * What the owner did: tried to register again (default), or asked for a
   * confirmation link for an address already confirmed.
   */
  reason?: 'register' | 'resend'
}

const EXISTS: Record<
  EmailLanguage,
  {
    subject: string
    greeting: (name?: string | null) => string
    body: string
    bodyResend: string
    login: string
    reset: (hours: number) => string
    note: string
  }
> = {
  pl: {
    subject: 'Masz już konto — ABC Wspinania',
    greeting: (name) => (name ? `Cześć ${name}!` : 'Cześć!'),
    body: 'Ktoś — najpewniej Ty — próbował założyć konto na ten adres, ale konto już istnieje. Wystarczy się zalogować.',
    bodyResend:
      'Ktoś — najpewniej Ty — poprosił o link potwierdzający ten adres, ale adres jest już potwierdzony. Wystarczy się zalogować.',
    login: 'Zaloguj się',
    reset: (h) => `Nie pamiętasz hasła? Ustaw nowe (link działa ${h} godz.)`,
    note: 'Jeśli to nie Ty, zignoruj tę wiadomość — nic się nie zmieniło, Twoje hasło działa jak dotąd.',
  },
  en: {
    subject: 'You already have an account — ABC Wspinania',
    greeting: (name) => (name ? `Hi ${name}!` : 'Hi!'),
    body: 'Someone — most likely you — tried to create an account with this address, but it already has one. Just log in.',
    bodyResend:
      'Someone — most likely you — asked for a link to confirm this address, but it is already confirmed. Just log in.',
    login: 'Log in',
    reset: (h) => `Forgot your password? Set a new one (the link works for ${h} hours)`,
    note: 'If this was not you, ignore this email — nothing has changed and your password works as before.',
  },
}

/**
 * To the owner of an address someone tried to register again. The page said
 * only "check your inbox" (it must not reveal that the address has an
 * account); this email is where the owner learns it — login first, a new
 * password as the fallback.
 */
export function accountExistsEmail(lang: EmailLanguage, data: AccountExistsData): Email {
  const copy = EXISTS[lang]
  return {
    subject: copy.subject,
    ...renderEmail({
      lang,
      heading: copy.greeting(data.firstName),
      paragraphs: [data.reason === 'resend' ? copy.bodyResend : copy.body],
      action: { label: copy.login, href: data.loginUrl },
      secondaryAction: { label: copy.reset(data.validHours), href: data.resetUrl },
      note: copy.note,
    }),
  }
}

// --- Course bookings ---------------------------------------------------------

interface BookingEmailData {
  firstName?: string | null
  courseTitle: string
  /** Already formatted for the language (`formatSessionDates`). */
  dates: string
  location?: string | null
  /** "Moje konto" — only when the booking belongs to an account. */
  accountUrl?: string | null
}

function bookingDetails(lang: EmailLanguage, data: BookingEmailData): [string, string][] {
  const rows: [string, string][] = [
    [lang === 'pl' ? 'Kurs' : 'Course', data.courseTitle],
    [lang === 'pl' ? 'Termin' : 'Dates', data.dates],
  ]
  if (data.location) rows.push([lang === 'pl' ? 'Miejsce' : 'Place', data.location])
  return rows
}

function greeting(lang: EmailLanguage, name?: string | null): string {
  if (lang === 'pl') return name ? `Cześć ${name}!` : 'Cześć!'
  return name ? `Hi ${name}!` : 'Hi!'
}

const RECEIVED = {
  pl: {
    subject: (course: string, waitlist: boolean) =>
      waitlist ? `Lista rezerwowa: ${course}` : `Przyjęliśmy zgłoszenie: ${course}`,
    body: (waitlist: boolean) =>
      waitlist
        ? 'Na ten termin nie ma już wolnych miejsc, więc Twoje zgłoszenie trafiło na listę rezerwową. Gdy zwolni się miejsce, odezwiemy się od razu.'
        : 'Dziękujemy za zapis. Potwierdzimy miejsce i prześlemy szczegóły, w tym informacje o płatności — zwykle tego samego dnia.',
    account: 'Swoje zapisy widzisz w Moim koncie',
    note: 'Masz pytanie? Po prostu odpowiedz na tę wiadomość.',
  },
  en: {
    subject: (course: string, waitlist: boolean) =>
      waitlist ? `Waiting list: ${course}` : `Booking received: ${course}`,
    body: (waitlist: boolean) =>
      waitlist
        ? 'This session is fully booked, so your booking is on the waiting list. We will get in touch as soon as a place frees up.'
        : 'Thank you for booking. We will confirm your place and send the details, payment included — usually the same day.',
    account: 'Your bookings are in your account',
    note: 'Any questions? Just reply to this email.',
  },
} satisfies Record<EmailLanguage, unknown>

/** To the participant, right after booking. No amounts or bank details yet. */
export function bookingReceivedEmail(
  lang: EmailLanguage,
  data: BookingEmailData & { waitlist: boolean },
): Email {
  const copy = RECEIVED[lang]
  return {
    subject: oneLine(copy.subject(data.courseTitle, data.waitlist)),
    ...renderEmail({
      lang,
      heading: greeting(lang, data.firstName),
      paragraphs: [copy.body(data.waitlist)],
      details: bookingDetails(lang, data),
      action: data.accountUrl ? { label: copy.account, href: data.accountUrl } : undefined,
      note: copy.note,
    }),
  }
}

const STATUS = {
  pl: {
    confirmed: {
      subject: (c: string) => `Miejsce potwierdzone: ${c}`,
      body: 'Masz potwierdzone miejsce. Szczegóły płatności i przygotowania prześlemy osobno, jeśli jeszcze ich nie masz.',
    },
    paid: {
      subject: (c: string) => `Płatność zaksięgowana: ${c}`,
      body: 'Dziękujemy — płatność za kurs jest zaksięgowana. Do zobaczenia w skałach!',
    },
    cancelled: {
      subject: (c: string) => `Zapis anulowany: ${c}`,
      body: 'Twój zapis na ten termin został anulowany. Jeśli to pomyłka albo chcesz wybrać inny termin, odpowiedz na tę wiadomość.',
    },
    account: 'Moje konto',
  },
  en: {
    confirmed: {
      subject: (c: string) => `Place confirmed: ${c}`,
      body: 'Your place is confirmed. We will send the payment and preparation details separately if you do not have them yet.',
    },
    paid: {
      subject: (c: string) => `Payment received: ${c}`,
      body: 'Thank you — your payment for the course has been received. See you on the rock!',
    },
    cancelled: {
      subject: (c: string) => `Booking cancelled: ${c}`,
      body: 'Your booking for this session has been cancelled. If this is a mistake or you would like another date, just reply to this email.',
    },
    account: 'My account',
  },
} satisfies Record<EmailLanguage, unknown>

/** To the participant when the school changes the booking's status in the panel. */
export function bookingStatusEmail(
  lang: EmailLanguage,
  status: 'confirmed' | 'paid' | 'cancelled',
  data: BookingEmailData,
): Email {
  const copy = STATUS[lang]
  return {
    subject: oneLine(copy[status].subject(data.courseTitle)),
    ...renderEmail({
      lang,
      heading: greeting(lang, data.firstName),
      paragraphs: [copy[status].body],
      details: bookingDetails(lang, data),
      action: data.accountUrl ? { label: copy.account, href: data.accountUrl } : undefined,
    }),
  }
}

const NEW_ACCOUNT = {
  pl: {
    subject: 'Ustaw hasło do konta — ABC Wspinania',
    body: 'Przy zapisie zaznaczono „załóż mi konto”. Konto czeka — wystarczy ustawić hasło, a zobaczysz w nim swoje zapisy.',
    action: 'Ustaw hasło',
    note: (h: number) =>
      `Link działa przez ${h} godz. Jeśli nie zakładasz konta, zignoruj tę wiadomość — zapis na kurs jest ważny i bez niego.`,
  },
  en: {
    subject: 'Set your account password — ABC Wspinania',
    body: 'When booking, "create an account for me" was ticked. The account is waiting — just set a password to see your bookings in it.',
    action: 'Set password',
    note: (h: number) =>
      `The link works for ${h} hours. If you did not ask for an account, ignore this email — your booking stands without it.`,
  },
} satisfies Record<EmailLanguage, unknown>

/** An account created from a booking: the first password, which also confirms the address. */
export function newAccountFromBookingEmail(
  lang: EmailLanguage,
  data: { firstName?: string | null; url: string; validHours: number },
): Email {
  const copy = NEW_ACCOUNT[lang]
  return {
    subject: copy.subject,
    ...renderEmail({
      lang,
      heading: greeting(lang, data.firstName),
      paragraphs: [copy.body],
      action: { label: copy.action, href: data.url },
      note: copy.note(data.validHours),
    }),
  }
}

export interface NewBookingData {
  name: string
  email: string
  phone: string
  courseTitle: string
  dates: string
  notes?: string | null
  waitlist: boolean
  hasAccount: boolean
  language?: EmailLanguage | null
  adminUrl: string
}

/** To the school: a new course booking. */
export function newBookingNotification(data: NewBookingData): Email {
  const details: [string, string][] = [
    ['Kto', data.name],
    ['E-mail', data.email],
    ['Telefon', data.phone],
    ['Kurs', data.courseTitle],
    ['Termin', data.dates],
    ['Konto', data.hasAccount ? 'tak' : 'nie (zapis bez konta)'],
  ]
  if (data.notes) details.push(['Uwagi', data.notes])
  const intro = data.waitlist
    ? 'Nowe zgłoszenie na LISTĘ REZERWOWĄ — termin jest pełny.'
    : 'Nowy zapis na kurs. Potwierdź miejsce w panelu — zmiana statusu wyśle kursantowi maila.'
  const note = languageNote(data.language)
  return {
    subject: oneLine(
      `${data.waitlist ? 'Lista rezerwowa' : 'Nowy zapis'}: ${data.name} — ${data.courseTitle}`,
    ),
    ...renderEmail({
      lang: 'pl',
      heading: data.waitlist ? 'Zgłoszenie na listę rezerwową' : 'Nowy zapis na kurs',
      paragraphs: note ? [intro, note] : [intro],
      details,
      action: { label: 'Otwórz w panelu', href: data.adminUrl },
    }),
  }
}

export interface PlaceFreedData {
  courseTitle: string
  dates: string
  spotsLeft: number
  /** In order of booking — the first one is next in line. */
  waiting: { name: string; phone: string; email: string }[]
  adminUrl: string
}

/** To the school: a place freed up on a session with a waiting list. */
export function placeFreedNotification(data: PlaceFreedData): Email {
  const details: [string, string][] = [
    ['Kurs', data.courseTitle],
    ['Termin', data.dates],
    ['Wolne miejsca', String(data.spotsLeft)],
    ...data.waiting.map((w, i): [string, string] => [
      `${i + 1}. na liście`,
      `${w.name}, ${w.phone}, ${w.email}`,
    ]),
  ]
  return {
    subject: oneLine(`Zwolniło się miejsce: ${data.courseTitle}, ${data.dates}`),
    ...renderEmail({
      lang: 'pl',
      heading: 'Zwolniło się miejsce',
      paragraphs: [
        'Na tym terminie są wolne miejsca, a na liście rezerwowej czekają osoby — kolejność jak przy zapisie. Zmiana statusu osoby na „potwierdzony” wyśle jej maila.',
      ],
      details,
      action: { label: 'Otwórz termin w panelu', href: data.adminUrl },
    }),
  }
}

// --- Newsletter and broadcasts -------------------------------------------------

const NEWSLETTER_CONFIRM = {
  pl: {
    subject: 'Potwierdź zapis na newsletter — ABC Wspinania',
    heading: 'Potwierdź zapis na newsletter',
    body: 'Ktoś — najpewniej Ty — wpisał ten adres w formularz newslettera na stronie ABC Wspinania. Kliknij przycisk, żeby zacząć dostawać wiadomości o terminach kursów, obozach i nowych tekstach.',
    action: 'Potwierdzam zapis',
    note: 'Jeśli to nie Ty, zignoruj tę wiadomość — bez potwierdzenia nic do Ciebie nie wyślemy, a adres usuniemy po 7 dniach.',
  },
  en: {
    subject: 'Confirm your newsletter subscription — ABC Wspinania',
    heading: 'Confirm your newsletter subscription',
    body: 'Someone — most likely you — entered this address in the newsletter form on the ABC Wspinania website. Click the button to start receiving news about course dates, camps and new articles.',
    action: 'Confirm subscription',
    note: 'If it was not you, ignore this email — without confirmation we will send you nothing, and the address is deleted after 7 days.',
  },
} satisfies Record<EmailLanguage, unknown>

/** Double opt-in: nothing goes to a newsletter address until its owner clicks this. */
export function newsletterConfirmEmail(lang: EmailLanguage, data: { url: string }): Email {
  const copy = NEWSLETTER_CONFIRM[lang]
  return {
    subject: copy.subject,
    ...renderEmail({
      lang,
      heading: copy.heading,
      paragraphs: [copy.body],
      action: { label: copy.action, href: data.url },
      note: copy.note,
    }),
  }
}

/** Why this person got a broadcast — the small print under it. */
export type BroadcastReason =
  | { kind: 'session'; label: string }
  | { kind: 'upcoming' }
  | { kind: 'newsletter'; unsubscribeUrl: string }

const BROADCAST_NOTE = {
  pl: {
    session: (label: string) =>
      `Dostajesz tę wiadomość, bo masz zapis na: ${label}. Odpowiedź na nią trafi wprost do nas.`,
    upcoming:
      'Dostajesz tę wiadomość, bo masz zapis na nadchodzący kurs w ABC Wspinania. Odpowiedź na nią trafi wprost do nas.',
    newsletter: 'Dostajesz tę wiadomość, bo ten adres jest zapisany na newsletter ABC Wspinania.',
    unsubscribe: 'Wypisz się z newslettera',
  },
  en: {
    session: (label: string) =>
      `You are receiving this because you are booked on: ${label}. Replies come straight to us.`,
    upcoming:
      'You are receiving this because you are booked on an upcoming course with ABC Wspinania. Replies come straight to us.',
    newsletter: 'You are receiving this because you subscribed to the ABC Wspinania newsletter.',
    unsubscribe: 'Unsubscribe from the newsletter',
  },
} satisfies Record<EmailLanguage, unknown>

export interface BroadcastEmailData {
  subject: string
  /** Rendered by `renderRichText` — escaped there. */
  body: { html: string; text: string }
  reason: BroadcastReason
}

/** A message the school writes in the panel ("Wysyłki") to a group of people. */
export function broadcastEmail(lang: EmailLanguage, data: BroadcastEmailData): Email {
  const copy = BROADCAST_NOTE[lang]
  const { reason } = data
  const note =
    reason.kind === 'session'
      ? copy.session(reason.label)
      : reason.kind === 'upcoming'
        ? copy.upcoming
        : copy.newsletter
  const subject = oneLine(data.subject)
  return {
    subject,
    ...renderEmail({
      lang,
      preheader: data.body.text.slice(0, 120),
      heading: subject,
      paragraphs: [],
      body: data.body,
      secondaryAction:
        reason.kind === 'newsletter'
          ? { label: copy.unsubscribe, href: reason.unsubscribeUrl }
          : undefined,
      note,
    }),
  }
}

// --- Account deletion -------------------------------------------------------------

const ACCOUNT_DELETED = {
  pl: {
    subject: 'Konto usunięte — ABC Wspinania',
    body: 'Twoje konto w ABC Wspinania zostało usunięte razem z danymi konta. Nie zalogujesz się już na nie.',
    bookings: `Zapisy na kursy zostają w szkole — bez powiązania z kontem — bo dotyczą organizacji zajęć i rozliczeń: do ${BOOKING_RETENTION_YEARS} lat od końca roku, w którym odbył się kurs, potem automatycznie usuwamy z nich dane osobowe. Chcesz odwołać zapis albo usunąć też te dane wcześniej? Odpowiedz na tę wiadomość.`,
    note: 'Jeśli konto usunął ktoś inny niż Ty, odpowiedz na tę wiadomość od razu.',
  },
  en: {
    subject: 'Account deleted — ABC Wspinania',
    body: 'Your ABC Wspinania account has been deleted together with its data. You can no longer log in to it.',
    bookings: `Course bookings stay with the school — no longer linked to an account — because they concern organising the course and settling payments: up to ${BOOKING_RETENTION_YEARS} years from the end of the year the course took place in, then we automatically remove the personal data from them. Want to cancel a booking or have that data deleted sooner? Reply to this email.`,
    note: 'If you did not delete the account, reply to this email straight away.',
  },
} satisfies Record<EmailLanguage, unknown>

/** To the former participant, after "Usuń konto". */
export function accountDeletedEmail(
  lang: EmailLanguage,
  data: { firstName?: string | null },
): Email {
  const copy = ACCOUNT_DELETED[lang]
  return {
    subject: copy.subject,
    ...renderEmail({
      lang,
      heading: greeting(lang, data.firstName),
      paragraphs: [copy.body, copy.bookings],
      note: copy.note,
    }),
  }
}
