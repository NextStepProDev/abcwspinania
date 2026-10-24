import { TOPICS } from '@/lib/topics'

import type { EmailLanguage } from '@/lib/email/language'
import { renderEmail, type RenderedEmail } from '@/lib/email/layout'
import { joinNames } from '@/lib/campPayment'
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

export interface NewMessageData {
  name: string
  email: string
  phone?: string | null
  message: string
  topic?: string | null
  preferredDate?: string | null
  courseTitle?: string | null
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
  return {
    subject: oneLine(`Nowa wiadomość: ${data.name}${topic ? ` — ${topic}` : ''}`),
    ...renderEmail({
      lang: 'pl',
      preheader: data.message.slice(0, 120),
      heading: 'Nowa wiadomość z formularza',
      paragraphs: [intro],
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
  return {
    subject: oneLine(
      `${data.waitlist ? 'Lista rezerwowa' : 'Nowy zapis'}: ${data.name} — ${data.courseTitle}`,
    ),
    ...renderEmail({
      lang: 'pl',
      heading: data.waitlist ? 'Zgłoszenie na listę rezerwową' : 'Nowy zapis na kurs',
      paragraphs: [intro],
      details,
      action: { label: 'Otwórz w panelu', href: data.adminUrl },
    }),
  }
}

// --- Camp bookings -------------------------------------------------------------

export interface CampBookingEmailData {
  /** The parent's. */
  firstName?: string | null
  /** The children with a place, in the form's order. */
  placed: string[]
  /** Those on the waiting list; empty when none. */
  waiting: string[]
  campTitle: string
  /** Already formatted for the language (`formatSessionDates`). */
  dates: string
  location?: string | null
  /** The sign-up's registration form — set when any child has a place. */
  registrationUrl: string | null
  accountUrl?: string | null
}

const CAMP_RECEIVED = {
  pl: {
    subject: (names: string, camp: string, allWaiting: boolean) =>
      `${allWaiting ? 'Lista rezerwowa' : 'Zapis na obóz'}: ${names} — ${camp}`,
    placed: (names: string) =>
      `Dziękujemy — ${names}: miejsce zarezerwowane. Następny krok to formularz rejestracyjny (jeden dla wszystkich zapisanych tu dzieci): dane potrzebne do umowy i do opieki na obozie (m.in. PESEL, uczulenia, dieta). Po jego wypełnieniu prześlemy dane do przelewu zaliczki i umowę.`,
    waiting: (names: string) =>
      `${names}: na tym turnusie zabrakło miejsca, więc jest na liście rezerwowej. Gdy zwolni się miejsce, odezwiemy się od razu — wtedy przyjdzie też formularz.`,
    form: 'Wypełnij formularz rejestracyjny',
    account: 'Zapisy widzisz w Moim koncie',
    camp: 'Obóz',
    dates: 'Termin',
    place: 'Miejsce',
    note: 'Masz pytanie? Po prostu odpowiedz na tę wiadomość.',
  },
  en: {
    subject: (names: string, camp: string, allWaiting: boolean) =>
      `${allWaiting ? 'Waiting list' : 'Camp booking'}: ${names} — ${camp}`,
    placed: (names: string) =>
      `Thank you — ${names}: place reserved. The next step is the registration form (one for all the children signed up here): the details we need for the contract and for looking after them at the camp (PESEL number, allergies, diet and more). Once it is filled in, we will send the bank details for the deposit and the contract.`,
    waiting: (names: string) =>
      `${names}: this session is full, so on the waiting list. We will get in touch as soon as a place frees up — the form comes then.`,
    form: 'Fill in the registration form',
    account: 'Your bookings are in your account',
    camp: 'Camp',
    dates: 'Dates',
    place: 'Place',
    note: 'Any questions? Just reply to this email.',
  },
} satisfies Record<EmailLanguage, unknown>

/**
 * To the parent, right after the sign-up — ONE email for the children signed
 * up together, with one link to their one registration form (decided
 * 21.10.2026). A child on the waiting list is named apart and gets its form
 * once it has a place.
 */
export function campBookingReceivedEmail(lang: EmailLanguage, data: CampBookingEmailData): Email {
  const copy = CAMP_RECEIVED[lang]
  const details: [string, string][] = [
    [copy.camp, data.campTitle],
    [copy.dates, data.dates],
  ]
  if (data.location) details.push([copy.place, data.location])
  const placed = joinNames(lang, data.placed)
  const waiting = joinNames(lang, data.waiting)
  const paragraphs = [
    ...(placed ? [copy.placed(placed)] : []),
    ...(waiting ? [copy.waiting(waiting)] : []),
  ]
  const action = data.registrationUrl
    ? { label: copy.form, href: data.registrationUrl }
    : data.accountUrl
      ? { label: copy.account, href: data.accountUrl }
      : undefined
  // One list in the subject: "Zosia, Staś i Ala", not "Zosia i Staś, Ala".
  const names = joinNames(lang, [...data.placed, ...data.waiting])
  return {
    subject: oneLine(copy.subject(names, data.campTitle, !placed)),
    ...renderEmail({
      lang,
      heading: greeting(lang, data.firstName),
      paragraphs,
      details,
      action,
      note: copy.note,
    }),
  }
}

export interface NewCampBookingData {
  /** The parent. */
  name: string
  email: string
  phone: string
  campTitle: string
  dates: string
  /** Only the children this sign-up added — one already booked is not news. */
  children: { name: string; waitlist: boolean }[]
  notes?: string | null
  hasAccount: boolean
  /** The session's camp bookings in the panel — the children are among them. */
  adminUrl: string
}

/** To the school: children signed up for a camp — one email per sign-up. */
export function newCampBookingNotification(data: NewCampBookingData): Email {
  const waitlist = data.children.filter((c) => c.waitlist).length
  const details: [string, string][] = [
    ...data.children.map((c, i): [string, string] => [
      data.children.length > 1 ? `Dziecko ${i + 1}` : 'Dziecko',
      `${c.name}${c.waitlist ? ' (LISTA REZERWOWA)' : ''}`,
    ]),
    ['Rodzic', data.name],
    ['E-mail', data.email],
    ['Telefon', data.phone],
    ['Obóz', data.campTitle],
    ['Turnus', data.dates],
    ['Konto', data.hasAccount ? 'tak' : 'nie (zapis bez konta)'],
  ]
  if (data.notes) details.push(['Uwagi', data.notes])
  const names = data.children.map((c) => c.name).join(', ')
  const intro =
    waitlist === data.children.length
      ? 'Nowe zgłoszenie na LISTĘ REZERWOWĄ — turnus jest pełny.'
      : waitlist > 0
        ? 'Nowy zapis na obóz — część dzieci trafiła na LISTĘ REZERWOWĄ, bo zabrakło miejsc. Rodzic dostał link do formularza rejestracyjnego dla dzieci z miejscem.'
        : 'Nowy zapis na obóz. Rodzic dostał link do formularza rejestracyjnego — po jego wypełnieniu dostanie umowę.'
  return {
    subject: oneLine(
      `${waitlist === data.children.length ? 'Lista rezerwowa' : 'Nowy zapis na obóz'}: ${names} — ${data.campTitle}`,
    ),
    ...renderEmail({
      lang: 'pl',
      heading:
        waitlist === data.children.length ? 'Zgłoszenie na listę rezerwową' : 'Nowy zapis na obóz',
      paragraphs: [intro],
      details,
      action: { label: 'Otwórz turnus w panelu', href: data.adminUrl },
    }),
  }
}

// --- Camp registration form ----------------------------------------------------

export interface RegistrationEmailData {
  /** The parent's. */
  firstName?: string | null
  childName: string
  campTitle: string
  dates: string
  /** The child's registration form. */
  url: string
}

/**
 * Why the parent gets the link again: the school sent it from the panel,
 * the child moved up from the waiting list, or the form is still empty.
 */
export type RegistrationLinkReason = 'again' | 'place' | 'reminder'

const REGISTRATION_LINK = {
  pl: {
    subject: (child: string, reason: RegistrationLinkReason) =>
      reason === 'place'
        ? `Zwolniło się miejsce: ${child} — formularz rejestracyjny`
        : reason === 'reminder'
          ? `Przypomnienie: formularz rejestracyjny — ${child}`
          : `Formularz rejestracyjny — ${child}`,
    body: (child: string, reason: RegistrationLinkReason) =>
      reason === 'place'
        ? `Dobra wiadomość — zwolniło się miejsce i ${child} jest już na liście uczestników. Następny krok to formularz rejestracyjny: dane potrzebne do umowy i do opieki na obozie.`
        : reason === 'reminder'
          ? `Czekamy jeszcze na formularz rejestracyjny dla: ${child}. Bez niego nie przygotujemy umowy. Wypełnienie zajmuje kilka minut.`
          : `Przesyłamy link do formularza rejestracyjnego dla: ${child}. Wypełnisz w nim dane potrzebne do umowy i do opieki na obozie.`,
    action: 'Wypełnij formularz rejestracyjny',
    child: 'Uczestnik',
    camp: 'Obóz',
    dates: 'Termin',
    note: 'Link prowadzi do formularza tego dziecka — nie przekazuj go dalej. Pytania? Odpowiedz na tę wiadomość.',
  },
  en: {
    subject: (child: string, reason: RegistrationLinkReason) =>
      reason === 'place'
        ? `A place is free: ${child} — registration form`
        : reason === 'reminder'
          ? `Reminder: registration form — ${child}`
          : `Registration form — ${child}`,
    body: (child: string, reason: RegistrationLinkReason) =>
      reason === 'place'
        ? `Good news — a place has freed up and ${child} is now on the list of participants. The next step is the registration form: the details we need for the contract and for looking after the child at the camp.`
        : reason === 'reminder'
          ? `We are still waiting for the registration form for ${child}. Without it we cannot prepare the contract. It takes a few minutes.`
          : `Here is the link to the registration form for ${child}: the details we need for the contract and for looking after the child at the camp.`,
    action: 'Fill in the registration form',
    child: 'Participant',
    camp: 'Camp',
    dates: 'Dates',
    note: 'The link opens this child’s form — do not pass it on. Questions? Reply to this email.',
  },
} satisfies Record<EmailLanguage, unknown>

/** To the parent: the registration form's link, outside the first sign-up email. */
export function registrationLinkEmail(
  lang: EmailLanguage,
  reason: RegistrationLinkReason,
  data: RegistrationEmailData,
): Email {
  const copy = REGISTRATION_LINK[lang]
  return {
    subject: oneLine(copy.subject(data.childName, reason)),
    ...renderEmail({
      lang,
      heading: greeting(lang, data.firstName),
      paragraphs: [copy.body(data.childName, reason)],
      details: [
        [copy.child, data.childName],
        [copy.camp, data.campTitle],
        [copy.dates, data.dates],
      ],
      action: { label: copy.action, href: data.url },
      note: copy.note,
    }),
  }
}

/** The payment details a camp email carries — already formatted by the caller. */
export interface CampPaymentDetails {
  /** "500 zł". */
  deposit: string
  /** The deadline, as a day ("8 marca 2027"). */
  dueDate: string
  recipient: string
  account: string
  title: string
  /** "2000 zł", or null when the turnus has no price in the panel. */
  remaining: string | null
  /** Days before the camp up to which the money comes back in full. */
  refundDays: number
}

const PAYMENT = {
  pl: {
    deposit: 'Zaliczka',
    due: 'Termin wpłaty zaliczki',
    rest: 'Pozostała kwota',
    restWhen: 'najpóźniej w dniu rozpoczęcia obozu',
    recipient: 'Odbiorca',
    account: 'Numer konta',
    title: 'Tytuł przelewu',
    refund: (days: number) =>
      `Rezygnacja do ${days} dni przed obozem — zwracamy całość. Później zaliczka przepada.`,
  },
  en: {
    deposit: 'Deposit',
    due: 'Deposit due by',
    rest: 'Balance',
    restWhen: 'by the first day of the camp at the latest',
    recipient: 'Recipient',
    account: 'Account number',
    title: 'Transfer title',
    refund: (days: number) =>
      `Cancel up to ${days} days before the camp and you get everything back. After that the deposit is kept.`,
  },
} satisfies Record<EmailLanguage, unknown>

function paymentRows(lang: EmailLanguage, p: CampPaymentDetails, withDeposit = true) {
  const copy = PAYMENT[lang]
  const rows: [string, string][] = []
  if (withDeposit) rows.push([copy.deposit, p.deposit], [copy.due, p.dueDate])
  if (p.remaining) rows.push([copy.rest, `${p.remaining} — ${copy.restWhen}`])
  rows.push([copy.recipient, p.recipient], [copy.account, p.account], [copy.title, p.title])
  return rows
}

const REGISTRATION_RECEIVED = {
  pl: {
    subject: (child: string) => `Formularz przyjęty, dane do przelewu — ${child}`,
    body: (child: string, p: CampPaymentDetails) =>
      `Dziękujemy — mamy formularz rejestracyjny dla: ${child}. Teraz zaliczka: ${p.deposit} do ${p.dueDate}, przelewem na konto poniżej.`,
    contract: (email: string) =>
      `W załączniku jest umowa, już podpisana przez nas. Wydrukuj ją, podpisz i odeślij skan albo zdjęcie na ${email}.`,
    noContract: 'Umowę prześlemy w osobnym mailu.',
    // Asked for 24.10.2026: "bring the card" alone left the parent asking
    // where it comes from. It comes attached to the email before the camp
    // (`preCampReminderDays`, about two weeks).
    card: 'Pustą kartę kwalifikacyjną wyślemy mailem około dwóch tygodni przed obozem, razem z informacjami o wyjeździe — wypełnioną przywozisz na obóz.',
    change: 'Gdyby coś się zmieniło przed obozem (np. leki), popraw formularz tym samym linkiem.',
    action: 'Popraw formularz',
    note: 'Pytania? Odpowiedz na tę wiadomość.',
  },
  en: {
    subject: (child: string) => `Form received, payment details — ${child}`,
    body: (child: string, p: CampPaymentDetails) =>
      `Thank you — we have the registration form for ${child}. Next is the deposit: ${p.deposit} by ${p.dueDate}, by transfer to the account below.`,
    contract: (email: string) =>
      `The contract is attached, already signed by us. Print it, sign it and send a scan or a photo back to ${email}.`,
    noContract: 'The contract will follow in a separate email.',
    card: 'We will email the blank qualification card about two weeks before the camp, with the camp details — bring it filled in to the camp.',
    change:
      'If anything changes before the camp (medication, say), correct the form with the same link.',
    action: 'Correct the form',
    note: 'Questions? Reply to this email.',
  },
} satisfies Record<EmailLanguage, unknown>

/**
 * To the parent, after the FIRST save of the form: the deposit, its
 * deadline (`DEPOSIT_DAYS` from this email) and the bank details. No health
 * data in it: an email passes through Brevo and sits in a mailbox for years.
 */
export function registrationReceivedEmail(
  lang: EmailLanguage,
  data: RegistrationEmailData & {
    payment: CampPaymentDetails
    /** The contract PDF is attached to this email. */
    contractAttached?: boolean
    /** Where the signed contract goes back. */
    contractEmail?: string
  },
): Email {
  const copy = REGISTRATION_RECEIVED[lang]
  return {
    subject: oneLine(copy.subject(data.childName)),
    ...renderEmail({
      lang,
      heading: greeting(lang, data.firstName),
      paragraphs: [
        copy.body(data.childName, data.payment),
        data.contractAttached && data.contractEmail
          ? copy.contract(data.contractEmail)
          : copy.noContract,
        copy.card,
        PAYMENT[lang].refund(data.payment.refundDays),
        copy.change,
      ],
      details: [
        [REGISTRATION_LINK[lang].camp, data.campTitle],
        [REGISTRATION_LINK[lang].dates, data.dates],
        ...paymentRows(lang, data.payment),
      ],
      action: { label: copy.action, href: data.url },
      note: copy.note,
    }),
  }
}

const DEPOSIT_REMINDER = {
  pl: {
    subject: (child: string) => `Przypomnienie o zaliczce — ${child}`,
    body: (child: string, p: CampPaymentDetails) =>
      `Nie widzimy jeszcze zaliczki za obóz dla: ${child} (termin minął ${p.dueDate}). Jeśli przelew już poszedł, zignoruj tę wiadomość — księgowanie bywa wolniejsze. Jeśli coś się zmieniło, odpowiedz na tego maila.`,
    note: 'Pytania? Odpowiedz na tę wiadomość.',
  },
  en: {
    subject: (child: string) => `Deposit reminder — ${child}`,
    body: (child: string, p: CampPaymentDetails) =>
      `We have not seen the camp deposit for ${child} yet (it was due on ${p.dueDate}). If you have already paid, ignore this email — transfers can take a while. If something has changed, reply to this email.`,
    note: 'Questions? Reply to this email.',
  },
} satisfies Record<EmailLanguage, unknown>

/** To the parent, once, when the deposit's deadline passed without it. */
export function depositReminderEmail(
  lang: EmailLanguage,
  data: Omit<RegistrationEmailData, 'url'> & { payment: CampPaymentDetails },
): Email {
  const copy = DEPOSIT_REMINDER[lang]
  return {
    subject: oneLine(copy.subject(data.childName)),
    ...renderEmail({
      lang,
      heading: greeting(lang, data.firstName),
      paragraphs: [copy.body(data.childName, data.payment)],
      details: [
        [REGISTRATION_LINK[lang].camp, data.campTitle],
        [REGISTRATION_LINK[lang].dates, data.dates],
        ...paymentRows(lang, data.payment),
      ],
      note: copy.note,
    }),
  }
}

export interface CampStatusEmailData {
  /** The parent's. */
  firstName?: string | null
  childName: string
  campTitle: string
  dates: string
  location?: string | null
  /** For "deposit": what is left and where it goes; null without a price. */
  payment: CampPaymentDetails | null
  accountUrl?: string | null
}

const CAMP_STATUS = {
  pl: {
    confirmed: {
      subject: (c: string) => `Miejsce potwierdzone: ${c}`,
      body: (c: string) => `Miejsce na obozie dla: ${c} jest potwierdzone.`,
    },
    deposit: {
      subject: (c: string) => `Zaliczka wpłynęła: ${c}`,
      body: (c: string, p: CampPaymentDetails | null) =>
        `Dziękujemy — zaliczka za obóz dla: ${c} jest zaksięgowana. ${
          p?.remaining
            ? `Do zapłaty zostało ${p.remaining} — najpóźniej w dniu rozpoczęcia obozu.`
            : 'Resztę kwoty zapłać najpóźniej w dniu rozpoczęcia obozu.'
        }`,
    },
    paid: {
      subject: (c: string) => `Obóz opłacony: ${c}`,
      body: (c: string) =>
        `Dziękujemy — obóz dla: ${c} jest opłacony w całości. Do zobaczenia w skałach!`,
    },
    cancelled: {
      subject: (c: string) => `Zapis anulowany: ${c}`,
      body: (c: string) =>
        `Zapis na obóz dla: ${c} został anulowany. Jeśli to pomyłka, odpowiedz na tę wiadomość.`,
    },
    child: 'Uczestnik',
    camp: 'Obóz',
    dates: 'Termin',
    place: 'Miejsce',
    account: 'Moje konto',
  },
  en: {
    confirmed: {
      subject: (c: string) => `Place confirmed: ${c}`,
      body: (c: string) => `The camp place for ${c} is confirmed.`,
    },
    deposit: {
      subject: (c: string) => `Deposit received: ${c}`,
      body: (c: string, p: CampPaymentDetails | null) =>
        `Thank you — the camp deposit for ${c} has arrived. ${
          p?.remaining
            ? `${p.remaining} is left to pay, by the first day of the camp at the latest.`
            : 'Please pay the rest by the first day of the camp at the latest.'
        }`,
    },
    paid: {
      subject: (c: string) => `Camp paid: ${c}`,
      body: (c: string) => `Thank you — the camp for ${c} is paid in full. See you on the rocks!`,
    },
    cancelled: {
      subject: (c: string) => `Booking cancelled: ${c}`,
      body: (c: string) =>
        `The camp booking for ${c} has been cancelled. If this is a mistake, reply to this email.`,
    },
    child: 'Participant',
    camp: 'Camp',
    dates: 'Dates',
    place: 'Place',
    account: 'My account',
  },
} satisfies Record<EmailLanguage, unknown>

/**
 * To the parent when the school changes a CAMP booking's status — the
 * course wording ("kurs", "kursant") read wrong to a parent. "deposit" says
 * what is left to pay and repeats the account for it.
 */
export function campStatusEmail(
  lang: EmailLanguage,
  status: 'confirmed' | 'deposit' | 'paid' | 'cancelled',
  data: CampStatusEmailData,
): Email {
  const copy = CAMP_STATUS[lang]
  const details: [string, string][] = [
    [copy.child, data.childName],
    [copy.camp, data.campTitle],
    [copy.dates, data.dates],
  ]
  if (data.location) details.push([copy.place, data.location])
  if (status === 'deposit' && data.payment) details.push(...paymentRows(lang, data.payment, false))
  return {
    subject: oneLine(copy[status].subject(data.childName)),
    ...renderEmail({
      lang,
      heading: greeting(lang, data.firstName),
      paragraphs: [copy[status].body(data.childName, data.payment)],
      details,
      action: data.accountUrl ? { label: copy.account, href: data.accountUrl } : undefined,
    }),
  }
}

export interface RegistrationNotificationData {
  childName: string
  parent: string
  campTitle: string
  dates: string
  /** The parent corrected a form sent before. */
  updated: boolean
  adminUrl: string
}

/**
 * To the school: a registration form came in or changed. Deliberately
 * without the answers — health data stays in the panel, not in mailboxes.
 */
export function registrationNotification(data: RegistrationNotificationData): Email {
  const intro = data.updated
    ? 'Rodzic poprawił formularz rejestracyjny (np. leki albo uczulenia). Aktualne dane są w panelu.'
    : 'Rodzic wypełnił formularz rejestracyjny. Dane (PESEL, wzrost, zdrowie) są w panelu — w mailu ich nie ma.'
  return {
    subject: oneLine(
      `${data.updated ? 'Formularz poprawiony' : 'Formularz rejestracyjny'}: ${data.childName} — ${data.campTitle}`,
    ),
    ...renderEmail({
      lang: 'pl',
      heading: data.updated ? 'Formularz rejestracyjny poprawiony' : 'Nowy formularz rejestracyjny',
      paragraphs: [intro],
      details: [
        ['Dziecko', data.childName],
        ['Rodzic', data.parent],
        ['Obóz', data.campTitle],
        ['Turnus', data.dates],
      ],
      action: { label: 'Otwórz w panelu', href: data.adminUrl },
    }),
  }
}

export interface PlaceFreedData {
  courseTitle: string
  dates: string
  spotsLeft: number
  /** In order of booking — the first one is next in line. */
  waiting: { name: string; phone: string; email: string | null }[]
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
      [w.name, w.phone, w.email].filter(Boolean).join(', '),
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

export interface PreCampDraftData {
  campTitle: string
  dates: string
  /** Parents the draft goes to — with a place, one per address. */
  recipients: number
  adminUrl: string
}

/** To the school, before a camp: the parents' email waits as a draft. */
export function preCampDraftNotification(data: PreCampDraftData): Email {
  return {
    subject: oneLine(`Mail przed obozem czeka na uzupełnienie: ${data.campTitle}, ${data.dates}`),
    ...renderEmail({
      lang: 'pl',
      heading: 'Mail przed obozem — szkic gotowy',
      paragraphs: [
        'W „Wysyłkach” czeka szkic maila do rodziców tego turnusu: co spakować i co przywieźć. Uzupełnij to, co w nawiasach kwadratowych — miejsce zbiórki, daty i godziny — i kliknij „Wyślij”.',
        'Nic nie wyjdzie, dopóki go nie wyślesz.',
      ],
      details: [
        ['Obóz', data.campTitle],
        ['Termin', data.dates],
        ['Rodzice z miejscem (dziś)', String(data.recipients)],
      ],
      action: { label: 'Otwórz szkic w panelu', href: data.adminUrl },
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
  /** The blank qualification card goes attached (`attachQualificationCard`). */
  qualificationCard?: boolean
}

// Asked for 24.10.2026: an attachment under a long text is easy to miss, and
// the card is the one thing the parent must bring. Added by the system, not
// left to the school's text — ticking the box is enough.
const CARD_ATTACHED: Record<EmailLanguage, string> = {
  pl: 'W ZAŁĄCZNIKU: PUSTA KARTA KWALIFIKACYJNA (PDF). Wydrukuj ją, wypełnij i przywieź na obóz.',
  en: 'ATTACHED: THE BLANK QUALIFICATION CARD (PDF). Print it, fill it in and bring it to the camp.',
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
  const callout = data.qualificationCard ? CARD_ATTACHED[lang] : undefined
  return {
    subject,
    ...renderEmail({
      lang,
      preheader: callout ?? data.body.text.slice(0, 120),
      heading: subject,
      callout,
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

// --- Panel accounts ----------------------------------------------------------

export interface PanelAccountChangedData {
  name?: string | null
  /** What changed — at least one is true. */
  password: boolean
  /** The NEW address, when the address changed; null otherwise. */
  newEmail?: string | null
  changedAt: Date
  /**
   * The address of the panel account that made the change, when it was not
   * the owner. Every panel account can change every other one (no roles), so
   * the owner is told who did it.
   */
  changedBy?: string | null
  /** The panel's "forgot password" screen. */
  forgotUrl: string
}

/**
 * To the owner of a panel account, after its password or address changed in
 * the panel (decided 13.10.2026). Payload changes a password without asking
 * for the current one, so a session left open on someone else's computer is
 * enough to take the account over; this email is how the owner finds out —
 * and the way back is "forgot password", whose link goes to THEIR inbox.
 * Polish only: panel accounts belong to the school.
 */
export function panelAccountChangedEmail(data: PanelAccountChangedData): Email {
  const what =
    data.password && data.newEmail
      ? 'hasło i adres e-mail'
      : data.password
        ? 'hasło'
        : 'adres e-mail'
  const when = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(data.changedAt)

  const firstName = data.name?.trim().split(/\s+/)[0]

  const details: [string, string][] = [['Kiedy', when]]
  if (data.newEmail) details.push(['Nowy adres', data.newEmail])
  if (data.changedBy) details.push(['Zmienione z konta', data.changedBy])

  // After an address change "forgot password" sends its link to the NEW
  // address — after a takeover, the intruder's. Then the way back is a
  // person who can put the address right, not the reset screen.
  const paragraphs = [
    `W panelu strony ABC Wspinania zmieniono ${what} Twojego konta. Jeśli to Ty — wszystko w porządku, nic nie musisz robić.`,
    data.newEmail
      ? 'Jeśli to nie Ty — od razu zadzwoń albo napisz do Mateusza. Nie używaj „Nie pamiętasz hasła?”: po zmianie adresu link do nowego hasła poszedłby na nowy adres, nie do Ciebie.'
      : 'Jeśli to nie Ty, ustaw od razu nowe hasło: na ekranie logowania do panelu kliknij „Nie pamiętasz hasła?” i wpisz swój adres. Link do ustawienia hasła przyjdzie na Twoją skrzynkę. Potem daj znać Mateuszowi.',
  ]

  return {
    subject: `Zmieniono ${what} do panelu — ABC Wspinania`,
    ...renderEmail({
      lang: 'pl',
      // The panel keeps a full name ("Imię i nazwisko"); the greeting needs the first.
      heading: firstName ? `Cześć ${firstName}!` : 'Cześć!',
      paragraphs,
      details,
      action: data.newEmail
        ? undefined
        : { label: 'Nie pamiętasz hasła? Ustaw nowe', href: data.forgotUrl },
      note: 'Ten mail przychodzi przy każdej zmianie hasła lub adresu konta w panelu — także po Twojej własnej.',
    }),
  }
}
