/**
 * Tematy zgłoszeń z formularza kontaktowego — JEDNO źródło.
 *
 * Ta sama lista jest potrzebna w trzech miejscach: jako opcje pola w kolekcji
 * `Wiadomosci`, jako zakres dopuszczalnych wartości w walidacji serwerowej
 * i jako pozycje `<select>` w formularzu. Trzymana osobno w każdym z nich
 * rozjeżdża się przy pierwszym dopisaniu pozycji, a objawia się to dopiero
 * wtedy, gdy ktoś wybierze nową opcję i dostanie błąd zapisu.
 *
 * Plik jest czysty — bez importów z Payloada i z Next-a — żeby mógł go
 * zaimportować i formularz kliencki, i walidacja odpalana gołym `node --test`.
 */
export const TEMATY = [
  { wartosc: 'kurs-skalkowy', etykieta: 'Kurs wspinaczki skalnej PZA' },
  { wartosc: 'drogi-ubezpieczone', etykieta: 'Drogi ubezpieczone' },
  { wartosc: 'trad', etykieta: 'Asekuracja tradycyjna' },
  { wartosc: 'scianka', etykieta: 'Ścianka wspinaczkowa' },
  { wartosc: 'oboz', etykieta: 'Obóz lub wyjazd' },
  { wartosc: 'indywidualne', etykieta: 'Szkolenie indywidualne' },
  { wartosc: 'inna', etykieta: 'Inna sprawa' },
] as const

export type WartoscTematu = (typeof TEMATY)[number]['wartosc']

export const WARTOSCI_TEMATOW: readonly string[] = TEMATY.map((t) => t.wartosc)

/** Kształt, którego oczekuje pole `select` w konfiguracji kolekcji Payloada. */
export const TEMATY_DLA_PAYLOADA = TEMATY.map((t) => ({ label: t.etykieta, value: t.wartosc }))
