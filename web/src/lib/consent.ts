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

/**
 * Zgoda marketingowa na newsletter.
 *
 * OSOBNA od zgody przy formularzu kontaktowym i z własną wersją. To inna
 * podstawa przetwarzania: odpowiedź na zapytanie a wysyłka handlowa. Wspólna
 * klauzula oznaczałaby, że każdy, kto o cokolwiek zapytał, dostaje newsletter —
 * czego nikomu nie obiecywał.
 *
 * Wersjonujemy datą, tak samo jak wyżej: zmieniasz treść — zmień też wersję.
 */
export const ZGODA_NEWSLETTER_WERSJA = '2026-09-20'

export const ZGODA_NEWSLETTER_TRESC =
  'Wyrażam zgodę na otrzymywanie na podany adres e-mail informacji o terminach ' +
  'kursów i obozów oraz nowych tekstach publikowanych przez ABC Wspinania. ' +
  'Administratorem danych jest ABC Wspinania. Zgodę mogę wycofać w każdej chwili, ' +
  'a jej wycofanie nie wpływa na zgodność z prawem wysyłek dokonanych wcześniej.'

export function zgodaNewsletteraDoZapisu(): string {
  return `[${ZGODA_NEWSLETTER_WERSJA}] ${ZGODA_NEWSLETTER_TRESC}`
}
