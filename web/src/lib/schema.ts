import type { Kursy, Ustawienia } from '@/payload-types'
import { BRAND, SITE_URL } from '@/lib/site'

/**
 * Dane strukturalne schema.org.
 *
 * Dla firmy działającej lokalnie to najtańsza rzecz, jaką da się zrobić dla
 * widoczności w wyszukiwarce i w mapach, więc wchodzi od pierwszego dnia.
 *
 * Typ `SportsActivityLocation` jest węższy niż `LocalBusiness` i trafniejszy dla
 * szkoły wspinaczki.
 *
 * Dane bierzemy z globala `ustawienia`, a każde pole doklejamy WARUNKOWO —
 * Google woli brak pola niż pole puste, a global może być jeszcze
 * nieuzupełniony albo baza niedostępna przy budowaniu.
 */
export function organizationSchema(u: Ustawienia) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: BRAND,
    url: SITE_URL,
  }

  if (u.nazwaFirmy) schema.legalName = u.nazwaFirmy

  // Adres doklejamy w CAŁOŚCI albo wcale. Częściowy `PostalAddress` (sama
  // miejscowość, bez ulicy) nie pomaga w mapach, a wygląda w danych jak
  // kompletny — i nikt się nie zorientuje, że czegoś brakuje.
  if (u.ulica && u.kodPocztowy && u.miejscowosc) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: u.ulica,
      postalCode: u.kodPocztowy,
      addressLocality: u.miejscowosc,
      addressCountry: 'PL',
    }
  }

  if (u.telefon) schema.telephone = u.telefonE164 || u.telefon
  if (u.email) schema.email = u.email

  const profile = [u.facebook, u.youtube].filter(Boolean)
  if (profile.length > 0) schema.sameAs = profile

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
