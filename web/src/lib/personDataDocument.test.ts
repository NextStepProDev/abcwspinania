import test from 'node:test'
import assert from 'node:assert/strict'

import { personDataDocument, type PersonDataCopy } from '@/lib/personDataDocument'

/**
 * The copy of a person's data the school sends back (12.10.2026): a page the
 * person can read, not a dump of field names.
 */
const copy: PersonDataCopy = {
  email: 'ola@x.pl',
  madeAt: '2026-10-12T10:00:00.000Z',
  account: {
    email: 'ola@x.pl',
    firstName: 'Ola',
    lastName: 'Nowak',
    phone: '+48600100200',
    language: 'pl',
    _verified: true,
  },
  bookings: [
    {
      firstName: 'Ola',
      lastName: 'Nowak',
      status: 'paid',
      notes: 'Bez glutenu\nI bez orzechów',
      createdAt: '2026-10-03T12:20:00.000Z',
      session: '23 paź–27 paź 2026 · Kurs PZA',
    },
  ],
  messages: [{ name: '<script>alert(1)</script>', topic: 'camp', message: 'Pytanie' }],
  newsletter: [],
  messagesSentToThem: [{ subject: 'Zbiórka o 8:00', status: 'sent' }],
}

test('the copy speaks Polish to the person: labels, statuses, dates in Polish time', () => {
  const html = personDataDocument(copy)
  assert.match(html, /<th>Telefon<\/th><td>\+48600100200<\/td>/)
  assert.match(html, /<th>Status<\/th><td>opłacony<\/td>/)
  assert.match(html, /<th>Temat<\/th><td>Obóz lub wyjazd<\/td>/)
  assert.match(html, /<th>Adres potwierdzony<\/th><td>tak<\/td>/)
  // 12:20 UTC on 3 October is 14:20 in Poland.
  assert.match(html, /3 października 2026.*14:20/)
  assert.doesNotMatch(html, /firstName|"status"|\bpaid\b|undefined|null/)
})

test('what a visitor typed cannot become markup', () => {
  const html = personDataDocument(copy)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /Bez glutenu<br>I bez orzechów/)
})

test('it names the controller, says what is missing and why there is no password', () => {
  const html = personDataDocument(copy)
  assert.match(html, /Administrator danych: Krzysztof Wróbel/)
  assert.match(html, /<h2>Newsletter<\/h2><p class="none">Brak\.<\/p>/)
  assert.match(html, /Hasła do konta nie znamy/)
  assert.match(html, /ola@x\.pl/)
})

test('without an account there is no word about an account password', () => {
  const html = personDataDocument({ ...copy, account: null })
  assert.match(html, /<h2>Konto na stronie<\/h2><p class="none">Brak\.<\/p>/)
  assert.doesNotMatch(html, /Hasła do konta/)
})
