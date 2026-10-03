/**
 * CSV for Polish Excel — the session participant list (insurance, a printout
 * for the crag). Pure functions, tested under `node --test`.
 *
 * Four traps, each one a measured way for the file to come out wrong:
 *
 *  1. Encoding. Without a byte-order mark Excel reads UTF-8 as Windows-1250
 *     and "Żaneta" opens as "Å»aneta".
 *  2. Separator. Polish Excel splits on SEMICOLONS (the comma is the decimal
 *     separator); a comma file opens as one column.
 *  3. Formulas. A name typed into the public form as `=HYPERLINK(...)` would
 *     run as a formula on the school's computer (CSV injection). A cell that
 *     starts with = + - @ tab or CR gets an apostrophe in front.
 *  4. Phones. "+48600100200" is read as the number 48600100200 — the plus
 *     and the grouping are lost. Phones go out as `="+48 600 100 200"`, a
 *     formula WE write from a value we normalised, which Excel shows as text.
 */

const FORMULA_START = /^[=+\-@\t\r]/

/** One text cell: guarded against formulas, quoted when it must be. */
export function csvCell(value: string | null | undefined): string {
  let text = value ?? ''
  if (FORMULA_START.test(text)) text = `'${text}`
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * A phone in the stored format (`+` code and nine digits, `normalizePhone`)
 * becomes a text formula with readable grouping. Anything else — a phone
 * typed differently in the panel — is an ordinary guarded cell.
 */
export function csvPhone(value: string | null | undefined): string {
  const match = /^\+(\d{1,4})(\d{3})(\d{3})(\d{3})$/.exec(value ?? '')
  if (!match) return csvCell(value)
  return `="+${match[1]} ${match[2]} ${match[3]} ${match[4]}"`
}

/** Rows of ALREADY ENCODED cells (`csvCell`, `csvPhone`) → the file. */
export function toCsv(rows: string[][]): string {
  return '﻿' + rows.map((row) => row.join(';')).join('\r\n') + '\r\n'
}
