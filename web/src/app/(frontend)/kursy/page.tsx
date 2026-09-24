import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { getCourses, getUpcomingSessions, asImage } from '@/lib/content'
import {
  formatPriceLabel,
  formatLevel,
  formatDateRangeShort,
  pluralPl,
  LEVELS,
  focalPosition,
} from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Filters } from '@/components/Filters'
import { Check, Clock, People, Certificate, Pin } from '@/components/Icons'
import { Button, Badge, Container, ImagePlaceholder } from '@/components/Ui'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Kursy wspinaczki',
    description:
      'Kursy wspinaczki skalnej według programu PZA: pełny kurs skałkowy, drogi ubezpieczone, asekuracja naturalna (trad), ścianka i szkolenia indywidualne.',
    // Canonical WITHOUT the filter parameter — filtered views hold the same
    // content in a different order and have no reason to compete in the index.
    path: '/kursy',
  })
}

const FILTER_OPTIONS = [{ value: 'all', label: 'Wszystkie' }, ...LEVELS]

type Props = { searchParams: Promise<{ level?: string }> }

export default async function CoursesPage({ searchParams }: Props) {
  const { level: selected = 'all' } = await searchParams
  const [all, sessions] = await Promise.all([getCourses(), getUpcomingSessions()])

  const courses = selected === 'all' ? all : all.filter((course) => course.level === selected)

  // The nearest session for each course — sessions arrive already sorted
  // ascending, so the first hit is the right one.
  const nearestSession = new Map<number, string>()
  for (const session of sessions) {
    const id = typeof session.course === 'object' ? session.course?.id : session.course
    if (typeof id === 'number' && !nearestSession.has(id)) {
      nearestSession.set(id, formatDateRangeShort(session.startDate, session.endDate))
    }
  }

  return (
    <main>
      <Container className="pb-8 pt-8">
        <Breadcrumbs trail={[{ label: 'Start', href: '/' }, { label: 'Kursy' }]} />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Kursy wspinaczki
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Od pierwszego dotknięcia skały po samodzielne zakładanie asekuracji. Wszystkie prowadzone
          według programu Polskiego Związku Alpinizmu, w grupach do czterech osób na instruktora.
        </p>
      </Container>

      <Container>
        <Filters
          label="Poziom:"
          options={FILTER_OPTIONS}
          active={selected}
          baseHref="/kursy"
          param="level"
          summary={`${courses.length} ${pluralPl(courses.length, 'kurs', 'kursy', 'kursów')}`}
        />
      </Container>

      <Container className="py-10">
        {courses.length === 0 ? (
          <p className="text-rock-600">
            {all.length === 0
              ? 'Oferta kursów pojawi się tutaj po dodaniu jej w panelu.'
              : 'Na tym poziomie nie mamy teraz kursu. Zobacz pozostałe albo napisz — dobierzemy coś pod Ciebie.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-6">
            {courses.map((course) => {
              const cover = asImage(course.cover)
              const medium = cover?.sizes?.medium
              const levelLabel = formatLevel(course.level)
              const nearest = nearestSession.get(course.id)

              return (
                <li key={course.id}>
                  <article className="grid overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)] lg:min-h-[250px] lg:grid-cols-[280px_1fr_260px]">
                    {cover?.url ? (
                      // Absolutely positioned, so the photo takes no part in
                      // sizing the row: the text and the card's min-height set
                      // it, and a portrait cover gets cropped instead of
                      // stretching the card.
                      <div className="relative h-48 lg:h-auto">
                        <Image
                          src={medium?.url ?? cover.url}
                          alt={cover.alt ?? ''}
                          width={medium?.width ?? cover.width ?? 750}
                          height={medium?.height ?? cover.height ?? 500}
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{ objectPosition: focalPosition(cover) }}
                        />
                      </div>
                    ) : (
                      <ImagePlaceholder caption="Zdjęcie · skała" height="h-48 lg:h-full" />
                    )}

                    <div className="flex flex-col gap-3 p-6 lg:p-7">
                      <div className="flex flex-wrap gap-2">
                        {course.featured && <Badge tone="accent">Najpopularniejszy</Badge>}
                        {levelLabel && <Badge>{levelLabel}</Badge>}
                      </div>
                      <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.01em]">
                        <Link
                          href={`/kursy/${course.slug}`}
                          className="text-rock-900 hover:text-rope"
                        >
                          {course.title}
                        </Link>
                      </h2>
                      {course.summary && (
                        <p className="text-[15px] leading-6 text-rock-600">{course.summary}</p>
                      )}
                      <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-sm text-rock-600">
                        {course.duration && (
                          <li className="flex items-center gap-2">
                            <Clock size={15} className="text-rope" />
                            {course.duration}
                          </li>
                        )}
                        {course.maxGroupSize && (
                          <li className="flex items-center gap-2">
                            <People size={15} className="text-rope" />
                            maks. {course.maxGroupSize}{' '}
                            {pluralPl(course.maxGroupSize, 'osoba', 'osoby', 'osób')}
                          </li>
                        )}
                        {course.certificate && (
                          <li className="flex items-center gap-2">
                            <Certificate size={15} className="text-rope" />
                            {course.certificate}
                          </li>
                        )}
                        {course.location && (
                          <li className="flex items-center gap-2">
                            <Pin size={15} className="text-rope" />
                            {course.location}
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="flex flex-col justify-center gap-2 border-t border-rock-100 p-6 lg:border-l lg:border-t-0 lg:p-7">
                      <span className="text-[22px] font-semibold tabular-nums">
                        {formatPriceLabel(course.price, course.priceFrom)}
                      </span>
                      <span className="text-[13px] text-rock-600">
                        {nearest ? `najbliższy termin: ${nearest}` : 'termin do uzgodnienia'}
                      </span>
                      <div className="mt-2">
                        <Button href={`/kursy/${course.slug}`}>Szczegóły kursu</Button>
                      </div>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </Container>

      {/* --- Combined price list --- */}
      {all.length > 0 && (
        <Container className="pb-16 lg:pb-24">
          <h2 className="text-[32px] leading-[1.05] lg:text-[44px]">Cennik</h2>
          <p className="mt-3 max-w-[680px] text-[17px] leading-7 text-rock-600">
            Podane kwoty to koszt szkolenia. Nie obejmują noclegu, wyżywienia ani dojazdu — ale mamy
            własną bazę w Rzędkowicach, więc nie trzeba szukać kwatery.
          </p>

          <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
            <table className="w-full min-w-[640px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-rock-75 text-left">
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Kurs
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Czas
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Grupa
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Zaświadczenie
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-right text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Cena
                  </th>
                </tr>
              </thead>
              <tbody>
                {all.map((course) => (
                  <tr key={course.id} className="border-b border-rock-100 last:border-0">
                    <td className="px-6 py-4">
                      <Link
                        href={`/kursy/${course.slug}`}
                        className="font-medium text-rock-900 hover:text-rope"
                      >
                        {course.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-rock-600">{course.duration ?? '—'}</td>
                    <td className="px-6 py-4 text-rock-600">
                      {course.maxGroupSize
                        ? `do ${course.maxGroupSize} ${pluralPl(course.maxGroupSize, 'osoby', 'osób', 'osób')}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-rock-600">
                      {course.certificate ? (
                        <span className="flex items-center gap-2">
                          <Check size={15} className="text-rope" />
                          {course.certificate}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums">
                      {formatPriceLabel(course.price, course.priceFrom)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-rock-100 bg-white p-6">
              <h3 className="text-lg font-semibold">W każdej cenie</h3>
              <p className="mt-2 text-[15px] leading-6 text-rock-600">
                Instruktor z licencją PZA, komplet sprzętu technicznego (uprząż, kask, lina,
                przyrządy), materiały szkoleniowe i zaświadczenie po zaliczeniu.
              </p>
            </div>
            <div className="rounded-xl border border-rock-100 bg-white p-6">
              <h3 className="text-lg font-semibold">Poza ceną</h3>
              <p className="mt-2 text-[15px] leading-6 text-rock-600">
                Nocleg i wyżywienie — w naszej bazie w Rzędkowicach pokoje z łazienkami i wspólna
                kuchnia. Dojazd na miejsce i odzież własna.
              </p>
            </div>
          </div>
        </Container>
      )}
    </main>
  )
}
