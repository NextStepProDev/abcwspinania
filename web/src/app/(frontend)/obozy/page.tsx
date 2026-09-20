import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { getCamps, getUpcomingTerms, asImage, asOboz } from '@/lib/content'
import { formatCena, formatWiek, odmien } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Okruszki } from '@/components/Okruszki'
import { TabelaTerminow } from '@/components/Terminy'
import { IKONY_WYBIERALNE, type NazwaIkony } from '@/components/Ikony'
import { Przycisk, Odznaka, Kontener, MiejsceNaZdjecie } from '@/components/Ui'
import { TloGorskie } from '@/components/TloGorskie'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Obozy i wyjazdy',
    description:
      'Obozy wspinaczkowo-przygodowe dla dzieci i młodzieży na Jurze, wycieczki szkolne, wejścia jaskiniowe i cotygodniowe zajęcia. Nocleg i wyżywienie we własnej bazie w Rzędkowicach.',
    path: '/obozy',
  })
}

export default async function StronaObozow() {
  const [wszystkie, terminy] = await Promise.all([getCamps(), getUpcomingTerms()])

  const obozy = wszystkie.filter((o) => o.typ === 'oboz')
  const pozostale = wszystkie.filter((o) => o.typ !== 'oboz')
  const terminyObozow = terminy.filter((t) => Boolean(asOboz(t.oboz) ?? t.oboz))

  // Plan dnia bierzemy z pierwszego obozu, który go ma — jest wspólny dla
  // wszystkich turnusów, więc powtarzanie go przy każdym byłoby pracą dla
  // Krzyśka bez pożytku dla czytającego.
  const planDnia = obozy.find((o) => o.planDnia && o.planDnia.length > 0)?.planDnia ?? []

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-rock-950">
        <TloGorskie wariant="niski" />
        <div className="absolute inset-0 bg-rock-950/65" />
        <Kontener className="relative flex flex-col gap-4 py-12 lg:py-16">
          <Okruszki
            wariant="naCiemnym"
            sciezka={[{ etykieta: 'Start', href: '/' }, { etykieta: 'Obozy i wyjazdy' }]}
          />
          <h1 className="max-w-[860px] text-balance text-[34px] leading-[1.03] text-white lg:text-[52px]">
            Obozy i wyjazdy
          </h1>
          <p className="max-w-[660px] text-[17px] leading-7 text-rock-fg-strong">
            Obozy wspinaczkowo-przygodowe dla dzieci i młodzieży, wycieczki po Jurze, wejścia
            jaskiniowe i cotygodniowe zajęcia. Nocleg i wyżywienie we własnej bazie.
          </p>
        </Kontener>
      </section>

      {obozy.length > 0 && (
        <Kontener className="py-12 lg:py-16">
          <h2 className="mb-8 text-[32px] leading-[1.05] lg:text-[44px]">Obozy</h2>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {obozy.map((o) => (
              <li key={o.id} className="flex">
                <KafelObozu oboz={o} />
              </li>
            ))}
          </ul>
        </Kontener>
      )}

      {planDnia.length > 0 && (
        <section className="pb-12 lg:pb-16">
          <Kontener>
            <div className="rounded-2xl bg-rock-900 p-8 lg:p-14">
              <h2 className="mb-8 text-[28px] leading-[1.05] text-white lg:text-[38px]">
                Jak wygląda dzień na obozie
              </h2>
              <ol className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
                {planDnia.map((p, i) => (
                  <li key={p.id ?? i} className="flex flex-col gap-2">
                    <span className="font-display text-[22px] font-extrabold tabular-nums text-rope-light">
                      {p.godzina}
                    </span>
                    <h3 className="text-[17px] font-semibold text-white">{p.tytul}</h3>
                    {p.opis && <p className="text-[15px] leading-6 text-rock-fg">{p.opis}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </Kontener>
        </section>
      )}

      {pozostale.length > 0 && (
        <Kontener className="pb-12 lg:pb-16">
          <h2 className="text-[32px] leading-[1.05] lg:text-[44px]">Poza obozami</h2>
          <p className="mt-3 max-w-[680px] text-[17px] leading-7 text-rock-600">
            Nie wszystko trwa tydzień. Te wyjazdy prowadzimy na zamówienie — dla grup szkolnych,
            firm i rodzin — albo w stałych terminach w sezonie.
          </p>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pozostale.map((o) => (
              <li key={o.id} className="flex">
                <KafelObozu oboz={o} />
              </li>
            ))}
          </ul>
        </Kontener>
      )}

      <Kontener className="pb-16 lg:pb-24">
        <h2 className="mb-8 text-[32px] leading-[1.05] lg:text-[44px]">Najbliższe turnusy</h2>
        <TabelaTerminow terminy={terminyObozow} />
      </Kontener>

      {wszystkie.length === 0 && (
        <Kontener className="pb-16">
          <p className="text-rock-600">Oferta obozów pojawi się tutaj po dodaniu jej w panelu.</p>
        </Kontener>
      )}
    </main>
  )
}

function KafelObozu({ oboz }: { oboz: Awaited<ReturnType<typeof getCamps>>[number] }) {
  const cover = asImage(oboz.cover)
  const medium = cover?.sizes?.medium
  const wiek = formatWiek(oboz.wiekOd, oboz.wiekDo)
  const Ikona = IKONY_WYBIERALNE[(oboz.ikona ?? 'gory') as NazwaIkony]

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
      {cover?.url ? (
        <Image
          src={medium?.url ?? cover.url}
          alt={cover.alt ?? ''}
          width={medium?.width ?? cover.width ?? 750}
          height={medium?.height ?? cover.height ?? 500}
          className="h-[170px] w-full border-b border-rock-200 object-cover"
        />
      ) : (
        <MiejsceNaZdjecie opis={`Zdjęcie · ${oboz.title}`} wysokosc="h-[170px]" />
      )}

      <div className="flex grow flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {!cover?.url && <Ikona rozmiar={20} className="text-rope" />}
          {wiek && <Odznaka ton="akcent">{wiek}</Odznaka>}
          {oboz.poziom === 'zaawansowany' && <Odznaka>po kursie</Odznaka>}
        </div>

        <h3 className="text-[19px] font-semibold leading-tight tracking-[-0.01em]">
          <Link href={`/obozy/${oboz.slug}`} className="text-rock-900 hover:text-rope">
            {oboz.title}
          </Link>
        </h3>

        {oboz.summary && <p className="text-[15px] leading-6 text-rock-600">{oboz.summary}</p>}

        <ul className="flex flex-col gap-1.5 text-[13px] text-rock-600">
          {oboz.czas && <li>{oboz.czas}</li>}
          {(oboz.nocleg || oboz.wyzywienie) && (
            <li>
              {[oboz.nocleg && 'nocleg', oboz.wyzywienie && 'wyżywienie']
                .filter(Boolean)
                .join(' i ')}{' '}
              w cenie
            </li>
          )}
          {oboz.grupaMax && (
            <li>
              grupy do {oboz.grupaMax} {odmien(oboz.grupaMax, 'osoby', 'osób', 'osób')}
            </li>
          )}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-rock-100 pt-4">
          <span className="text-[19px] font-semibold tabular-nums">
            {formatCena(oboz.cena, oboz.cenaOd)}
            {oboz.jednostkaCeny && (
              <span className="ml-1 text-[13px] font-normal text-rock-600">
                {oboz.jednostkaCeny}
              </span>
            )}
          </span>
          <Przycisk href={`/obozy/${oboz.slug}`}>Szczegóły</Przycisk>
        </div>
      </div>
    </article>
  )
}
