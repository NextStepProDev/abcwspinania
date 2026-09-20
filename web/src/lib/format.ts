import type { Kursy } from '@/payload-types'

/**
 * Czyste funkcje formatujące — BEZ importów runtime'owych z Payloada.
 *
 * To rozdzielenie jest celowe: `lib/content.ts` ciągnie za sobą cały silnik
 * Payloada i połączenie z bazą, więc testy jednostkowe odpalane gołym
 * `node --test` nie mogłyby go zaimportować. Tutaj wchodzi wyłącznie `import
 * type`, który znika przy kompilacji.
 */

/** Cena do wyświetlenia. Brak ceny znaczy „wycena indywidualna", nie „0 zł". */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'wycena indywidualna'
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Cena z przedrostkiem „od".
 *
 * Realny cennik szkoły to warianty (kurs skalny: 6 dni na Jurze, 6 dni
 * w Rudawach, wariant weekendowy, wersja dwuosobowa), więc jedna liczba na
 * kaflu byłaby nieprawdą. `odCeny` włącza przedrostek tam, gdzie wariantów
 * jest więcej niż jeden.
 */
export function formatCena(price: number | null | undefined, odCeny?: boolean | null): string {
  const kwota = formatPrice(price)
  if (price === null || price === undefined) return kwota
  return odCeny ? `od ${kwota}` : kwota
}

// Etykiety zgodne z makietą. Wartości w bazie zostają techniczne
// (`poczatkujacy`…), żeby zmiana nazewnictwa nie wymagała migracji enuma.
const LEVEL_LABELS: Record<NonNullable<Kursy['level']>, string> = {
  poczatkujacy: 'Od zera',
  sredniozaawansowany: 'Średniozaawansowany',
  zaawansowany: 'Zaawansowany',
}

export function formatLevel(level: Kursy['level']): string | null {
  return level ? LEVEL_LABELS[level] : null
}

export const POZIOMY = Object.entries(LEVEL_LABELS).map(([wartosc, etykieta]) => ({
  wartosc,
  etykieta,
}))

/**
 * Liczba lat od podanego roku.
 *
 * Liczona, a nie wpisywana — „25 lat doświadczenia" wpisane ręcznie jest
 * nieprawdziwe od najbliższego stycznia i nikt o tym nie pamięta.
 */
export function latOd(rok: number | null | undefined, teraz = new Date()): number | null {
  if (!rok) return null
  const lat = teraz.getFullYear() - rok
  return lat > 0 ? lat : null
}

/**
 * Odmiana rzeczownika przez liczbę — polski ma trzy formy, nie dwie.
 *
 * Bez tego dostajemy „2 wolne miejsc" albo „5 wolne miejsca" w tabeli
 * terminów, czyli dokładnie tam, gdzie tekst jest najkrótszy i najbardziej
 * widoczny.
 */
export function odmien(
  liczba: number,
  pojedyncza: string,
  mnoga: string,
  dopelniacz: string,
): string {
  if (liczba === 1) return pojedyncza
  const ostatnia = liczba % 10
  const dwieOstatnie = liczba % 100
  const mnogaForma = ostatnia >= 2 && ostatnia <= 4 && !(dwieOstatnie >= 12 && dwieOstatnie <= 14)
  return mnogaForma ? mnoga : dopelniacz
}

/** „brak miejsc" / „1 wolne" / „3 wolne" / „5 wolnych". */
export function formatWolneMiejsca(wolne: number | null | undefined): string {
  if (wolne === null || wolne === undefined) return 'zapytaj o miejsca'
  if (wolne <= 0) return 'brak miejsc'
  return `${wolne} ${odmien(wolne, 'wolne', 'wolne', 'wolnych')}`
}

// --- Daty i terminy ----------------------------------------------------------

const MIESIACE_DOPELNIACZ = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
]

const MIESIACE_MIANOWNIK = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]

