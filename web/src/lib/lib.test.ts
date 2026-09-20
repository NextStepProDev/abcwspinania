import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatPrice,
  formatCena,
  formatLevel,
  latOd,
  odmien,
  formatWolneMiejsca,
  formatZakresDat,
  formatZakresKrotki,
  nazwaMiesiaca,
  grupujPoMiesiacach,
  formatWiek,
  czasCzytania,
  kotwica,
  spisTresci,
  formatKategoria,
} from '@/lib/format'
import { jsonLd, organizationSchema } from '@/lib/schema'
import type { Ustawienia } from '@/payload-types'
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
  assert.equal(formatLevel('sredniozaawansowany'), 'Średniozaawansowany')
})

test('cena z przedrostkiem „od" tylko tam, gdzie jest o czym mówić', () => {
  // Realny cennik to warianty (kurs skalny: Jura / Rudawy / weekend / dwuosobowy),
  // więc jedna liczba bez „od" byłaby nieprawdą.
  assert.match(formatCena(2400, true), /^od /)
  assert.ok(!formatCena(2400, false).startsWith('od '))
  // Brak ceny nie dostaje „od wycena indywidualna".
  assert.equal(formatCena(null, true), 'wycena indywidualna')
})

test('lata liczone z roku założenia, nie wpisywane ręcznie', () => {
  assert.equal(latOd(2001, new Date('2026-09-20')), 25)
  assert.equal(latOd(null), null)
  // Rok w przyszłości to błąd w panelu — lepiej nie pokazać nic niż „-2 lata".
  assert.equal(latOd(2030, new Date('2026-09-20')), null)
})

test('odmiana przez liczbę obsługuje wszystkie trzy formy', () => {
  const w = (n: number) => odmien(n, 'wolne', 'wolne', 'wolnych')
  assert.equal(w(1), 'wolne')
  assert.equal(w(2), 'wolne')
  assert.equal(w(4), 'wolne')
  assert.equal(w(5), 'wolnych')
  // Nastolatki są wyjątkiem: 12–14 idą jak 5, mimo końcówki 2–4.
  assert.equal(w(12), 'wolnych')
  assert.equal(w(13), 'wolnych')
  assert.equal(w(22), 'wolne')
  assert.equal(w(25), 'wolnych')
})

test('brak miejsc to komunikat, a nie „0 wolnych"', () => {
  assert.equal(formatWolneMiejsca(0), 'brak miejsc')
  assert.equal(formatWolneMiejsca(2), '2 wolne')
  assert.equal(formatWolneMiejsca(5), '5 wolnych')
  // Nieustawiony limit to co innego niż limit wyczerpany.
  assert.equal(formatWolneMiejsca(null), 'zapytaj o miejsca')
})

// --- daty i terminy ---------------------------------------------------------

test('zakres dat skraca to, co się powtarza', () => {
  // Ten sam miesiąc: miesiąc i rok tylko raz.
  assert.equal(formatZakresDat('2026-05-04', '2026-05-09'), '4–9 maja 2026')
  // Różne miesiące, ten sam rok: rok tylko raz.
  assert.equal(formatZakresDat('2026-05-30', '2026-06-04'), '30 maja – 4 czerwca 2026')
  // Przełom roku: obie daty pełne, bo obie liczby coś znaczą.
  assert.equal(formatZakresDat('2026-12-28', '2027-01-03'), '28 grudnia 2026 – 3 stycznia 2027')
})

test('zakres dat używa dopełniacza, nie mianownika', () => {
  // Intl.formatRange() zwróciłby „4 maj", co po polsku jest błędem — stąd
  // ręczna tablica miesięcy zamiast gotowca.
  assert.match(formatZakresDat('2026-05-04', '2026-05-09'), /maja/)
  assert.ok(!formatZakresDat('2026-05-04', '2026-05-09').includes('maj '))
})

test('brak daty końcowej daje jedną datę, nie pusty zakres', () => {
  assert.equal(formatZakresDat('2026-05-16'), '16 maja 2026')
  assert.equal(formatZakresDat('2026-05-16', null), '16 maja 2026')
})

test('niepoprawna data nie wywraca renderowania', () => {
  assert.equal(formatZakresDat('bzdura'), '')
  assert.equal(nazwaMiesiaca('bzdura'), '')
})

test('krótki zapis obcina rok tylko wtedy, gdy występuje raz', () => {
  assert.equal(formatZakresKrotki('2026-05-04', '2026-05-09'), '4–9 maja')
  // Przełom roku zostaje nietknięty — obcięcie zmieniłoby znaczenie.
  assert.equal(formatZakresKrotki('2026-12-28', '2027-01-03'), '28 grudnia 2026 – 3 stycznia 2027')
})

test('grupowanie po miesiącach zachowuje kolejność wejścia', () => {
  const grupy = grupujPoMiesiacach([
    { dataOd: '2026-05-04' },
    { dataOd: '2026-05-16' },
    { dataOd: '2026-06-06' },
    { dataOd: '2026-07-06' },
  ])
  assert.deepEqual(
    grupy.map((g) => g.nazwa),
    ['Maj 2026', 'Czerwiec 2026', 'Lipiec 2026'],
  )
  assert.equal(grupy[0].pozycje.length, 2)
})

