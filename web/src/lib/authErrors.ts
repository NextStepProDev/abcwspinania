/**
 * What went wrong in `payload.login` — told apart by HTTP status, NOT by
 * `instanceof`.
 *
 * ⚠️ Measured 18.10.2026 on the production build (`next build`, as in the
 * image): when a form is sent BEFORE the page's JavaScript runs (Enter
 * pressed right after typing, a slow connection), the action runs from a
 * different server chunk, with its own copy of Payload's error classes (the
 * class name came out as "N") — and `error instanceof AuthenticationError`
 * was FALSE for the very error Payload threw. A wrong password on the login
 * form then said "Nie udało się zalogować", an unconfirmed address lost its
 * "send the link again", and a wrong password in "Usuń konto" read as a
 * server failure (reported from the test round). With the JavaScript loaded,
 * and in `next dev` always, there is one copy — invisible in normal testing.
 * The status is a plain number on the error and survives any bundling.
 *
 * Only for `payload.login`: there 401 is a wrong password or a locked
 * account (`AuthenticationError`, `LockedAuth` — one status, told apart by
 * the caller if it must, from `lockUntil`), and 403 is an unconfirmed
 * address (`UnverifiedEmail`; the other 403 there, `Forbidden`, needs
 * `disableLocalStrategy`, which no collection sets).
 */
export type LoginFailure = 'rejected' | 'unverified'

export function loginFailure(error: unknown): LoginFailure | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null
  if (error.status === 401) return 'rejected'
  if (error.status === 403) return 'unverified'
  return null
}
