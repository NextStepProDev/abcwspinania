import test from 'node:test'
import assert from 'node:assert/strict'

import {
  APIError,
  AuthenticationError,
  LockedAuth,
  UnverifiedEmail,
  ValidationError,
} from 'payload'

import { loginFailure } from '@/lib/authErrors'

test('Payload login errors are told apart by status, not by class', () => {
  assert.equal(loginFailure(new AuthenticationError()), 'rejected')
  assert.equal(loginFailure(new LockedAuth()), 'rejected')
  assert.equal(loginFailure(new UnverifiedEmail({})), 'unverified')
})

test('a copy of the class from another bundle chunk is still recognised', () => {
  // What the production build throws to a form sent before its JavaScript
  // ran: the same error, but `instanceof` against our import is false
  // (measured 18.10.2026 — the login form said "Nie udało się zalogować" for
  // a wrong password).
  const copy = Object.assign(new Error('Podany adres e-mail lub hasło jest nieprawidłowe.'), {
    status: 401,
    isPublic: true,
  })
  assert.equal(copy instanceof AuthenticationError, false)
  assert.equal(loginFailure(copy), 'rejected')
})

test('anything else is not a login failure', () => {
  assert.equal(loginFailure(new Error('connection refused')), null)
  assert.equal(loginFailure(new ValidationError({ errors: [] })), null)
  assert.equal(loginFailure(new APIError('database down', 500)), null)
  assert.equal(loginFailure(undefined), null)
  assert.equal(loginFailure('401'), null)
})