test('grupowanie pomija wpisy z niepoprawną datą zamiast się wywracać', () => {
  const grupy = grupujPoMiesiacach([{ dataOd: 'bzdura' }, { dataOd: '2026-05-04' }])
  assert.equal(grupy.length, 1)
})

test('przedział wieku obsługuje wszystkie trzy warianty', () => {
  assert.equal(formatWiek(10, 14), '10–14 lat')
  assert.equal(formatWiek(18, null), '18+')
  assert.equal(formatWiek(null, null), null)
})

// --- treść z edytora --------------------------------------------------------

// Minimalny fragment drzewa Lexical — tyle, ile czytają nasze funkcje.
const akapit = (tekst: string) => ({
  type: 'paragraph',
  children: [{ type: 'text', text: tekst }],
})
const naglowek = (tekst: string) => ({
  type: 'heading',
  tag: 'h2',
  children: [{ type: 'text', text: tekst }],
})

test('czas czytania liczy się z treści, nie jest wpisywany', () => {
  const stoSlow = Array.from({ length: 100 }, () => 'słowo').join(' ')
  assert.equal(czasCzytania({ root: { children: [akapit(stoSlow)] } }), 1)
  const szescset = Array.from({ length: 600 }, () => 'słowo').join(' ')
  assert.equal(czasCzytania({ root: { children: [akapit(szescset)] } }), 3)
})

test('pusta treść daje minutę, nie zero', () => {
  // „0 min czytania" wygląda na błąd, nawet gdy jest prawdą.
  assert.equal(czasCzytania(null), 1)
  assert.equal(czasCzytania({ root: { children: [] } }), 1)
})

test('kotwica rozkłada polskie znaki zamiast je przepuszczać', () => {
  assert.equal(kotwica('Rejon pod presją'), 'rejon-pod-presja')
  assert.equal(kotwica('Co się zmieniło w sprzęcie'), 'co-sie-zmienilo-w-sprzecie')
  // „ł" nie ma formy rozkładalnej w NFD, więc wymaga osobnej reguły.
  assert.equal(kotwica('Ludzie, którzy przyjeżdżają'), 'ludzie-ktorzy-przyjezdzaja')
})

test('spis treści bierze tylko nagłówki drugiego stopnia', () => {
  const tresc = {
    root: {
      children: [
        akapit('wstęp'),
        naglowek('Pierwszy kurs'),
        akapit('treść'),
        { type: 'heading', tag: 'h3', children: [{ type: 'text', text: 'Podrozdział' }] },
        naglowek('Co dalej'),
      ],
    },
  }
  assert.deepEqual(spisTresci(tresc), [
    { id: 'pierwszy-kurs', etykieta: 'Pierwszy kurs' },
    { id: 'co-dalej', etykieta: 'Co dalej' },
  ])
})

test('powtórzone nagłówki dostają różne kotwice', () => {
  // Dwie identyczne kotwice sprawiłyby, że obie prowadzą do pierwszej.
  const tresc = { root: { children: [naglowek('Sprzęt'), naglowek('Sprzęt')] } }
  const spis = spisTresci(tresc)
  assert.equal(spis[0].id, 'sprzet')
  assert.equal(spis[1].id, 'sprzet-2')
})

test('nieznana kategoria nie znika, tylko wraca surowa', () => {
  assert.equal(formatKategoria('poradniki'), 'Poradniki')
  assert.equal(formatKategoria('cos-nowego'), 'cos-nowego')
  assert.equal(formatKategoria(null), null)
})

// --- dane strukturalne ------------------------------------------------------

const USTAWIENIA: Ustawienia = {
  id: 1,
  telefon: '609 465 237',
  telefonE164: '+48609465237',
  email: 'biuro@abcwspinania.info',
  ulica: 'Jurajska 47',
  kodPocztowy: '42-421',
  miejscowosc: 'Rzędkowice',
  nazwaFirmy: 'ABC Wspinania',
  updatedAt: null,
  createdAt: null,
}

test('dane strukturalne zawierają adres pocztowy', () => {
  const schema = organizationSchema(USTAWIENIA) as Record<string, unknown>
  assert.equal(schema['@type'], 'SportsActivityLocation')
  assert.ok(schema.address, 'adres jest tym, czego starej stronie brakowało')
})

test('puste pola kontaktowe nie trafiają do schematu', () => {
  // Google woli brak pola niż pole puste — pusty telefon psuje wizytówkę.
  const schema = organizationSchema({ id: 1, updatedAt: null, createdAt: null }) as Record<
    string,
    unknown
  >
  assert.ok(!('telephone' in schema))
  assert.ok(!('email' in schema))
  assert.ok(!('address' in schema))
})

test('niekompletny adres nie trafia do schematu w ogóle', () => {
  // Sama miejscowość bez ulicy wygląda w danych jak komplet i nikt się nie
  // zorientuje, że czegoś brakuje — lepiej nie podać nic.
  const schema = organizationSchema({
    id: 1,
    miejscowosc: 'Rzędkowice',
    updatedAt: null,
    createdAt: null,
  }) as Record<string, unknown>
  assert.ok(!('address' in schema))
})

test('telefon w schemacie idzie w formacie międzynarodowym', () => {
  const schema = organizationSchema(USTAWIENIA) as Record<string, unknown>
  assert.equal(schema.telephone, '+48609465237')
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
