import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { getCourses, asImage } from '@/lib/content'
import { formatPrice, formatLevel } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { BRAND, CONTACT, telHref } from '@/lib/site'

// Eksportowane jako generateMetadata, NIE jako `export const metadata` —
// tamta forma wymaga literału i nie przyjmie wywołania funkcji.
export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Szkoła wspinaczki na Jurze',
    description:
      'Kursy wspinaczki skalnej, szkolenia i obozy dla dzieci i dorosłych. Jura Krakowsko-Częstochowska.',
    path: '/',
  })
}

export default async function Home() {
  const kursy = await getCourses()
  const tel = telHref()

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-4">
        {/* Dokładnie jeden <h1> na stronę. Audyt wykazał podstrony starej
            strony całkowicie bez nagłówka H1. */}
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{BRAND}</h1>
        <p className="max-w-[65ch] text-lg text-rock-600">
          Kursy wspinaczki skalnej, szkolenia i obozy na Jurze Krakowsko-Częstochowskiej.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/kontakt"
            className="inline-block rounded-md bg-rope px-5 py-3 font-medium text-white"
          >
            Napisz do nas
          </Link>
          {tel && (
            // Stara strona pisała „Zadzwoń", nie mając ANI JEDNEGO linku tel: —
            // numeru nie dało się stuknąć na telefonie.
            <a
              href={tel}
              className="inline-block rounded-md border border-rock-300 px-5 py-3 font-medium"
            >
              Zadzwoń: {CONTACT.phone}
            </a>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-6" aria-labelledby="kursy">
        <h2 id="kursy" className="text-2xl font-semibold tracking-tight">
          Kursy
        </h2>

        {kursy.length === 0 ? (
          // Stan pusty jest CZĘŚCIĄ PROJEKTU, nie awarią: getCourses() celowo
          // zwraca pustą listę, gdy baza jest nieosiągalna (build w CI) albo gdy
          // w panelu nie ma jeszcze treści.
          <p className="text-rock-600">Oferta kursów pojawi się tutaj po dodaniu jej w panelu.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {kursy.map((kurs) => {
              const poziom = formatLevel(kurs.level)
              const cover = asImage(kurs.cover)
              const medium = cover?.sizes?.medium
              return (
                <li
                  key={kurs.id}
                  className="flex flex-col gap-3 rounded-lg border border-rock-100 bg-white p-5"
                >
                  {cover?.url && (
                    <Image
                      src={medium?.url ?? cover.url}
                      alt={cover.alt ?? ''}
                      width={medium?.width ?? cover.width ?? 750}
                      height={medium?.height ?? cover.height ?? 500}
                      className="h-40 w-full rounded-md object-cover"
                    />
                  )}
                  <h3 className="text-lg font-medium">
                    {/* Cały kafel prowadzi do kursu, ale klikalny jest tytuł —
                        czytnik ekranu ogłasza wtedy sensowną nazwę linku
                        zamiast „link, link, link". */}
                    <Link
                      href={`/kursy/${kurs.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {kurs.title}
                    </Link>
                  </h3>
                  {kurs.summary && <p className="text-sm text-rock-600">{kurs.summary}</p>}
                  <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div className="flex gap-2">
                      <dt className="text-rock-600">Cena</dt>
                      <dd className="font-medium tabular-nums">{formatPrice(kurs.price)}</dd>
                    </div>
                    {kurs.duration && (
                      <div className="flex gap-2">
                        <dt className="text-rock-600">Czas</dt>
                        <dd className="font-medium">{kurs.duration}</dd>
                      </div>
                    )}
                    {poziom && (
                      <div className="flex gap-2">
                        <dt className="text-rock-600">Poziom</dt>
                        <dd className="font-medium">{poziom}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
