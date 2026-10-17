import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PASSWORD_MIN,
  isValid,
  normalizePhone,
  validateAccountDetails,
  validateEmailOnly,
  validateLogin,
  validateNewPassword,
  validateRegistration,
} from '@/lib/validation'
import {
  ACCOUNT_CONSENT_TEXT,
  ACCOUNT_CONSENT_VERSION,
  accountConsentForStorage,
} from '@/lib/consent'

const registration = {
  firstName: 'Ola',
  lastName: 'Nowak',
  email: 'ola@example.com',
  phone: '+48600100200',
  password: 'cztery slowa na skale',
  consent: true,
}

test('a complete registration passes', () => {
  assert.ok(isValid(validateRegistration(registration)))
})

test('the phone is required, in the Next Step Pro format: +code and 9 digits', () => {
  assert.ok(validateRegistration({ ...registration, phone: '' }).phone)
  assert.ok(validateRegistration({ ...registration, phone: '600100200' }).phone, 'no country code')
  // The pattern counts 10 to 13 digits in all — it cannot tell "+48 and 8
  // digits" from "+4 and 9 digits", so too short means 9 digits or fewer.
  assert.ok(validateRegistration({ ...registration, phone: '+486001002' }).phone, '9 digits')
  assert.ok(validateRegistration({ ...registration, phone: '+48600100200x' }).phone)
  assert.ok(
    validateRegistration({ ...registration, phone: '+12345600100200' }).phone,
    '5-digit code',
  )
  assert.ok(isValid(validateRegistration({ ...registration, phone: '+1600100200' })))
})

test('spaces, dashes and brackets in a typed phone number are forgiven', () => {
  assert.ok(isValid(validateRegistration({ ...registration, phone: '+48 600 100 200' })))
  assert.ok(isValid(validateRegistration({ ...registration, phone: '+48-600-100-200' })))
  assert.ok(isValid(validateRegistration({ ...registration, phone: '+48 (600) 100 200' })))
  assert.equal(normalizePhone(' +48 600-100 200 '), '+48600100200')
})

test('registration names every missing field', () => {
  const errors = validateRegistration({
    firstName: ' ',
    lastName: '',
    email: 'nie-mail',
    phone: '',
    password: '',
    consent: false,
  })
  assert.deepEqual(Object.keys(errors).sort(), [
    'consent',
    'email',
    'firstName',
    'lastName',
    'password',
    'phone',
  ])
})

test('the password minimum is enforced at exactly its edge', () => {
  const short = 'a'.repeat(PASSWORD_MIN - 1)
  const exact = 'a'.repeat(PASSWORD_MIN)
  assert.ok(validateNewPassword(short).password)
  assert.ok(isValid(validateNewPassword(exact)))
  assert.ok(validateRegistration({ ...registration, password: short }).password)
})

test('a password is not trimmed — spaces count as characters', () => {
  assert.ok(isValid(validateNewPassword(' '.repeat(PASSWORD_MIN))))
})

test('an absurdly long password is refused before it reaches hashing', () => {
  assert.ok(validateNewPassword('a'.repeat(129)).password)
  assert.ok(isValid(validateNewPassword('a'.repeat(128))))
})

test('login checks presence only — no password rules to probe', () => {
  assert.ok(isValid(validateLogin({ email: 'ola@example.com', password: 'x' })))
  assert.deepEqual(Object.keys(validateLogin({ email: '', password: '' })).sort(), [
    'email',
    'password',
  ])
})

test('a bare email form accepts an address and rejects a fragment', () => {
  assert.ok(isValid(validateEmailOnly(' ola@example.com ')))
  assert.ok(validateEmailOnly('ola@').email)
})

test('the account consent is stored with its version, word for word', () => {
  assert.equal(accountConsentForStorage(), `[${ACCOUNT_CONSENT_VERSION}] ${ACCOUNT_CONSENT_TEXT}`)
  // An account is not a marketing consent — that one stays with the newsletter.
  assert.doesNotMatch(ACCOUNT_CONSENT_TEXT, /newsletter|informacji handlowych|marketing/i)
})

import { safeNextPath } from '@/lib/validation'

test('after login only a path on this site is followed', () => {
  assert.equal(safeNextPath('/obozy/oboz-przygodowy/zapis'), '/obozy/oboz-przygodowy/zapis')
  assert.equal(safeNextPath('//evil.example/login'), '/konto')
  assert.equal(safeNextPath('/\\evil.example'), '/konto')
  assert.equal(safeNextPath('https://evil.example'), '/konto')
  assert.equal(safeNextPath('javascript:alert(1)'), '/konto')
  assert.equal(safeNextPath(undefined), '/konto')
  assert.equal(safeNextPath(['/a']), '/konto')
})

