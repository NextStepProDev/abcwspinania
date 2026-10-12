import test from 'node:test'
import assert from 'node:assert/strict'

import { languageHref, languageOf, signUpHref } from '@/components/navigation'

test('the privacy policy switches to its own translation and back', () => {
  assert.equal(languageHref('en', '/polityka-prywatnosci'), '/en/privacy-policy')
  assert.equal(languageHref('pl', '/en/privacy-policy'), '/polityka-prywatnosci')
  assert.equal(languageOf('/en/privacy-policy'), 'en')
})

test('a page without a translation switches to the other language’s homepage', () => {
  assert.equal(languageHref('en', '/kursy'), '/en')
  assert.equal(languageHref('pl', '/en'), '/')
})

test('"Zapisz się" never leads away from a form the visitor is filling in', () => {
  // Reported 12.10.2026: on the booking form the phone's bottom bar sent the
  // visitor to the schedule, mid-form.
  for (const path of [
    '/kursy/kurs-pza/zapis',
    '/kontakt',
    '/logowanie',
    '/rejestracja',
    '/konto',
    '/konto/usun',
    '/newsletter/potwierdz',
    '/terminarz',
  ]) {
    assert.equal(signUpHref(path), null, path)
  }
})

test('"Zapisz się" on a course or camp page leads to that one, elsewhere to the schedule', () => {
  assert.equal(signUpHref('/kursy/kurs-pza'), '/kursy/kurs-pza/zapis')
  assert.equal(signUpHref('/obozy/oboz-letni'), '/kontakt?camp=oboz-letni')
  assert.equal(signUpHref('/'), '/terminarz')
  assert.equal(signUpHref('/kursy'), '/terminarz')
  assert.equal(signUpHref('/obozy'), '/terminarz')
  assert.equal(signUpHref('/kontaktowy'), '/terminarz', 'only the exact form pages')
})
