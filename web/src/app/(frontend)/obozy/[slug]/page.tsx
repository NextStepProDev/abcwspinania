import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'

import { getCamp, getCamps, getSessionsForCamp, getSiteConfig, telHref } from '@/lib/content'
import {
  formatPriceLabel,
  formatAgeRange,
  formatDateRange,
  formatSpotsLeft,
  pluralPl,
} from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Check } from '@/components/Icons'
import { Button, Badge, Container } from '@/components/Ui'
import { MountainBackdrop } from '@/components/MountainBackdrop'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const camps = await getCamps()
  return camps.map((o) => ({ slug: o.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const camp = await getCamp(slug)
  if (!camp)
    return pageMetadata({ title: 'Nie znaleziono', description: '', path: `/obozy/${slug}` })

  return pageMetadata({
    title: camp.title,
    description: camp.summary ?? `${camp.title} — ABC Wspinania.`,
    path: `/obozy/${camp.slug}`,
  })
}

export default async function CampPage({ params }: Props) {
  const { slug } = await params
  const camp = await getCamp(slug)
  if (!camp) notFound()

  const [sessions, siteConfig] = await Promise.all([getSessionsForCamp(camp.id), getSiteConfig()])
  const tel = telHref(siteConfig)
  const ageRange = formatAgeRange(camp.ageFrom, camp.ageTo)

  const facts = [
    camp.duration && { label: 'Czas trwania', value: camp.duration },
    ageRange && { label: 'Wiek', value: ageRange },
    camp.maxGroupSize && {
      label: 'Grupa',
      value: `do ${camp.maxGroupSize} ${pluralPl(camp.maxGroupSize, 'osoby', 'osób', 'osób')}`,
    },
    camp.location && { label: 'Miejsce', value: camp.location },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-rock-950">
        <MountainBackdrop variant="short" />
        <div className="absolute inset-0 bg-rock-950/65" />
        <Container className="relative flex flex-col gap-4 py-12 lg:py-16">
          <Breadcrumbs
            variant="onDark"
            trail={[
              { label: 'Start', href: '/' },
              { label: 'Obozy i wyjazdy', href: '/obozy' },
              { label: camp.title },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {ageRange && <Badge tone="dark">{ageRange}</Badge>}
            {camp.level === 'advanced' && <Badge tone="onDark">po kursie</Badge>}
          </div>
          <h1 className="max-w-[860px] text-balance text-[34px] leading-[1.03] text-white lg:text-[52px]">
            {camp.title}
          </h1>
          {camp.summary && (
            <p className="max-w-[640px] text-[17px] leading-7 text-rock-fg-strong">
              {camp.summary}
            </p>
          )}
        </Container>
      </section>

      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_360px] lg:gap-14 lg:py-16">
        <div className="flex flex-col gap-12">
          {facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-5 rounded-xl border border-rock-100 bg-white p-6 lg:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-600">
                    {f.label}
                  </dt>
                  <dd className="mt-1.5 font-semibold">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {camp.description && (
            <section className="rich-text">
              <RichText data={camp.description} />
            </section>
          )}

          {camp.highlights && camp.highlights.length > 0 && (
            <section>
              <h2 className="mb-4 text-[28px] leading-tight lg:text-[32px]">Co w programie</h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {camp.highlights.map((a, i) => (
                  <li key={a.id ?? i} className="flex gap-2.5 text-[15px] leading-6">
                    <Check size={17} className="mt-0.5 shrink-0 text-rope" />
                    {a.item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {camp.dailySchedule && camp.dailySchedule.length > 0 && (
            <section>
              <h2 className="mb-5 text-[28px] leading-tight lg:text-[32px]">Jak wygląda dzień</h2>
              <ol className="flex flex-col gap-4">
                {camp.dailySchedule.map((p, i) => (
                  <li
                    key={p.id ?? i}
                    className="flex flex-col gap-3 rounded-xl border border-rock-100 bg-white p-5 sm:flex-row sm:gap-6"
                  >
                    <span className="shrink-0 self-start rounded-md bg-rock-75 px-3 py-1.5 text-[13px] font-semibold tabular-nums text-rock-600">
                      {p.time}
                    </span>
                    <div>
                      <h3 className="text-[17px] font-semibold">{p.title}</h3>
                      {p.description && (
                        <p className="mt-1.5 text-[15px] leading-6 text-rock-600">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-5 rounded-2xl border border-rock-100 bg-white p-6 shadow-[0_4px_16px_rgba(42,38,32,0.08)]">
            <div>
              <div className="text-[13px] uppercase tracking-[0.04em] text-rock-600">Cena</div>
              <div className="mt-1 text-[30px] font-semibold tabular-nums">
                {formatPriceLabel(camp.price, camp.priceFrom)}
                {camp.priceUnit && (
                  <span className="ml-1 text-[15px] font-normal text-rock-600">
                    {camp.priceUnit}
                  </span>
                )}
              </div>
              {(camp.accommodation || camp.meals) && (
                <div className="mt-1 text-[13px] text-rock-600">
                  {[camp.accommodation && 'nocleg', camp.meals && 'wyżywienie']
                    .filter(Boolean)
                    .join(' i ')}{' '}
                  w cenie
                </div>
              )}
            </div>

            {sessions.length > 0 && (
              <div>
                <h2 className="mb-3 text-[15px] font-semibold">Turnusy</h2>
                <ul className="flex flex-col gap-2">
                  {sessions.map((t) => {
                    const soldOut = t.status === 'waitlist' || (t.spotsLeft ?? 1) <= 0
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-rock-100 px-3.5 py-2.5"
                      >
                        <span className="text-sm font-medium tabular-nums">
                          {formatDateRange(t.startDate, t.endDate)}
                        </span>
                        <span
                          className={`shrink-0 text-[13px] ${soldOut ? 'text-rock-400' : 'text-available-text'}`}
                        >
                          {soldOut ? 'brak miejsc' : formatSpotsLeft(t.spotsLeft)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <Button href={`/kontakt?camp=${camp.slug}`} className="w-full">
                Zapytaj o miejsce
              </Button>
              {tel && (
                <Button href={tel} variant="outline" className="w-full">
                  {siteConfig.phone}
                </Button>
              )}
            </div>
          </div>
        </aside>
      </Container>
    </main>
  )
}
