import test from 'node:test'
import assert from 'node:assert/strict'

import { checkPesel, peselBirthDate } from '@/lib/pesel'

test('the birth date comes out of the number, the century from the month', () => {
  assert.equal(peselBirthDate('15230701232'), '2015-03-07')
  assert.equal(peselBirthDate('02070803628'), '1902-07-08')
  // The example from the PESEL specification.
  assert.equal(peselBirthDate('44051401359'), '1944-05-14')
})

test('a number with an impossible date has no birth date', () => {
  assert.equal(peselBirthDate('15243101232'), null, '31 April')
  assert.equal(peselBirthDate('15223001232'), null, '30 February')
  assert.equal(peselBirthDate('15330101232'), null, 'month 13 of the 2000s')
  assert.equal(peselBirthDate('1523070123'), null, 'ten digits')
})

test('a correct PESEL passes, a typo in any digit does not', () => {
  assert.equal(checkPesel('15230701232'), undefined)
  assert.equal(checkPesel(' 44051401359 '), undefined, 'spaces around are fine')
  assert.match(checkPesel('15230701233') ?? '', /błąd/)
  assert.match(checkPesel('15230701 32') ?? '', /11 cyfr/)
  assert.match(checkPesel('') ?? '', /Podaj/)
  assert.match(checkPesel('15223001232') ?? '', /daty/)
})

// --- the registration form ------------------------------------------------------

import {
  checkHeight,
  checkNip,
  isValid,
  normalizeNip,
  validateRegistrationChild,
  validateRegistrationShared,
} from '@/lib/validation'

const child = {
  pesel: '15230701232',
  height: '142',
  allergies: '',
  medications: '',
  diet: '',
  conditions: '',
  photoConsent: false,
}

const shared = {
  street: 'ul. Jurajska 47',
  postcode: '42-421',
  city: 'Rzędkowice',
  invoiceRequested: false,
  invoiceCompany: false,
  invoiceCompanyName: '',
  invoiceNip: '',
  invoiceCompanyAddress: '',
  activitiesConsent: true,
  consent: true,
}

test('a child with nothing to report on health passes', () => {
  assert.ok(isValid(validateRegistrationChild(child)))
})

test('each child needs the PESEL and the height', () => {
  const errors = validateRegistrationChild({ ...child, pesel: '', height: '' })
  assert.deepEqual(Object.keys(errors).sort(), ['height', 'pesel'])
})

test('the height is whole centimetres within a child’s range', () => {
  assert.equal(checkHeight('142'), undefined)
  assert.match(checkHeight('1,42') ?? '', /centymetrach/)
  assert.match(checkHeight('40') ?? '', /od 80/)
  assert.match(checkHeight('250') ?? '', /do 210/)
})

test('a health answer is bounded', () => {
  assert.ok(validateRegistrationChild({ ...child, allergies: 'a'.repeat(2001) }).allergies)
})

test('the address and both consents are asked once, all required', () => {
  assert.ok(isValid(validateRegistrationShared(shared)))
  const errors = validateRegistrationShared({
    ...shared,
    street: '',
    postcode: '',
    city: '',
    activitiesConsent: false,
    consent: false,
  })
  assert.deepEqual(Object.keys(errors).sort(), [
    'activitiesConsent',
    'city',
    'consent',
    'postcode',
    'street',
  ])
})

test('a foreign postcode is fine, a fragment is not', () => {
  assert.ok(isValid(validateRegistrationShared({ ...shared, postcode: 'SW1A 1AA' })))
  assert.ok(validateRegistrationShared({ ...shared, postcode: '42' }).postcode)
})

test('a company invoice needs the name, a valid NIP and the address — only when chosen', () => {
  // Ticked "na firmę" without "faktura": nothing to check, the server ignores it.
  assert.ok(isValid(validateRegistrationShared({ ...shared, invoiceCompany: true })))
  const company = { ...shared, invoiceRequested: true, invoiceCompany: true }
  assert.deepEqual(Object.keys(validateRegistrationShared(company)).sort(), [
    'invoiceCompanyAddress',
    'invoiceCompanyName',
    'invoiceNip',
  ])
  const filled = {
    ...company,
    invoiceCompanyName: 'IQ SERVICE',
    invoiceNip: '631-172-65-35',
    invoiceCompanyAddress: 'Rzędkowice 1, 42-421 Włodowice',
  }
  assert.ok(isValid(validateRegistrationShared(filled)))
})

test('a NIP is ten digits with its check digit, spaces, dashes and PL allowed', () => {
  assert.equal(checkNip('6311726535'), undefined)
  assert.equal(checkNip('PL 631 172 65 35'), undefined)
  assert.equal(normalizeNip('631-172-65-35'), '6311726535')
  assert.match(checkNip('6311726536') ?? '', /błąd/)
  assert.match(checkNip('63117265') ?? '', /10 cyfr/)
  assert.match(checkNip('') ?? '', /Podaj/)
})
