/**
 * PESEL — the Polish personal number, asked for a child on the camp
 * registration form (the contract and the insurance need it). Pure
 * functions, tested under `node --test`.
 *
 * Checked as the number is built: 11 digits, a valid date in the first six
 * (the month carries the century: +80 for the 1800s, +20 for the 2000s,
 * +40, +60 beyond) and the control digit. That catches a typo; whether the
 * number belongs to the child is not something a form can know.
 */

const WEIGHTS = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]

/** The birth date in the number, as `YYYY-MM-DD`, or null when there is none. */
export function peselBirthDate(raw: string): string | null {
  const pesel = raw.trim()
  if (!/^\d{11}$/.test(pesel)) return null
  const yy = Number(pesel.slice(0, 2))
  const mm = Number(pesel.slice(2, 4))
  const dd = Number(pesel.slice(4, 6))
  const century = [1900, 2000, 2100, 2200, 1800][Math.floor(mm / 20)]
  const month = mm % 20
  if (century === undefined || month < 1 || month > 12) return null
  const year = century + yy
  const date = new Date(Date.UTC(year, month - 1, dd))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== dd) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(dd)}`
}

/** The form's message for a PESEL that cannot be right, or undefined. */
export function checkPesel(raw: string): string | undefined {
  const pesel = raw.trim()
  if (!pesel) return 'Podaj PESEL dziecka.'
  if (!/^\d{11}$/.test(pesel)) return 'PESEL ma 11 cyfr.'
  if (!peselBirthDate(pesel)) return 'Ten PESEL nie zawiera poprawnej daty urodzenia.'
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(pesel[i]), 0)
  if ((10 - (sum % 10)) % 10 !== Number(pesel[10]))
    return 'Ten PESEL ma błąd — sprawdź cyfry jeszcze raz.'
  return undefined
}
