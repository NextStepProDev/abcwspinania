import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'

import { getCourse, getCourses, asImage } from '@/lib/content'
import { formatPrice, formatLevel } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { jsonLd, courseSchema } from '@/lib/schema'

type Props = { params: Promise<{ slug: string }> }

/**
 * Lista adresów do wygenerowania przy buildzie. Gdy baza jest nieosiągalna
 * (CI), `getCourses()` zwraca pustą listę i Next wyrenderuje te strony
 * na żądanie — build i tak przechodzi.
 */
export async function generateStaticParams() {
  const kursy = await getCourses()
  return kursy.map((kurs) => ({ slug: kurs.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const kurs = await getCourse(slug)
  if (!kurs)
    return pageMetadata({ title: 'Nie znaleziono kursu', description: '', path: `/kursy/${slug}` })

  return pageMetadata({
    title: kurs.title,
    description: kurs.summary ?? `Kurs wspinaczkowy: ${kurs.title}.`,
    path: `/kursy/${kurs.slug}`,
  })
}

export default async function StronaKursu({ params }: Props) {
  const { slug } = await params
  const kurs = await getCourse(slug)
  // 404 zamiast pustej strony — inaczej Google zaindeksowałby adres bez treści.
  if (!kurs) notFound()

  const cover = asImage(kurs.cover)
  const medium = cover?.sizes?.medium
  const poziom = formatLevel(kurs.level)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <nav aria-label="Ścieżka nawigacji">
        <Link href="/" className="text-sm text-rock-600 underline underline-offset-4">
          ← Wszystkie kursy
        </Link>
      </nav>

      <header className="flex flex-col gap-4">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">{kurs.title}</h1>
        {kurs.summary && <p className="text-lg text-rock-600">{kurs.summary}</p>}
      </header>

      {cover?.url && (
        <Image
          src={medium?.url ?? cover.url}
          alt={cover.alt ?? ''}
          width={medium?.width ?? cover.width ?? 750}
          height={medium?.height ?? cover.height ?? 500}
          className="w-full rounded-lg object-cover"
          priority
        />
      )}

      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-lg border border-rock-100 bg-white p-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-rock-600">Cena</dt>
          <dd className="mt-1 font-medium tabular-nums">{formatPrice(kurs.price)}</dd>
        </div>
        {kurs.duration && (
          <div>
            <dt className="text-sm text-rock-600">Czas trwania</dt>
            <dd className="mt-1 font-medium">{kurs.duration}</dd>
          </div>
        )}
        {poziom && (
          <div>
            <dt className="text-sm text-rock-600">Poziom</dt>
            <dd className="mt-1 font-medium">{poziom}</dd>
          </div>
        )}
      </dl>

      {kurs.description && (
        <div className="tresc-bogata">
          <RichText data={kurs.description} />
        </div>
      )}

      <p>
        <Link
          href="/kontakt"
          className="inline-block rounded-md bg-rope px-6 py-3 font-medium text-white"
        >
          Zapytaj o ten kurs
        </Link>
      </p>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(courseSchema(kurs)) }}
      />
    </main>
  )
}
