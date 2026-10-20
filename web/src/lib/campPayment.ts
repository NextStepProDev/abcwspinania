import type { EmailLanguage } from '@/lib/email/language'
import type { CampPaymentDetails } from '@/lib/email/templates'
import { formatPrice } from '@/lib/format'

/**
 * How a camp is paid for — from Krzysiek, 19–20.10.2026. Pure, tested under
 * `node --test`; the emails (`email/templates.ts`) and the daily sweep read
 * these, so a change of amount or account is one edit.
 *
 * The deposit is a FIXED amount, due within `DEPOSIT_DAYS` of the email with
 * the payment details (sent once the registration form is in); the rest by
 * the camp's first day. Krzysiek marks the deposit himself when he sees it
 * on the account ("zaliczka wpłacona") — nothing here reads a bank.
 */
export const CAMP_DEPOSIT_PLN = 500

export const DEPOSIT_DAYS = 7

/** Full refund up to this many days before the camp; later the deposit is kept. */
export const FULL_REFUND_DAYS = 30

/** The account the deposit and the rest go to. */
export const CAMP_TRANSFER = {
  recipient: 'IQ SERVICE Krzysztof Wróbel / ABC WSPINANIA',
  account: 'PL89 1140 2004 0000 3002 7291 9707',
} as const

/** The transfer's title, as Krzysiek asked: "Obóz JURA + imię i nazwisko uczestnika". */
export function transferTitle(childName: string): string {
  return `Obóz JURA ${childName}`.replace(/\s+/g, ' ').trim()
}

/** The turnus's price: its own when set, the camp's otherwise; null when neither has one. */
export function campPrice(
  sessionPrice: number | null | undefined,
  campPriceValue: number | null | undefined,
): number | null {
  if (typeof sessionPrice === 'number') return sessionPrice
  if (typeof campPriceValue === 'number') return campPriceValue
  return null
}

/** What is left to pay after the deposit — null when the price is not known. */
export function remainingAfterDeposit(price: number | null): number | null {
  if (price === null) return null
  return Math.max(0, price - CAMP_DEPOSIT_PLN)
}

/** The deposit's deadline, counted from `from` (the email with the payment details). */
export function depositDueDate(from: Date, days = DEPOSIT_DAYS): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}

/** "500 zł" — the amounts in the emails. */
export function formatPln(amount: number): string {
  return formatPrice(amount)
}

const DAY_FORMAT: Record<EmailLanguage, Intl.DateTimeFormat> = {
  pl: new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeZone: 'Europe/Warsaw' }),
  en: new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/Warsaw' }),
}

/**
 * The payment block of a camp email, formatted for its language: the
 * deposit and its deadline, what is left (when the turnus has a price), the
 * account and the title.
 */
export function paymentDetails(
  lang: EmailLanguage,
  childName: string,
  price: number | null,
  dueDate: Date | string | null,
): CampPaymentDetails {
  const remaining = remainingAfterDeposit(price)
  const due = dueDate ? new Date(dueDate) : null
  return {
    deposit: formatPln(CAMP_DEPOSIT_PLN),
    dueDate: due && !Number.isNaN(due.getTime()) ? DAY_FORMAT[lang].format(due) : '',
    recipient: CAMP_TRANSFER.recipient,
    account: CAMP_TRANSFER.account,
    title: transferTitle(childName),
    remaining: remaining === null ? null : formatPln(remaining),
    refundDays: FULL_REFUND_DAYS,
  }
}

/**
 * Where the camp's mail is answered and the school notified (`CAMP_EMAIL`,
 * obozy@, decided 20.10.2026) — the school's usual box until it is set,
 * which is the case all through testing (CLAUDE.md, "Zapisy na obozy").
 */
export function campMailbox(): string | undefined {
  return process.env.CAMP_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || undefined
}
