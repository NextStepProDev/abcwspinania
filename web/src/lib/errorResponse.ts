/**
 * Gives a public Payload error its message back when Payload answered with
 * "An unknown error occurred." instead.
 *
 * Payload's `formatErrors` keeps the message only if the error has a `name`,
 * and `APIError` takes its name from `this.constructor.name`. The production
 * image's minifier can leave the class nameless (measured 18.10.2026:
 * deleting a session with bookings showed "An unknown error occurred." in the
 * panel; the log had `"type": ""`, the response was exactly those 53 bytes).
 * A local build happened to name the class "k", so locally it worked — which
 * name a build gets is not ours to control. Same family as `lib/authErrors.ts`.
 *
 * Public by Payload's own rule (`isErrorPublic`): `isPublic: true`, or a
 * status other than 500 unless marked `isPublic: false`. Anything else stays
 * hidden — a server error can carry a query or a secret.
 *
 * Pure (no Payload instance needed), so it is unit-tested against Payload's
 * own `formatErrors`; registered as the global `afterError` hook in
 * `payload.config.ts`.
 */

const UNKNOWN_ERROR = 'An unknown error occurred.'

/** One entry of Payload's error answer (`ErrorResult['errors']`). */
interface ErrorEntry {
  message: string
  data?: Record<string, unknown>
}

interface ErrorLike {
  message?: unknown
  status?: unknown
  isPublic?: unknown
  data?: unknown
}

function isPublic({ isPublic, status }: ErrorLike): boolean {
  if (isPublic === true) return true
  if (isPublic === false) return false
  return typeof status === 'number' && status !== 500
}

function isUnknownFallback(result: unknown): boolean {
  if (typeof result !== 'object' || result === null || !('errors' in result)) return false
  const { errors } = result
  return (
    Array.isArray(errors) &&
    errors.length === 1 &&
    typeof errors[0] === 'object' &&
    errors[0] !== null &&
    errors[0].message === UNKNOWN_ERROR
  )
}

export function restorePublicMessage(
  error: unknown,
  result: unknown,
): { response: { errors: ErrorEntry[] } } | undefined {
  if (!isUnknownFallback(result)) return undefined
  if (typeof error !== 'object' || error === null) return undefined
  const known = error as ErrorLike
  if (typeof known.message !== 'string' || known.message === '' || !isPublic(known)) {
    return undefined
  }
  const entry: ErrorEntry = { message: known.message }
  if (typeof known.data === 'object' && known.data !== null) {
    entry.data = known.data as Record<string, unknown>
  }
  return { response: { errors: [entry] } }
}
