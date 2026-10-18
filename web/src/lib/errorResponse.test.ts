import test from 'node:test'
import assert from 'node:assert/strict'

import { APIError, formatErrors } from 'payload'

import { restorePublicMessage } from '@/lib/errorResponse'

const REFUSAL = 'Ten termin ma zapisy (4). Zamiast usuwać, ustaw status „odwołany”.'

/** The error as the production image throws it: the minifier left the class nameless. */
function nameless(error: APIError): APIError {
  error.name = ''
  return error
}

test('Payload drops the message of a nameless error — the bug this works around', () => {
  // Measured 18.10.2026: deleting a session with bookings answered
  // {"errors":[{"message":"An unknown error occurred."}]} (53 bytes in the
  // nginx log), and the panel showed just that.
  assert.deepEqual(formatErrors(nameless(new APIError(REFUSAL, 400, null, true))), {
    errors: [{ message: 'An unknown error occurred.' }],
  })
})

test('a public error gets its own message back', () => {
  const error = nameless(new APIError(REFUSAL, 400, null, true))
  assert.deepEqual(restorePublicMessage(error, formatErrors(error)), {
    response: { errors: [{ message: REFUSAL }] },
  })
})

test('a 4xx error is public even without the flag, as Payload decides', () => {
  const error = nameless(new APIError(REFUSAL, 409))
  assert.deepEqual(restorePublicMessage(error, formatErrors(error)), {
    response: { errors: [{ message: REFUSAL }] },
  })
})

test('data travels with the message (field errors in the panel)', () => {
  // With data, Payload keeps the error by `instanceof` — which fails for a
  // copy of the class from another chunk (see lib/authErrors.ts), so a
  // look-alike stands in for it.
  const data = { errors: [{ path: 'email', message: 'Zły adres.' }] }
  const error = Object.assign(new Error(REFUSAL), { name: '', status: 400, isPublic: true, data })
  assert.equal(error instanceof APIError, false)
  assert.deepEqual(restorePublicMessage(error, formatErrors(error as unknown as APIError)), {
    response: { errors: [{ message: REFUSAL, data }] },
  })
})

test('a server error stays hidden — it can carry anything', () => {
  const error = nameless(new APIError('password=hunter2 in a failed query', 500))
  const hidden = { errors: [{ message: 'An unknown error occurred.' }] }
  assert.equal(restorePublicMessage(error, hidden), undefined)
  const marked = nameless(new APIError('secret', 400, null, false))
  assert.equal(restorePublicMessage(marked, hidden), undefined)
  assert.equal(restorePublicMessage(new Error('boom'), hidden), undefined)
})

test('an answer Payload formatted itself is left alone', () => {
  const error = new APIError(REFUSAL, 400, null, true)
  assert.equal(restorePublicMessage(error, formatErrors(error)), undefined)
  assert.equal(restorePublicMessage(error, { errors: [{ message: 'Inny komunikat.' }] }), undefined)
})
