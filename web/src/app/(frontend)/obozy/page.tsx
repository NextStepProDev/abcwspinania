import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { getCamps, getCampsPage, getUpcomingSessions, asImage, asCamp } from '@/lib/content'
import { formatPriceLabel, formatAgeRange, pluralPl, focalPosition } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { SessionTable } from '@/components/SessionTable'
import { SELECTABLE_ICONS, type IconName } from '@/components/Icons'
import { Button, Badge, Container, ImagePlaceholder } from '@/components/Ui'
import { MountainBackdrop } from '@/components/MountainBackdrop'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Obozy i wyjazdy',
    description:
      'Obozy wspinaczkowo-przygodowe dla dzieci i młodzieży na Jurze, wycieczki szkolne, wejścia jaskiniowe i cotygodniowe zajęcia. Nocleg i wyżywienie we własnej bazie w Rzędkowicach.',
    path: '/obozy',
  })
}

export default async function CampsPage() {
  const [all, sessions, content] = await Promise.all([
    getCamps(),
    getUpcomingSessions(),
    getCampsPage(),
  ])

  const camps = all.filter((o) => o.kind === 'camp')
  const others = all.filter((o) => o.kind !== 'camp')
  const campSessions = sessions.filter((t) => Boolean(asCamp(t.camp) ?? t.camp))

  // The daily schedule is taken from the first camp that has one — it is shared
  // across all sessions, so repeating it on each would be work for the client
  // with no benefit to the reader.
  const dailySchedule =
    camps.find((o) => o.dailySchedule && o.dailySchedule.length > 0)?.dailySchedule ?? []

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-rock-950">
        <MountainBackdrop variant="short" />
        <div className="absolute inset-0 bg-rock-950/65" />
        <Container className="relative flex flex-col gap-4 py-12 lg:py-16">
          <Breadcrumbs
            variant="onDark"
            trail={[{ label: 'Start', href: '/' }, { label: 'Obozy i wyjazdy' }]}
          />
          <h1 className="max-w-[860px] text-balance text-[34px] leading-[1.03] text-white lg:text-[52px]">
            Obozy i wyjazdy
          </h1>
          {content?.intro && (
            <p className="max-w-[660px] whitespace-pre-line text-[17px] leading-7 text-rock-fg-strong">
              {content.intro}
            </p>
          )}
        </Container>
      </section>

      {camps.length > 0 && (
        <Container className="py-12 lg:py-16">
          <h2 className="mb-8 text-[32px] leading-[1.05] lg:text-[44px]">Obozy</h2>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {camps.map((o) => (
              <li key={o.id} className="flex">
                <CampCard camp={o} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      {dailySchedule.length > 0 && (
        <section className="pb-12 lg:pb-16">
          <Container>
            <div className="rounded-2xl bg-rock-900 p-8 lg:p-14">
              <h2 className="mb-8 text-[28px] leading-[1.05] text-white lg:text-[38px]">
                Jak wygląda dzień na obozie
              </h2>
              <ol className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
                {dailySchedule.map((p, i) => (
                  <li key={p.id ?? i} className="flex flex-col gap-2">
                    <span className="font-display text-[22px] font-extrabold tabular-nums text-rope-light">
                      {p.time}
                    </span>
                    <h3 className="text-[17px] font-semibold text-white">{p.title}</h3>
                    {p.description && (
                      <p className="text-[15px] leading-6 text-rock-fg">{p.description}</p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>
      )}

      {others.length > 0 && (
        <Container className="pb-12 lg:pb-16">
          <h2 className="text-[32px] leading-[1.05] lg:text-[44px]">Poza obozami</h2>
          <p className="mt-3 max-w-[680px] text-[17px] leading-7 text-rock-600">
            Nie wszystko trwa tydzień. Te wyjazdy prowadzimy na zamówienie — dla grup szkolnych,
            firm i rodzin — albo w stałych terminach w sezonie.
          </p>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => (
              <li key={o.id} className="flex">
                <CampCard camp={o} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      <Container className="pb-16 lg:pb-24">
        <h2 className="mb-8 text-[32px] leading-[1.05] lg:text-[44px]">Najbliższe turnusy</h2>
        <SessionTable sessions={campSessions} />
      </Container>

      {all.length === 0 && (
        <Container className="pb-16">
          <p className="text-rock-600">Oferta obozów pojawi się tutaj po dodaniu jej w panelu.</p>
        </Container>
      )}
    </main>
  )
}

function CampCard({ camp }: { camp: Awaited<ReturnType<typeof getCamps>>[number] }) {
  const cover = asImage(camp.cover)
  const medium = cover?.sizes?.medium
  const ageRange = formatAgeRange(camp.ageFrom, camp.ageTo)
  const Icon = SELECTABLE_ICONS[(camp.icon ?? 'mountains') as IconName]

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
      {cover?.url ? (
        <Image
          src={medium?.url ?? cover.url}
          alt={cover.alt ?? ''}
          width={medium?.width ?? cover.width ?? 750}
          height={medium?.height ?? cover.height ?? 500}
          className="h-[170px] w-full border-b border-rock-200 object-cover"
          style={{ objectPosition: focalPosition(cover) }}
        />
      ) : (
        <ImagePlaceholder caption={`Zdjęcie · ${camp.title}`} height="h-[170px]" />
      )}

      <div className="flex grow flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {!cover?.url && <Icon size={20} className="text-rope" />}
          {ageRange && <Badge tone="accent">{ageRange}</Badge>}
          {camp.level === 'advanced' && <Badge>po kursie</Badge>}
        </div>

        <h3 className="text-[19px] font-semibold leading-tight tracking-[-0.01em]">
          <Link href={`/obozy/${camp.slug}`} className="text-rock-900 hover:text-rope">
            {camp.title}
          </Link>
        </h3>

        {camp.summary && <p className="text-[15px] leading-6 text-rock-600">{camp.summary}</p>}

        <ul className="flex flex-col gap-1.5 text-[13px] text-rock-600">
          {camp.duration && <li>{camp.duration}</li>}
          {(camp.accommodation || camp.meals) && (
            <li>
              {[camp.accommodation && 'nocleg', camp.meals && 'wyżywienie']
                .filter(Boolean)
                .join(' i ')}{' '}
              w cenie
            </li>
          )}
          {camp.maxGroupSize && (
            <li>
              groups do {camp.maxGroupSize} {pluralPl(camp.maxGroupSize, 'osoby', 'osób', 'osób')}
            </li>
          )}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-rock-100 pt-4">
          <span className="text-[19px] font-semibold tabular-nums">
            {formatPriceLabel(camp.price, camp.priceFrom)}
            {camp.priceUnit && (
              <span className="ml-1 text-[13px] font-normal text-rock-600">{camp.priceUnit}</span>
            )}
          </span>
          <Button href={`/obozy/${camp.slug}`}>Szczegóły</Button>
        </div>
      </div>
    </article>
  )
}
