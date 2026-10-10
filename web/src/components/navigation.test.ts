import test from 'node:test'
import assert from 'node:assert/strict'

import { languageHref, languageOf } from '@/components/navigation'

test('the privacy policy switches to its own translation and back', () => {
  assert.equal(languageHref('en', '/polityka-prywatnosci'), '/en/privacy-policy')
  assert.equal(languageHref('pl', '/en/privacy-policy'), '/polityka-prywatnosci')
  assert.equal(languageOf('/en/privacy-policy'), 'en')
})

test('a page without a translation switches to the other language’s homepage', () => {
  assert.equal(languageHref('en', '/kursy'), '/en')
  assert.equal(languageHref('pl', '/en'), '/')
})
