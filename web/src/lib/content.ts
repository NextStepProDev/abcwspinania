import { getPayload } from 'payload'
import config from '@payload-config'

import type { Kursy, Obozy, Terminy, Media, Ustawienia, StronaGlowna } from '@/payload-types'

/**
 * JEDYNE wejście do treści z poziomu strony.
 *
 * Wcześniej (Strapi) leciało stąd prawdziwe zapytanie HTTP do osobnego
 * kontenera. Teraz Payload siedzi w TYM SAMYM procesie, więc sięgamy do bazy
 * bezpośrednio — bez przeskoku sieciowego, bez CORS-u, bez ręcznie
 * przepisywanych typów (`Kursy` pochodzi z payload-types.ts, generowanego
 * z konfiguracji kolekcji).
 *
 * Fallback na puste dane ZOSTAJE, choć zmienił się powód. Wcześniej chronił
 * przed nieosiągalnym Strapim; teraz przed nieosiągalną bazą. Skutek ten sam
 * i tak samo zamierzony: `next build` w CI ma przechodzić bez działającej bazy,
 * a awaria na produkcji ma dawać pustą sekcję zamiast pięćsetki.
 */
async function withPayloadSafe<T>(
  label: string,
  run: (payload: Awaited<ReturnType<typeof getPayload>>) => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    const payload = await getPayload({ config })
    return await run(payload)
  } catch (error) {
    // Świadomie `warn`, nie `error`: brak bazy przy budowaniu to scenariusz
    // PRZEWIDZIANY. Gdyby to logować jako błąd, prawdziwa awaria produkcyjna
    // wyglądałaby w logach identycznie jak zwykły build w CI.
    console.warn(`Treść niedostępna (${label}), renderuję pusto:`, error)
    return fallback
  }
}

export type Kurs = Kursy
export type Oboz = Obozy
export type Termin = Terminy
export type Obrazek = Media

/**
 * Wartości domyślne globala `ustawienia`.
 *
 * Potrzebne, bo `withPayloadSafe()` musi dostać sensowny obiekt zastępczy, gdy
 * bazy nie ma (build w CI). Puste ciągi są tu ZAMIERZONE: komponenty sprawdzają
 * `if (telefon)` i przy pustym nie renderują linku `tel:` zamiast renderować
 * zepsuty. To ta sama zasada, która wcześniej siedziała w `telHref()`.
 */
const USTAWIENIA_PUSTE: Ustawienia = {
  id: 0,
  telefon: null,
  telefonE164: null,
  email: null,
  godziny: null,
  uwagaKontaktowa: null,
  nazwaFirmy: 'ABC Wspinania',
  ulica: null,
  kodPocztowy: null,
  miejscowosc: null,
  mapaEmbed: null,
  licencjaPza: null,
  uprawnieniaPanstwowe: null,
  rokZalozenia: null,
  opisKrotki: null,
  facebook: null,
  youtube: null,
  updatedAt: null,
  createdAt: null,
}

/**
 * Dane kontaktowe i informacje o szkole.
 *
 * Wołane z layoutu, więc leci na KAŻDEJ podstronie. Payload trzyma globale
 * w jednym wierszu i cache'uje je w procesie, więc to nie jest zapytanie
 * na żądanie — ale i tak nie ma sensu wywoływać tego dwa razy w jednym
 * drzewie; komponenty dostają wynik przez właściwości, nie wołają same.
 */
export function getUstawienia(): Promise<Ustawienia> {
  return withPayloadSafe(
    'ustawienia',
    (payload) => payload.findGlobal({ slug: 'ustawienia', depth: 1 }),
    USTAWIENIA_PUSTE,
  )
}

/** Numer w formacie do atrybutu `href`. `null`, gdy nie ma czego linkować. */
export function telHref(u: Pick<Ustawienia, 'telefon' | 'telefonE164'>): string | null {
  const numer = u.telefonE164 || u.telefon
  if (!numer) return null
  const oczyszczony = numer.replace(/[^\d+]/g, '')
  return oczyszczony ? `tel:${oczyszczony}` : null
}

/** Teksty strony startowej. `null`, gdy global nie został jeszcze wypełniony. */
export function getStronaGlowna(): Promise<StronaGlowna | null> {
  return withPayloadSafe(
    'strona-glowna',
    (payload) => payload.findGlobal({ slug: 'strona-glowna', depth: 1 }),
    null,
  )
}

