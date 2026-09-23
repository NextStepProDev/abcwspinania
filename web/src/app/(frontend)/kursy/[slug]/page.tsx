import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'

import { getCourse, getCourses, getSessionsForCourse, getSiteConfig, telHref } from '@/lib/content'
import {
  formatPriceLabel,
  formatLevel,
  formatDateRange,
  formatSpotsLeft,
  pluralPl,
} from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { jsonLd, courseSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Check, Close } from '@/components/Icons'
import { Button, Badge, Container } from '@/components/Ui'
import { MountainBackdrop } from '@/components/MountainBackdrop'

type Props = { params: Promise<{ slug: string }> }

/**
 * The list of addresses to generate at build time. When the database is
 * unreachable (CI), `getCourses()` returns an empty list and Next renders these
 * pages on demand — the build passes either way.
 */
export async function generateStaticParams() {
  const courses = await getCourses()
  return courses.map((course) => ({ slug: course.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course)
    return pageMetadata({ title: 'Nie znaleziono kursu', description: '', path: `/kursy/${slug}` })

  return pageMetadata({
    title: course.title,
    description: course.summary ?? `Kurs wspinaczkowy: ${course.title}.`,
    path: `/kursy/${course.slug}`,
  })
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params
  const course = await getCourse(slug)
  // A 404 rather than an empty page — otherwise Google would index an address
  // with no content.
  if (!course) notFound()

  const [sessions, siteConfig] = await Promise.all([
    getSessionsForCourse(course.id),
    getSiteConfig(),
  ])
  const tel = telHref(siteConfig)
  const level = formatLevel(course.level)

  const facts = [
    course.duration && { label: 'Czas trwania', value: course.duration },
    course.maxGroupSize && {
      label: 'Grupa',
      value: `maks. ${course.maxGroupSize} ${pluralPl(course.maxGroupSize, 'osoba', 'osoby', 'osób')}`,
    },
    level && { label: 'Poziom', value: level },
    course.location && { label: 'Miejsce', value: course.location },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <main>
      {/* --- Nagłówek --- */}
      <section className="relative isolate overflow-hidden bg-rock-950">
        <MountainBackdrop variant="short" />
        <div className="absolute inset-0 bg-rock-950/65" />
        <Container className="relative flex flex-col gap-4 py-12 lg:py-16">
          <Breadcrumbs
            variant="onDark"
            trail={[
              { label: 'Start', href: '/' },
              { label: 'Kursy', href: '/kursy' },
              { label: course.title },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {course.featured && <Badge tone="dark">Najpopularniejszy</Badge>}
            {level && <Badge tone="onDark">{level}</Badge>}
          </div>
          <h1 className="max-w-[860px] text-balance text-[34px] leading-[1.03] text-white lg:text-[52px]">
            {course.title}
          </h1>
          {course.summary && (
            <p className="max-w-[640px] text-[17px] leading-7 text-rock-fg-strong">
              {course.summary}
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

          {course.audience && (
            <section>
              <h2 className="mb-4 text-[28px] leading-tight lg:text-[32px]">Dla kogo</h2>
              <div className="rich-text">
                <RichText data={course.audience} />
              </div>
            </section>
          )}

          {course.program && course.program.length > 0 && (
            <section>
              <h2 className="mb-5 text-[28px] leading-tight lg:text-[32px]">Program</h2>
              <ol className="flex flex-col gap-4">
                {course.program.map((day, i) => (
                  <li
                    key={day.id ?? i}
                    className="flex flex-col gap-3 rounded-xl border border-rock-100 bg-white p-5 sm:flex-row sm:gap-6"
                  >
                    <span className="shrink-0 self-start rounded-md bg-rock-75 px-3 py-1.5 text-[13px] font-semibold text-rock-600">
                      {day.caption || `Dzień ${i + 1}`}
                    </span>
                    <div>
                      <h3 className="text-[17px] font-semibold">{day.title}</h3>
                      {day.description && (
                        <p className="mt-1.5 text-[15px] leading-6 text-rock-600">
                          {day.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {((course.included && course.included.length > 0) ||
            (course.excluded && course.excluded.length > 0)) && (
            <section className="grid gap-5 md:grid-cols-2">
              {course.included && course.included.length > 0 && (
                <div className="rounded-xl border border-rock-100 bg-white p-6">
                  <h2 className="text-lg font-semibold">W cenie</h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {course.included.map((p, i) => (
                      <li key={p.id ?? i} className="flex gap-2.5 text-[15px] leading-6">
                        <Check size={17} className="mt-0.5 shrink-0 text-rope" />
                        {p.item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {course.excluded && course.excluded.length > 0 && (
                <div className="rounded-xl border border-rock-100 bg-white p-6">
                  <h2 className="text-lg font-semibold">Poza ceną</h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {course.excluded.map((p, i) => (
                      <li
                        key={p.id ?? i}
                        className="flex gap-2.5 text-[15px] leading-6 text-rock-600"
                      >
                        <Close size={17} className="mt-0.5 shrink-0 text-rock-400" />
                        {p.item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {course.variants && course.variants.length > 0 && (
            <section>
              <h2 className="mb-5 text-[28px] leading-tight lg:text-[32px]">Warianty</h2>
              <ul className="flex flex-col gap-3">
                {course.variants.map((variant, i) => (
                  <li
                    key={variant.id ?? i}
                    className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl border border-rock-100 bg-white px-5 py-4"
                  >
                    <div>
                      <span className="font-medium">{variant.name}</span>
                      {variant.note && (
                        <span className="ml-2 text-[14px] text-rock-600">{variant.note}</span>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatPriceLabel(variant.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.faq && course.faq.length > 0 && (
            <section>
              <h2 className="mb-5 text-[28px] leading-tight lg:text-[32px]">Częste pytania</h2>
              {/* <details> z treścią OBECNĄ w HTML-u. Googlebot nie klika
                  w rozwijane sekcje, więc odpowiedzi muszą być w źródle strony
                  niezależnie od tego, czy ktoś je rozwinął (reguła 9). */}
              <div className="flex flex-col gap-3">
                {course.faq.map((q, i) => (
                  <details
                    key={q.id ?? i}
                    open={i === 0}
                    className="group rounded-xl border border-rock-100 bg-white px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                      {q.question}
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-xl text-rope transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-6 text-rock-600">{q.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {course.description && (
            <section className="rich-text">
              <RichText data={course.description} />
            </section>
          )}
        </div>

        {/* --- Karta zapisu --- */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-5 rounded-2xl border border-rock-100 bg-white p-6 shadow-[0_4px_16px_rgba(42,38,32,0.08)]">
            <div>
              <div className="text-[13px] uppercase tracking-[0.04em] text-rock-600">
                Cena kursu
              </div>
              <div className="mt-1 text-[30px] font-semibold tabular-nums">
                {formatPriceLabel(course.price, course.priceFrom)}
              </div>
              <div className="mt-1 text-[13px] text-rock-600">za osobę, sprzęt w cenie</div>
            </div>

            {sessions.length > 0 && (
              <div>
                <h2 className="mb-3 text-[15px] font-semibold">Najbliższe terminy</h2>
                <ul className="flex flex-col gap-2">
                  {sessions.slice(0, 4).map((t) => {
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
              <Button href={`/kontakt?course=${course.slug}`} className="w-full">
                Zapisz się na kurs
              </Button>
              {tel && (
                <Button href={tel} variant="outline" className="w-full">
                  Zapytaj: {siteConfig.phone}
                </Button>
              )}
            </div>

            <p className="text-[13px] leading-5 text-rock-600">
              Zgłoszenie nie jest wiążące. Potwierdzamy termin, a dopiero potem prosimy o zaliczkę.
            </p>
          </div>
        </aside>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(courseSchema(course)) }}
      />
    </main>
  )
}
