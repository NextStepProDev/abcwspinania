import { getPayload } from 'payload'
import config from '@payload-config'

import type { Kursy, Media } from '@/payload-types'

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
export type Obrazek = Media

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
