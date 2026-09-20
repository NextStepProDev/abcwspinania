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
