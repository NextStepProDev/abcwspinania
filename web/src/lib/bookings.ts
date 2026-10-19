import type { Where } from 'payload'

import type { EmailLanguage } from '@/lib/email/language'
import { formatDateRange } from '@/lib/format'

/**
 * Booking rules — pure functions, no Payload, tested under `node --test`.
 * The collection (`collections/Bookings.ts`), the sign-up action and the
 * account page all read these, so a rule changes in one place.
 */

export const BOOKING_STATUSES = [
  'new',
  'confirmed',
  'deposit',
  'paid',
  'waitlist',
  'cancelled',
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/** For the panel — the school reads these. Order = the usual path of a booking. */
export const BOOKING_STATUS_OPTIONS = [
  { label: 'zgłoszony', value: 'new' },
  { label: 'potwierdzony', value: 'confirmed' },
  { label: 'zaliczka wpłacona', value: 'deposit' },
  { label: 'opłacony', value: 'paid' },
  { label: 'lista rezerwowa', value: 'waitlist' },
  { label: 'rezygnacja', value: 'cancelled' },
] satisfies { label: string; value: BookingStatus }[]

/** How a participant sees each status on "Moje konto". */
export const STATUS_FOR_PARTICIPANT: Record<BookingStatus, string> = {
  new: 'zgłoszenie przyjęte — czeka na potwierdzenie',
  confirmed: 'miejsce potwierdzone',
  deposit: 'zaliczka wpłacona',
  paid: 'opłacone',
  waitlist: 'lista rezerwowa',
  cancelled: 'rezygnacja',
}

/**
 * Bookings that TAKE A PLACE. The waiting list waits for one and a
 * cancellation gave one back — neither counts against the capacity.
 */
export const ACTIVE_STATUSES: readonly BookingStatus[] = ['new', 'confirmed', 'deposit', 'paid']

export const BOOKING_KINDS = ['course', 'camp'] as const

export type BookingKind = (typeof BOOKING_KINDS)[number]

export const BOOKING_KIND_OPTIONS = [
  { label: 'kurs', value: 'course' },
  { label: 'obóz', value: 'camp' },
] satisfies { label: string; value: BookingKind }[]

/**
 * Which sessions a booking of this kind may point at — a session belongs to
 * EITHER a course OR a camp (`Sessions.ts`). A booking without a kind yet is
 * a course booking: the field's default, and every booking before camps.
 */
export function sessionFilterFor(kind: unknown): Where {
  return kind === 'camp' ? { camp: { exists: true } } : { course: { exists: true } }
}

/**
 * The panel's message when the session and the kind disagree — `null` when
 * they match. Payload's own refusal of a value outside `filterOptions` reads
 * "nieprawidłowe wybory: 1", which tells the school nothing.
 *
 * A session with neither (its course or camp was deleted — Postgres clears
 * the field) agrees with any kind: refusing it would block every later save
 * of its bookings, a status change included.
 */
export function kindMismatch(kind: unknown, sessionKind: BookingKind | null): string | null {
  if (!sessionKind) return null
  const bookingKind: BookingKind = kind === 'camp' ? 'camp' : 'course'
  if (bookingKind === sessionKind) return null
  return sessionKind === 'camp'
    ? 'To termin obozu — ustaw „Rodzaj zapisu” na „obóz”.'
    : 'To termin kursu — ustaw „Rodzaj zapisu” na „kurs”.'
}

export interface Availability {
  /** `null` when the session has no capacity set — the site then says "ask". */
  spotsLeft: number | null
  full: boolean
}

/**
 * Spots left on a session, from its capacity and its active bookings
 * (decided 02.10.2026: counted, not typed in). Never below zero — the school
 * may add a booking past the capacity by hand.
 */
export function availability(
  capacity: number | null | undefined,
  activeBookings: number,
): Availability {
  if (capacity === null || capacity === undefined) return { spotsLeft: null, full: false }
  const spotsLeft = Math.max(0, capacity - activeBookings)
  return { spotsLeft, full: spotsLeft === 0 }
}

/**
 * The status a new booking starts with. With a capacity the COUNT decides —
 * the same rule the recount applies to the session right after
 * (`lib/bookingEffects.ts`); honouring a hand-set "waiting list" here would
 * put this person on the list and give the next one a place. Without a
 * capacity nothing is counted, so the school's status is all there is.
 */
export function newBookingStatus(
  spots: Availability,
  sessionStatus: string | null | undefined,
): BookingStatus {
  if (spots.spotsLeft === null) return sessionStatus === 'waitlist' ? 'waitlist' : 'new'
  return spots.full ? 'waitlist' : 'new'
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Upcoming until the session's LAST day is over. Dates are calendar days
 * stored as UTC midnight (see `formatDateRange`), so the day ends 24 h after
 * that midnight.
 */
export function isUpcoming(
  session: { startDate: string; endDate?: string | null },
  now: Date,
): boolean {
  const lastDay = Date.parse(session.endDate || session.startDate)
  if (Number.isNaN(lastDay)) return false
  return now.getTime() < lastDay + DAY_MS
}

export type StatusEmail = 'confirmed' | 'paid' | 'cancelled'

/**
 * Which change of status the participant hears about. The school moves a
 * booking through several steps; only these three change anything for the
 * participant (they have a place, they are paid up, they are out). A deposit
 * gets no email of its own: it is followed by the payment, and the payment
 * by an email.
 *
 * "Paid" emails only BEFORE the course starts (decided 14.10.2026). Most
 * people pay cash on the first day, and Krzysiek marks it during or after
 * the course — a "thank you, paid" arriving then reads like a mistake. Paid
 * by transfer before the course, it confirms the money arrived. The
 * participant sees the status in "Moje konto" either way. Without a known
 * start (`sessionStart` missing — the panel's list does not have it) "paid"
 * counts as emailing: the question before the change stays on the safe side.
 */
export function statusEmailFor(
  previous: BookingStatus | null | undefined,
  next: BookingStatus,
  sessionStart?: string | null,
  now: Date = new Date(),
): StatusEmail | null {
  if (previous === next) return null
  if (next === 'paid' && sessionStart && courseStarted(sessionStart, now)) return null
  if (next === 'confirmed' || next === 'paid' || next === 'cancelled') return next
  return null
}

const polishDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' })

/**
 * Whether the course's first day has come, as a calendar day IN POLAND. The
 * panel stores a date as Polish midnight (22:00 or 23:00 UTC the day before)
 * or as UTC midnight; both fall on the right day in Polish time, so comparing
 * Polish dates (`YYYY-MM-DD`, which sorts as text) covers either.
 */
export function courseStarted(sessionStart: string, now: Date): boolean {
  const start = Date.parse(sessionStart)
  if (Number.isNaN(start)) return false
  return polishDay.format(now) >= polishDay.format(start)
}

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * A session's dates for an email. Polish reuses the site's own format
 * (genitive months); English is "26 June – 3 July 2027". Both read the date
 * in UTC — a calendar date must not shift by a day west of Greenwich.
 */
export function formatSessionDates(lang: EmailLanguage, from: string, to?: string | null): string {
  if (lang === 'pl') return formatDateRange(from, to)
  const a = new Date(from)
  if (Number.isNaN(a.getTime())) return ''
  const one = (d: Date, withYear: boolean) =>
    `${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ''}`
  if (!to) return one(a, true)
  const b = new Date(to)
  if (Number.isNaN(b.getTime())) return one(a, true)
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${one(a, true)} – ${one(b, true)}`
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${one(a, false)} – ${one(b, true)}`
  return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS_EN[a.getUTCMonth()]} ${a.getUTCFullYear()}`
}

/**
 * Whether the school should hear "a place is free, someone is waiting": the
 * free places went UP and the waiting list is not empty. The first count of a
 * session (`previous` unknown) is not a freed place. Promoting someone stays
 * the school's call — they may want to phone first.
 */
export function placeFreedForWaitlist(
  previous: number | null | undefined,
  next: number | null,
  waiting: number,
): boolean {
  if (previous === null || previous === undefined || next === null) return false
  return next > previous && waiting > 0
}

/**
 * Where a date's "Zapisz się" leads (the schedule, `/terminarz`).
 *
 * A course date opens its booking form with that date already chosen — the
 * form reads `?session=`. Camps take no bookings yet (stage 4), so a camp
 * date asks through the contact form with the camp filled in. Until
 * 10.10.2026 every date led to `/kontakt?termin=…`, a leftover from before
 * bookings whose parameter the contact form never read.
 */
export function signUpPath(session: {
  id: number
  courseSlug: string | null
  campSlug: string | null
}): string {
  if (session.courseSlug) return `/kursy/${session.courseSlug}/zapis?session=${session.id}`
  if (session.campSlug) return `/kontakt?camp=${session.campSlug}`
  return '/kontakt'
}

/**
 * The list label of an anonymized booking (`anonymizeExpiredBookings`): the
 * name goes, the date and course stay — "Ola Nowak · 4–9 maj 2027 · Kurs PZA"
 * becomes "zanonimizowany · 4–9 maj 2027 · Kurs PZA". The label always starts
 * with the name (the `Bookings` hook builds it so).
 */
export function anonymizedLabel(label: string | null | undefined): string {
  const parts = (label ?? '').split(' · ')
  return ['zanonimizowany', ...parts.slice(1)].join(' · ')
}
