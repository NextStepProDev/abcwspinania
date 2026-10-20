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

import { checkHeight, isValid, validateCampRegistration } from '@/lib/validation'

const form = {
  pesel: '15230701232',
  height: '142',
  allergies: '',
  medications: '',
  diet: '',
  conditions: '',
  activitiesConsent: true,
  photoConsent: false,
  invoiceRequested: false,
  consent: true,
}

test('a registration with nothing to report on health passes', () => {
  assert.ok(isValid(validateCampRegistration(form)))
})

test('the PESEL, the height and both consents are required', () => {
  const errors = validateCampRegistration({
    ...form,
    pesel: '',
    height: '',
    activitiesConsent: false,
    consent: false,
  })
  assert.deepEqual(Object.keys(errors).sort(), ['activitiesConsent', 'consent', 'height', 'pesel'])
})

test('the height is whole centimetres within a child’s range', () => {
  assert.equal(checkHeight('142'), undefined)
  assert.match(checkHeight('1,42') ?? '', /centymetrach/)
  assert.match(checkHeight('40') ?? '', /od 80/)
  assert.match(checkHeight('250') ?? '', /do 210/)
})

test('a health answer is bounded', () => {
  assert.ok(validateCampRegistration({ ...form, allergies: 'a'.repeat(2001) }).allergies)
})
