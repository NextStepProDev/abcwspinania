/**
 * Walidacja formularza kontaktowego — czyste funkcje, bez importów z Payloada
 * ani z Next-a, żeby dało się je przetestować gołym `node --test`.
 *
 * Te same reguły obowiązują po stronie serwera. Walidacja w przeglądarce to
 * wygoda, nie zabezpieczenie — pola `required` w HTML-u omija każdy, kto wyśle
 * żądanie bez formularza.
 */

export interface DaneKontaktowe {
  imie: string
  email: string
  telefon: string
  tresc: string
  zgoda: boolean
}

export type BledyWalidacji = Partial<Record<keyof DaneKontaktowe, string>>

const LIMITY = {
  imie: 120,
  email: 254, // maksimum długości adresu e-mail wg RFC 5321
  telefon: 30,
  tresc: 4000,
} as const

/**
 * Celowo liberalne. Adresy e-mail są zbyt różnorodne, żeby odsiewać je wyrażeniem
 * regularnym — ostrzejszy wzorzec odrzuca poprawne adresy i traci zapytanie.
 * Jedyne, co naprawdę sprawdzamy, to że jest małpa z czymś po obu stronach
 * i kropka w domenie.
 */
const WZORZEC_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function walidujKontakt(dane: DaneKontaktowe): BledyWalidacji {
  const bledy: BledyWalidacji = {}

  const imie = dane.imie.trim()
  if (!imie) bledy.imie = 'Podaj imię.'
  else if (imie.length > LIMITY.imie) bledy.imie = `Imię może mieć najwyżej ${LIMITY.imie} znaków.`

  const email = dane.email.trim()
  if (!email) bledy.email = 'Podaj adres e-mail.'
  else if (email.length > LIMITY.email) bledy.email = 'Adres e-mail jest za długi.'
  else if (!WZORZEC_EMAIL.test(email)) bledy.email = 'Ten adres e-mail wygląda na niepełny.'

  const telefon = dane.telefon.trim()
  if (telefon.length > LIMITY.telefon) bledy.telefon = 'Numer telefonu jest za długi.'

  const tresc = dane.tresc.trim()
  if (!tresc) bledy.tresc = 'Napisz, w czym możemy pomóc.'
  else if (tresc.length > LIMITY.tresc)
    bledy.tresc = `Wiadomość może mieć najwyżej ${LIMITY.tresc} znaków.`

  if (!dane.zgoda) bledy.zgoda = 'Bez zgody na przetwarzanie danych nie możemy odpisać.'

  return bledy
}

export function jestPoprawny(bledy: BledyWalidacji): boolean {
  return Object.keys(bledy).length === 0
}

/**
 * Pułapka na roboty. Pole jest ukryte przed ludźmi, więc wypełnia je wyłącznie
 * automat wysyłający formularz „w ciemno". Świadomie NIE zwracamy wtedy błędu —
 * udajemy sukces, żeby autor bota nie dowiedział się, co go zdradziło.
 */
export function wygladaNaBota(pulapka: string): boolean {
  return pulapka.trim().length > 0
}
