/**
 * Treść zgody zapisywanej razem z wiadomością.
 *
 * Jedno źródło: ten sam ciąg trafia pod formularz i do bazy. Gdyby klauzula
 * mieszkała osobno w widoku i osobno w zapisie, po zmianie brzmienia nie dałoby
 * się wykazać, na co dana osoba faktycznie wyraziła zgodę.
 *
 * Wersjonujemy datą: zmieniasz treść — zmień też `ZGODA_WERSJA`, żeby dało się
 * odróżnić klauzule w bazie.
 */
export const ZGODA_WERSJA = '2026-09-19'

export const ZGODA_TRESC =
  'Wyrażam zgodę na przetwarzanie moich danych osobowych (imię, adres e-mail, ' +
  'numer telefonu) w celu udzielenia odpowiedzi na przesłane zapytanie. ' +
  'Administratorem danych jest ABC Wspinania. Podanie danych jest dobrowolne, ' +
  'a zgodę mogę wycofać w każdej chwili.'

/** To, co idzie do bazy: treść wraz z wersją, żeby wpis był samowystarczalny. */
export function zgodaDoZapisu(): string {
  return `[${ZGODA_WERSJA}] ${ZGODA_TRESC}`
}
