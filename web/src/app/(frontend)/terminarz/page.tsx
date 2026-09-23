import type { Metadata } from 'next'
import Link from 'next/link'

import { getUpcomingSessions, getSiteConfig, telHref } from '@/lib/content'
import { formatPriceLabel, formatDateRangeShort, groupByMonth, pluralPl } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Filters } from '@/components/Filters'
import { sessionDetails, SpotsBadge } from '@/components/SessionTable'
import { Button, Container } from '@/components/Ui'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Terminarz',
    description:
      'Wszystkie terminy kursów wspinaczkowych i obozów w jednym miejscu. Liczba wolnych miejsc aktualizowana po każdym zapisie.',
    path: '/terminarz',
  })
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystko' },
  { value: 'courses', label: 'Kursy' },
  { value: 'camps', label: 'Obozy' },
  { value: 'available', label: 'Tylko z wolnymi miejscami' },
]

type Props = { searchParams: Promise<{ show?: string }> }

export default async function SchedulePage({ searchParams }: Props) {
  const { show = 'all' } = await searchParams
  const [all, siteConfig] = await Promise.all([getUpcomingSessions(200), getSiteConfig()])
  const tel = telHref(siteConfig)

  const sessions = all.filter((session) => {
    if (show === 'courses') return Boolean(session.course)
    if (show === 'camps') return Boolean(session.camp)
    if (show === 'available') return !sessionDetails(session).soldOut
    return true
  })

  const months = groupByMonth(sessions)

  return (
    <main>
      <Container className="pb-8 pt-8">
        <Breadcrumbs trail={[{ label: 'Start', href: '/' }, { label: 'Terminarz' }]} />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Terminarz
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Wszystkie kursy i obozy w jednym miejscu. Liczbę miejsc aktualizujemy po każdym zapisie —
          jeśli nie widzisz pasującego terminu, napisz, przy grupie od trzech osób ustalamy termin
          indywidualnie.
        </p>
      </Container>

      <Container>
        <Filters
          label="Pokaż:"
          options={FILTER_OPTIONS}
          active={show}
          baseHref="/terminarz"
          param="pokaz"
          summary={`${sessions.length} ${pluralPl(sessions.length, 'termin', 'terminy', 'terminów')}`}
        />
      </Container>

      <Container className="py-10">
        {months.length === 0 ? (
          <p className="rounded-xl border border-rock-100 bg-white p-6 text-rock-600">
            {all.length === 0
              ? 'Terminy pojawią się tutaj po dodaniu ich w panelu.'
              : 'Dla tego filtra nie ma terminów. Zobacz wszystkie albo napisz do nas.'}
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {months.map((month) => (
              <section key={month.key} aria-labelledby={`m-${month.key}`}>
                <h2
                  id={`m-${month.key}`}
                  className="mb-4 flex items-center gap-4 text-[22px] lg:text-[26px]"
                >
                  {month.name}
                  <span aria-hidden="true" className="h-px grow bg-rock-200" />
                </h2>

                <ul className="overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
                  {month.items.map((session) => {
                    const details = sessionDetails(session)
                    return (
                      <li
                        key={session.id}
                        className="grid gap-3 border-b border-rock-100 p-5 last:border-0 lg:grid-cols-[172px_1fr_140px_132px_210px] lg:items-center lg:gap-5 lg:px-6"
                      >
                        <span className="font-semibold tabular-nums lg:text-[15px]">
                          {formatDateRangeShort(session.startDate, session.endDate)}
                        </span>

                        <span>
                          {details.href ? (
                            <Link
                              href={details.href}
                              className="font-medium text-rock-900 hover:text-rope"
                            >
                              {details.name}
                            </Link>
                          ) : (
                            <span className="font-medium">{details.name}</span>
                          )}
                          {session.note && (
                            <span className="ml-2 text-[13px] text-rock-600">{session.note}</span>
                          )}
                        </span>

                        <span className="text-[14px] text-rock-600">{details.location ?? '—'}</span>

                        <span>
                          <SpotsBadge session={session} />
                        </span>

                        <span className="flex items-center justify-between gap-3 lg:justify-end">
                          <span className="font-semibold tabular-nums">
                            {formatPriceLabel(details.price, details.priceFrom)}
                          </span>
                          <Button
                            href={`/kontakt?termin=${session.id}`}
                            variant={details.soldOut ? 'outline' : 'primary'}
                          >
                            {details.soldOut ? 'Lista rezerwowa' : 'Zapisz się'}
                          </Button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Container>

      <Container className="pb-16 lg:pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-rock-200 bg-white p-8 lg:flex-row lg:items-center lg:p-10">
          <div className="max-w-[640px]">
            <h2 className="text-[24px] leading-tight lg:text-[28px]">Nie pasuje żaden termin?</h2>
            <p className="mt-2 text-[16px] leading-7 text-rock-600">
              Przy grupie od trzech osób ustalamy termin indywidualnie, także w tygodniu. Poza
              sezonem (marzec, kwiecień, październik) terminy i tak uzgadniamy osobno.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/kontakt" large>
              Zaproponuj termin
            </Button>
            {tel && (
              <Button href={tel} variant="outline" large>
                {siteConfig.phone}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </main>
  )
}