/**
 * Lista kursów do wyświetlenia na stronie.
 *
 * `limit` podajemy jawnie — Payload domyślnie zwraca 10 pozycji, więc bez tego
 * lista ucięłaby się bez błędu i bez śladu w logach. To ta sama pułapka, co
 * `pagination[pageSize]` w Strapim, tylko pod inną nazwą.
 */
export function getCourses(): Promise<Kurs[]> {
  return withPayloadSafe(
    'kursy',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'kursy',
        limit: 100,
        sort: 'order',
        depth: 1, // dociąga powiązany `cover` zamiast samego identyfikatora
      })
      return docs
    },
    [],
  )
}

export function getCourse(slug: string): Promise<Kurs | null> {
  return withPayloadSafe(
    `kurs/${slug}`,
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'kursy',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 1,
      })
      return docs[0] ?? null
    },
    null,
  )
}

/** Zdjęcie z pola `upload` przychodzi jako obiekt albo jako samo id (przy depth: 0). */
export function asImage(value: Kurs['cover']): Obrazek | null {
  return value && typeof value === 'object' ? value : null
}

// --- Obozy i wyjazdy ---------------------------------------------------------

export function getCamps(): Promise<Oboz[]> {
  return withPayloadSafe(
    'obozy',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'obozy',
        limit: 100,
        sort: 'order',
        depth: 1,
      })
      return docs
    },
    [],
  )
}

export function getCamp(slug: string): Promise<Oboz | null> {
  return withPayloadSafe(
    `oboz/${slug}`,
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'obozy',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 1,
      })
      return docs[0] ?? null
    },
    null,
  )
}

// --- Terminy -----------------------------------------------------------------

/**
 * Terminy do pokazania na stronie.
 *
 * Odsiewamy odwołane i zakończone: zostają w panelu (Krzysiek potrzebuje
 * historii), ale nie ma powodu, żeby ktoś trafiał na nie z wyszukiwarki.
 *
 * Odcinamy też wszystko sprzed dzisiaj. Data graniczna to POCZĄTEK dnia,
 * nie „teraz" — inaczej termin zaczynający się dziś rano znikałby ze strony
 * po południu, mimo że wciąż trwa.
 */
function poczatekDzis(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function getUpcomingTerms(limit = 100): Promise<Termin[]> {
  return withPayloadSafe(
    'terminy',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'terminy',
        where: {
          and: [
            { status: { in: ['otwarty', 'brak-miejsc'] } },
            { dataOd: { greater_than_equal: poczatekDzis() } },
          ],
        },
        // Jawny limit — Payload domyślnie zwraca 10, więc bez tego terminarz
        // urwałby się w połowie roku bez błędu i bez śladu w logach (reguła 3).
        limit,
        sort: 'dataOd',
        depth: 1,
      })
      return docs
    },
    [],
  )
}

/** Terminy jednego kursu — do karty wyboru terminu na jego podstronie. */
export function getTermsForCourse(kursId: number): Promise<Termin[]> {
  return withPayloadSafe(
    `terminy/kurs/${kursId}`,
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'terminy',
        where: {
          and: [
            { kurs: { equals: kursId } },
            { status: { in: ['otwarty', 'brak-miejsc'] } },
            { dataOd: { greater_than_equal: poczatekDzis() } },
          ],
        },
        limit: 50,
        sort: 'dataOd',
        depth: 0,
      })
      return docs
    },
    [],
  )
}

/** Terminy jednego obozu. */
export function getTermsForCamp(obozId: number): Promise<Termin[]> {
  return withPayloadSafe(
    `terminy/oboz/${obozId}`,
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'terminy',
        where: {
          and: [
            { oboz: { equals: obozId } },
            { status: { in: ['otwarty', 'brak-miejsc'] } },
            { dataOd: { greater_than_equal: poczatekDzis() } },
          ],
        },
        limit: 50,
        sort: 'dataOd',
        depth: 0,
      })
      return docs
    },
    [],
  )
}

/** Wpis powiązany z terminem przychodzi jako obiekt albo samo id (depth: 0). */
export function asKurs(value: Termin['kurs']): Kurs | null {
  return value && typeof value === 'object' ? value : null
}

export function asOboz(value: Termin['oboz']): Oboz | null {
  return value && typeof value === 'object' ? value : null
}