import { isExpired } from '@/lib/expiry'

test('a link expires exactly when its hours are up, not a moment before', () => {
  const issued = '2026-10-02T10:00:00.000Z'
  assert.equal(isExpired(issued, 48, new Date('2026-10-04T09:59:59.999Z')), false)
  assert.equal(isExpired(issued, 48, new Date('2026-10-04T10:00:00.000Z')), true)
  assert.equal(isExpired(issued, 48, new Date('2026-10-01T10:00:00.000Z')), false, 'clock skew')
})

test('an unreadable issue date counts as expired, not as valid forever', () => {
  assert.equal(isExpired('not a date', 48, new Date()), true)
  assert.equal(isExpired(undefined, 48, new Date()), true)
})

import { checkName } from '@/lib/validation'

test('a name needs at least two letters', () => {
  assert.ok(checkName('A'))
  assert.ok(checkName(' a '))
  assert.equal(checkName('Li'), undefined)
  assert.equal(checkName('Wu'), undefined)
  assert.equal(checkName('Ola'), undefined)
})

test('real names with hyphens, apostrophes, spaces and Polish letters pass', () => {
  for (const name of ['Anna-Maria', "O'Neil", 'Jan Maria', 'Żółć', 'Łukasz', 'St. John']) {
    assert.equal(checkName(name), undefined, name)
  }
})

test('digits and symbols are not a name', () => {
  assert.ok(checkName('Ola2'))
  assert.ok(checkName('a1'))
  assert.ok(checkName('!!'))
  assert.ok(checkName('--'), 'punctuation without letters')
})

test('registration uses the same name rule for both names', () => {
  assert.ok(validateRegistration({ ...registration, firstName: 'O' }).firstName)
  assert.ok(validateRegistration({ ...registration, lastName: 'N' }).lastName)
  assert.ok(isValid(validateRegistration({ ...registration, lastName: 'Li' })))
})

import { passwordLengthLabel } from '@/lib/validation'

test('the password counter speaks proper Polish plurals', () => {
  assert.equal(passwordLengthLabel(0, 10), '0 / 10 znaków')
  assert.equal(passwordLengthLabel(3, 10), '3 / 10 znaków')
  assert.equal(passwordLengthLabel(10, 10), 'Długość w porządku (10 znaków).')
  assert.equal(passwordLengthLabel(22, 10), 'Długość w porządku (22 znaki).')
  assert.equal(passwordLengthLabel(24, 10), 'Długość w porządku (24 znaki).')
  assert.equal(passwordLengthLabel(25, 10), 'Długość w porządku (25 znaków).')
})

import { staleUnverifiedWhere, UNVERIFIED_ACCOUNT_DAYS } from '@/lib/expiry'

test('unconfirmed accounts are kept for a week', () => {
  assert.equal(UNVERIFIED_ACCOUNT_DAYS, 7)
})

test('the stale-account query skips confirmed accounts and counts from the latest link', () => {
  const now = new Date('2026-10-10T12:00:00.000Z')
  const cutoff = '2026-10-03T12:00:00.000Z'
  assert.deepEqual(staleUnverifiedWhere(now), {
    and: [
      { _verified: { not_equals: true } },
      { createdAt: { less_than: cutoff } },
      {
        or: [
          { verificationSentAt: { less_than: cutoff } },
          { verificationSentAt: { exists: false } },
        ],
      },
    ],
  })
})

test('account details: the registration rules for name and phone, nothing else asked', () => {
  const details = { firstName: 'Ola', lastName: 'Nowak', phone: '+48 600 100 200' }
  assert.ok(isValid(validateAccountDetails(details)))
  assert.equal(validateAccountDetails({ ...details, firstName: '' }).firstName, 'Podaj imię.')
  assert.equal(validateAccountDetails({ ...details, lastName: ' ' }).lastName, 'Podaj nazwisko.')
  assert.ok(validateAccountDetails({ ...details, lastName: 'N0wak' }).lastName)
  assert.ok(validateAccountDetails({ ...details, phone: '600100200' }).phone, 'no country code')
  assert.ok(isValid(validateAccountDetails({ ...details, lastName: 'Li' })), 'two-letter surname')
})
