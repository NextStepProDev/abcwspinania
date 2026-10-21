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

/**
 * The organiser's entry in the register of tour organisers (CEOTIPT), as on
 * the contract — for the invoice and the contract (Krzysiek, 21.10.2026).
 */
export const CAMP_ORGANISER_REGISTRY = 'CEOTIPT nr 10677'

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
 * account and the title. For a sign-up with several children (one form, one
 * contract, decided 21.10.2026) every amount is per child times the
 * children, and the title names them all — one transfer for the family.
 */
export function paymentDetails(
  lang: EmailLanguage,
  childNames: string[],
  price: number | null,
  dueDate: Date | string | null,
): CampPaymentDetails {
  const count = Math.max(1, childNames.length)
  const remaining = remainingAfterDeposit(price)
  const due = dueDate ? new Date(dueDate) : null
  return {
    deposit: formatPln(CAMP_DEPOSIT_PLN * count),
    dueDate: due && !Number.isNaN(due.getTime()) ? DAY_FORMAT[lang].format(due) : '',
    recipient: CAMP_TRANSFER.recipient,
    account: CAMP_TRANSFER.account,
    title: transferTitle(childNames.join(', ')),
    remaining: remaining === null ? null : formatPln(remaining * count),
    refundDays: FULL_REFUND_DAYS,
  }
}

/** "Zosia Nowak", "Zosia Nowak i Staś Nowak", "Ala, Ola i Ela" — in a sentence. */
export function joinNames(lang: EmailLanguage, names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  const and = lang === 'pl' ? ' i ' : ' and '
  return `${names.slice(0, -1).join(', ')}${and}${names[names.length - 1]}`
}

/**
 * Where the camp's mail is answered and the school notified (`CAMP_EMAIL`,
 * obozy@, decided 20.10.2026) — the school's usual box until it is set,
 * which is the case all through testing (CLAUDE.md, "Zapisy na obozy").
 */
export function campMailbox(): string | undefined {
  return process.env.CAMP_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || undefined
}

/**
 * Where a camp booking's money stands, for the parent: the deposit and its
 * deadline, what is left after it, or paid. Nothing before the form is in
 * (no deadline yet) and nothing on the waiting list or a cancellation.
 */
export function paymentLine(
  status: string,
  price: number | null,
  depositDueAt: string | null | undefined,
): string | undefined {
  const remaining = remainingAfterDeposit(price)
  if (status === 'paid') return 'Opłacone w całości.'
  if (status === 'deposit') {
    return remaining === null
      ? 'Zaliczka wpłynęła. Resztę zapłać najpóźniej w dniu rozpoczęcia obozu.'
      : `Zaliczka wpłynęła. Do zapłaty zostało ${formatPln(remaining)} — najpóźniej w dniu rozpoczęcia obozu.`
  }
  if ((status === 'new' || status === 'confirmed') && depositDueAt) {
    return `Zaliczka ${formatPln(CAMP_DEPOSIT_PLN)} do ${DAY_FORMAT.pl.format(new Date(depositDueAt))} — dane do przelewu są w mailu po formularzu.`
  }
  return undefined
}
