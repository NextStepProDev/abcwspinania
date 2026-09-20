import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { getPost, getPosts, asImage } from '@/lib/content'
import { czasCzytania, formatData, formatKategoria, spisTresci } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { jsonLd } from '@/lib/schema'
import { SITE_URL, BRAND } from '@/lib/site'
import { Okruszki } from '@/components/Okruszki'
import { KafelWpisu } from '@/components/KafelWpisu'
import { TrescWpisu } from '@/components/TrescWpisu'
import { Odznaka, Kontener } from '@/components/Ui'
import { TloGorskie } from '@/components/TloGorskie'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const wpisy = await getPosts()
  return wpisy.map((w) => ({ slug: w.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const wpis = await getPost(slug)
  if (!wpis)
    return pageMetadata({
      title: 'Nie znaleziono wpisu',
      description: '',
      path: `/aktualnosci/${slug}`,
    })

  return pageMetadata({
    title: wpis.title,
    description: wpis.lead ?? `${wpis.title} — ${BRAND}.`,
    path: `/aktualnosci/${wpis.slug}`,
  })
}

export default async function StronaWpisu({ params }: Props) {
  const { slug } = await params
  const wpis = await getPost(slug)
  if (!wpis) notFound()

  const wszystkie = await getPosts()
  const kategoria = formatKategoria(wpis.kategoria)
  const spis = spisTresci(wpis.tresc)
  const cover = asImage(wpis.cover)
  const medium = cover?.sizes?.medium

  // „Czytaj dalej": najpierw z tej samej kategorii, potem czymkolwiek — byle
  // sekcja nie była pusta przy małej liczbie wpisów.
  const inne = wszystkie.filter((w) => w.id !== wpis.id)
  const powiazane = [
    ...inne.filter((w) => w.kategoria === wpis.kategoria),
    ...inne.filter((w) => w.kategoria !== wpis.kategoria),
  ].slice(0, 3)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: wpis.title,
    datePublished: wpis.publishedAt,
    dateModified: wpis.updatedAt,
    url: `${SITE_URL}/aktualnosci/${wpis.slug}`,
    ...(wpis.lead ? { description: wpis.lead } : {}),
    ...(wpis.autor ? { author: { '@type': 'Person', name: wpis.autor } } : {}),
    publisher: { '@type': 'Organization', name: BRAND, url: SITE_URL },
  }

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-rock-950">
        <TloGorskie wariant="niski" />
        <div className="absolute inset-0 bg-rock-950/65" />
        <Kontener className="relative flex flex-col gap-4 py-12 lg:py-16">
          <Okruszki
            wariant="naCiemnym"
            sciezka={[
              { etykieta: 'Start', href: '/' },
              { etykieta: 'Aktualności', href: '/aktualnosci' },
              { etykieta: wpis.title },
            ]}
          />
          {kategoria && (
            <span className="self-start">
              <Odznaka ton="ciemna">{kategoria}</Odznaka>
            </span>
          )}
          <h1 className="max-w-[860px] text-balance text-[32px] leading-[1.05] text-white lg:text-[48px]">
            {wpis.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-rock-fg">
            {wpis.autor && (
              <>
                <span className="font-medium text-white">{wpis.autor}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <time dateTime={wpis.publishedAt.slice(0, 10)}>{formatData(wpis.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{czasCzytania(wpis.tresc)} min czytania</span>
          </div>
        </Kontener>
      </section>

      <Kontener className="grid gap-10 py-12 lg:grid-cols-[240px_1fr] lg:gap-16 lg:py-16">
        {/* Spis treści składany z nagłówków w treści — nie ma go w panelu,
            więc nie może się rozjechać z tekstem. */}
        {spis.length > 1 ? (
          <nav aria-label="Spis treści" className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-rock-600">
              W tym tekście
            </h2>
            <ul className="flex flex-col gap-2 border-l border-rock-200 pl-4">
              {spis.map((p) => (
                <li key={p.id}>
                  <a href={`#${p.id}`} className="text-[15px] text-rock-600 hover:text-rope">
                    {p.etykieta}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div aria-hidden="true" className="hidden lg:block" />
        )}

        <article className="max-w-[720px]">
          {cover?.url && (
            <Image
              src={medium?.url ?? cover.url}
              alt={cover.alt ?? ''}
              width={medium?.width ?? cover.width ?? 750}
              height={medium?.height ?? cover.height ?? 500}
              className="mb-8 w-full rounded-xl object-cover"
              priority
            />
          )}

          {wpis.lead && <p className="mb-7 text-[19px] leading-8 text-rock-700">{wpis.lead}</p>}

          {wpis.tresc && <TrescWpisu tresc={wpis.tresc} />}

          {wpis.autor && (
            <div className="mt-10 flex gap-4 rounded-2xl border border-rock-100 bg-white p-6">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rope text-lg font-semibold text-white"
              >
                {wpis.autor.charAt(0)}
              </span>
              <div>
                <h2 className="text-[17px] font-semibold">{wpis.autor}</h2>
                <p className="mt-1 text-[15px] leading-6 text-rock-600">
                  Instruktor wspinaczki skalnej PZA, prowadzi ABC Wspinania.
                </p>
              </div>
            </div>
          )}
        </article>
      </Kontener>

      {powiazane.length > 0 && (
        <Kontener className="pb-16 lg:pb-24">
          <h2 className="mb-8 text-[28px] leading-[1.05] lg:text-[36px]">Czytaj dalej</h2>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {powiazane.map((w) => (
              <li key={w.id} className="flex">
                <KafelWpisu wpis={w} />
              </li>
            ))}
          </ul>
        </Kontener>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </main>
  )
}
