/**
 * Links to a pre-filtered list in the panel — the menu's "Zapisy na kursy /
 * na obozy" and the dashboard's tiles.
 *
 * The conditions go as `where[and][N][field][operator]`, one field each.
 * The list reads any `where`, but the builder (the "Filtry" panel) draws a
 * condition per `and` entry and only its FIRST field: a flat
 * `where[a]…&where[b]…` or a nested `and` showed fewer conditions than
 * applied, so a list of three children looked like the whole list (reported
 * 24.10.2026). A condition on a relationship's field (`session.startDate`)
 * it does not draw at all — hence `sessionStart` on the booking.
 *
 * Not the builder's own `where[or][0][and][N]`: with it Payload opens the
 * "Filtry" panel on every such link (`ListControls`, `validateWhereQuery`),
 * which the school did not want. A plain `and` it turns into the same
 * conditions (`transformWhereQuery`) and leaves the panel closed.
 */

/** One field and its operator, e.g. `{ status: { equals: 'new' } }`. */
export type ListCondition = Record<string, Record<string, unknown>>

/** The same conditions for a count — what the list will show. */
export function whereOf(conditions: ListCondition[]) {
  return { and: conditions }
}

export function whereParams(conditions: ListCondition[], params = new URLSearchParams()) {
  conditions.forEach((condition, i) => {
    const fields = Object.entries(condition)
    if (fields.length !== 1) {
      throw new Error(`A list condition takes one field, got: ${fields.map(([f]) => f).join(', ')}`)
    }
    const [[field, operators]] = fields
    for (const [operator, value] of Object.entries(operators)) {
      const key = `where[and][${i}][${field}][${operator}]`
      if (Array.isArray(value)) value.forEach((v, j) => params.append(`${key}[${j}]`, String(v)))
      else params.append(key, String(value))
    }
  })
  return params
}

/**
 * The bookings list as the menu opens it (asked for 24.10.2026): by the
 * session's date, 100 rows a page, who and when in separate columns. In the
 * address, not only as the collection's defaults: Payload keeps each user's
 * last sort, page size and columns and prefers them, so a default alone
 * never reached anyone who had opened the list before. The cost: columns
 * picked by hand go back to these on the next such link.
 */
export const BOOKINGS_LIST_COLUMNS = ['participant', 'session', 'status', 'phone', 'createdAt']

export function bookingsListUrl(conditions: ListCondition[], admin = '/admin'): string {
  const params = whereParams(conditions)
  params.set('sort', 'sessionStart')
  params.set('limit', '100')
  params.set('columns', JSON.stringify(BOOKINGS_LIST_COLUMNS))
  return `${admin}/collections/bookings?${params.toString()}`
}

/** Any other collection's list, filtered only. */
export function listUrl(collection: string, conditions: ListCondition[], admin = '/admin'): string {
  return `${admin}/collections/${collection}?${whereParams(conditions).toString()}`
}