/**
 * Zakres dat po polsku, skracany tam, gdzie powtórzenie nic nie wnosi.
 *
 *   4–9 maja 2026                (ten sam miesiąc — miesiąc raz)
 *   30 maja – 4 czerwca 2026     (różne miesiące, ten sam rok — rok raz)
 *   28 grudnia 2026 – 3 stycznia 2027
 *   16 maja 2026                 (brak daty końcowej)
 *
 * Świadomie ręcznie, nie przez `Intl.DateTimeFormat.formatRange()`: ta zwraca
 * „4 maj – 9 maj", bo używa mianownika. Po polsku w dacie idzie dopełniacz.
 */
export function formatZakresDat(od: string, doDaty?: string | null): string {
  const a = new Date(od)
  if (Number.isNaN(a.getTime())) return ''
  const dzienA = a.getDate()
  const miesiacA = MIESIACE_DOPELNIACZ[a.getMonth()]
  const rokA = a.getFullYear()

  if (!doDaty) return `${dzienA} ${miesiacA} ${rokA}`

  const b = new Date(doDaty)
  if (Number.isNaN(b.getTime())) return `${dzienA} ${miesiacA} ${rokA}`
  const dzienB = b.getDate()
  const miesiacB = MIESIACE_DOPELNIACZ[b.getMonth()]
  const rokB = b.getFullYear()

  if (rokA !== rokB) return `${dzienA} ${miesiacA} ${rokA} – ${dzienB} ${miesiacB} ${rokB}`
  if (a.getMonth() !== b.getMonth()) return `${dzienA} ${miesiacA} – ${dzienB} ${miesiacB} ${rokB}`
  // Półpauza bez spacji przy samych dniach — tak jak w „4–9 maja".
  return `${dzienA}–${dzienB} ${miesiacA} ${rokA}`
}

/** Krótki zapis na wąskie kolumny tabeli: „4–9 maja”, bez roku. */
export function formatZakresKrotki(od: string, doDaty?: string | null): string {
  const pelny = formatZakresDat(od, doDaty)
  // Rok odcinamy tylko wtedy, gdy występuje raz — przy przełomie lat obie
  // liczby niosą informację i skracanie zmieniłoby znaczenie.
  const lata = pelny.match(/\d{4}/g)
  return lata && lata.length === 1 ? pelny.replace(/\s*\d{4}/, '') : pelny
}

/** Nagłówek grupy w terminarzu: „Maj 2026”. */
export function nazwaMiesiaca(data: string): string {
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return ''
  return `${MIESIACE_MIANOWNIK[d.getMonth()]} ${d.getFullYear()}`
}

/** Klucz do grupowania po miesiącu, sortowalny leksykalnie. */
export function kluczMiesiaca(data: string): string {
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Grupuje terminy po miesiącu z zachowaniem kolejności wejścia.
 *
 * `Map` zamiast zwykłego obiektu jest tu istotna: obiekt w JS porządkuje
 * klucze wyglądające jak liczby całkowite rosnąco, niezależnie od kolejności
 * wstawiania. Klucze „2026-05" liczbami nie są, więc akurat by zadziałało —
 * ale to zbieżność formatu, nie gwarancja, i pierwsza zmiana formatu klucza
 * po cichu przestawiłaby miesiące.
 */
export function grupujPoMiesiacach<T extends { dataOd: string }>(
  pozycje: T[],
): { klucz: string; nazwa: string; pozycje: T[] }[] {
  const grupy = new Map<string, T[]>()
  for (const p of pozycje) {
    const k = kluczMiesiaca(p.dataOd)
    if (!k) continue
    const istniejace = grupy.get(k)
    if (istniejace) istniejace.push(p)
    else grupy.set(k, [p])
  }
  return [...grupy.entries()].map(([klucz, lista]) => ({
    klucz,
    nazwa: nazwaMiesiaca(lista[0].dataOd),
    pozycje: lista,
  }))
}

/** Przedział wieku na odznakę obozu: „10–14 lat”, „od 12 lat”, „18+”. */
export function formatWiek(od?: number | null, doWieku?: number | null): string | null {
  if (od && doWieku) return `${od}–${doWieku} lat`
  if (od) return `${od}+`
  if (doWieku) return `do ${doWieku} lat`
  return null
}
