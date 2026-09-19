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

const LEVEL_LABELS: Record<NonNullable<Kursy['level']>, string> = {
  poczatkujacy: 'początkujący',
  sredniozaawansowany: 'średniozaawansowany',
  zaawansowany: 'zaawansowany',
}

export function formatLevel(level: Kursy['level']): string | null {
  return level ? LEVEL_LABELS[level] : null
}
