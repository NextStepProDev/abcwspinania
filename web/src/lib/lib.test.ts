import test from 'node:test'
import assert from 'node:assert/strict'

import { formatPrice, formatLevel } from '@/lib/format'
import { jsonLd, organizationSchema } from '@/lib/schema'
import { walidujKontakt, jestPoprawny, wygladaNaBota } from '@/lib/validation'
import type { DaneKontaktowe } from '@/lib/validation'
import { ZGODA_TRESC, ZGODA_WERSJA, zgodaDoZapisu } from '@/lib/consent'

// --- formatowanie -----------------------------------------------------------

test('brak ceny znaczy wycenę indywidualną, nie zero złotych', () => {
  assert.equal(formatPrice(null), 'wycena indywidualna')
  assert.equal(formatPrice(undefined), 'wycena indywidualna')
})

test('zero złotych to jednak zero, a nie brak ceny', () => {
  // Rozróżnienie istotne: kurs darmowy to co innego niż kurs bez ustalonej ceny.
  assert.notEqual(formatPrice(0), 'wycena indywidualna')
})

test('cena formatowana po polsku, bez groszy', () => {
  const out = formatPrice(450)
  assert.match(out, /450/)
  assert.match(out, /zł/)
  assert.ok(!out.includes(','), 'nie pokazujemy groszy przy cenach kursów')
})

test('poziom bez wartości nie renderuje etykiety', () => {
  assert.equal(formatLevel(null), null)
  assert.equal(formatLevel('sredniozaawansowany'), 'średniozaawansowany')
})

// --- dane strukturalne ------------------------------------------------------

test('dane strukturalne zawierają adres pocztowy', () => {
  const schema = organizationSchema() as Record<string, unknown>
  assert.equal(schema['@type'], 'SportsActivityLocation')
  assert.ok(schema.address, 'adres jest tym, czego starej stronie brakowało')
})

test('puste pola kontaktowe nie trafiają do schematu', () => {
  // Google woli brak pola niż pole puste — pusty telefon psuje wizytówkę.
  const schema = organizationSchema() as Record<string, unknown>
  assert.ok(!('telephone' in schema) || Boolean(schema.telephone))
  assert.ok(!('email' in schema) || Boolean(schema.email))
})

test('serializacja ld+json nie pozwala zamknąć znacznika script', () => {
  const out = jsonLd({ name: '</script><script>alert(1)</script>' })
  assert.ok(!out.includes('</script>'))
  assert.ok(out.includes('\\u003c'))
})

// --- walidacja formularza ---------------------------------------------------

const POPRAWNE: DaneKontaktowe = {
  imie: 'Krzysiek',
  email: 'krzysiek@example.com',
  telefon: '600 100 200',
  tresc: 'Chciałbym zapisać syna na kurs skalny.',
  zgoda: true,
}

test('poprawny formularz przechodzi', () => {
  assert.ok(jestPoprawny(walidujKontakt(POPRAWNE)))
})

test('telefon jest nieobowiązkowy', () => {
  assert.ok(jestPoprawny(walidujKontakt({ ...POPRAWNE, telefon: '' })))
})

test('brak zgody blokuje wysyłkę', () => {
  const bledy = walidujKontakt({ ...POPRAWNE, zgoda: false })
  assert.ok(bledy.zgoda, 'bez zgody nie wolno przetwarzać danych')
})

test('same spacje to nie jest wypełnione pole', () => {
  const bledy = walidujKontakt({ ...POPRAWNE, imie: '   ', tresc: '  \n ' })
  assert.ok(bledy.imie)
  assert.ok(bledy.tresc)
})

test('adres bez kropki w domenie jest odrzucany', () => {
  assert.ok(walidujKontakt({ ...POPRAWNE, email: 'krzysiek@localhost' }).email)
})

test('adres z plusem i dłuższą domeną przechodzi', () => {
  // Częsty fałszywy alarm zbyt ostrych wzorców — takie adresy są poprawne.
  assert.ok(jestPoprawny(walidujKontakt({ ...POPRAWNE, email: 'k.nowak+kurs@moja-firma.com.pl' })))
})

test('za długa treść jest odrzucana', () => {
  assert.ok(walidujKontakt({ ...POPRAWNE, tresc: 'a'.repeat(4001) }).tresc)
})

test('pułapka na boty wykrywa wypełnione pole', () => {
  assert.equal(wygladaNaBota(''), false)
  assert.equal(wygladaNaBota('   '), false)
  assert.equal(wygladaNaBota('https://spam.example'), true)
})

// --- zgoda RODO -------------------------------------------------------------

test('zapis zgody niesie wersję i pełną treść klauzuli', () => {
  const zapis = zgodaDoZapisu()
  assert.ok(zapis.includes(ZGODA_WERSJA), 'bez wersji nie odróżnimy klauzul w bazie')
  assert.ok(zapis.includes(ZGODA_TRESC), 'zapisujemy treść, a nie samo „tak"')
})
