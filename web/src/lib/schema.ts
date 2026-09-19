import type { Kursy } from '@/payload-types'
import { BRAND, CONTACT, SITE_URL } from '@/lib/site'

/**
 * Dane strukturalne schema.org.
 *
 * Audyt starego serwisu wykazał ZERO znaczników ld+json — mimo pełnego adresu
 * pocztowego na stronie kontaktu, cennika i opinii. Dla firmy działającej
 * lokalnie to najtańsza rzecz, jaką da się zrobić dla widoczności w wyszukiwarce
 * i mapach, więc wchodzi od pierwszego dnia.
 *
 * Typ `SportsActivityLocation` jest węższy niż `LocalBusiness` i trafniejszy dla
 * szkoły wspinaczki. Pola kontaktowe doklejane warunkowo — Google woli brak pola
 * niż pole puste, a telefonu i adresu e-mail jeszcze nie potwierdziliśmy.
 */
export function organizationSchema() {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: BRAND,
    legalName: CONTACT.legalName,
    url: SITE_URL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.street,
      postalCode: CONTACT.postalCode,
      addressLocality: CONTACT.locality,
      addressCountry: CONTACT.country,
    },
  }

  if (CONTACT.phone) schema.telephone = CONTACT.phone
  if (CONTACT.email) schema.email = CONTACT.email

  return schema
}

/**
 * Serializacja do wstawienia w `<script type="application/ld+json">`.
 * `</` rozbite na wypadek, gdyby treść z CMS-a zawierała `</script>` — inaczej
 * przeglądarka zamknęłaby znacznik w środku danych.
 */
export function jsonLd(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

/**
 * Schemat pojedynczego kursu.
 *
 * `Course` z schema.org wymaga `provider`, inaczej Google traktuje wpis jako
 * niekompletny i pomija go w wynikach rozszerzonych. Cenę doklejamy tylko wtedy,
 * gdy jest w CMS-ie — kurs bez ceny to „wycena indywidualna", a nie darmowy,
 * i podanie tam zera byłoby wprowadzaniem w błąd.
 */
export function courseSchema(kurs: Kursy) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: kurs.title,
    url: `${SITE_URL}/kursy/${kurs.slug}`,
    provider: {
      '@type': 'Organization',
      name: BRAND,
      url: SITE_URL,
    },
  }

  if (kurs.summary) schema.description = kurs.summary

  if (typeof kurs.price === 'number') {
    schema.offers = {
      '@type': 'Offer',
      price: kurs.price,
      priceCurrency: 'PLN',
      url: `${SITE_URL}/kursy/${kurs.slug}`,
    }
  }

  return schema
}
