import type { Metadata } from 'next'

import { getTestimonials, getSiteConfig, telHref } from '@/lib/content'
import { pluralPl, TESTIMONIAL_SUBJECTS } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Filters } from '@/components/Filters'
import { Quote } from '@/components/Quote'
import { Button, Container } from '@/components/Ui'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Opinie kursantów',
    description:
      'Co piszą osoby, które były na naszych kursach i obozach. Publikujemy wszystkie opinie, także krytyczne.',
    path: '/opinie',
  })
}

const FILTER_OPTIONS = [{ value: 'all', label: 'Wszystkie' }, ...TESTIMONIAL_SUBJECTS]

type Props = { searchParams: Promise<{ subject?: string }> }

export default async function TestimonialsPage({ searchParams }: Props) {
  const { subject = 'all' } = await searchParams
  const [all, siteConfig] = await Promise.all([getTestimonials(), getSiteConfig()])
  const tel = telHref(siteConfig)

  const testimonials = subject === 'all' ? all : all.filter((t) => t.subject === subject)

  return (
    <main>
      <Container className="pb-8 pt-8">
        <Breadcrumbs
          trail={[
            { label: 'Start', href: '/' },
            { label: 'Kursy', href: '/kursy' },
            { label: 'Opinie' },
          ]}
        />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Opinie kursantów
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Publikujemy wszystkie opinie, które dostajemy — także krytyczne, bo z nich najwięcej
          wynika dla kogoś, kto się dopiero zastanawia. Podpisujemy imieniem i nazwą szkolenia,
          nigdy pełnym nazwiskiem bez zgody.
        </p>
      </Container>

      {all.length > 0 && (
        <Container>
          <Filters
            label="Czego dotyczy:"
            options={FILTER_OPTIONS}
            active={subject}
            baseHref="/opinie"
            param="subject"
            summary={`${testimonials.length} ${pluralPl(testimonials.length, 'opinia', 'opinie', 'opinii')}`}
          />
        </Container>
      )}

      <Container className="py-10">
        {testimonials.length === 0 ? (
          <p className="text-rock-600">
            {all.length === 0
              ? 'Opinie pojawią się tutaj po dodaniu ich w panelu.'
              : 'Dla tego szkolenia nie mamy jeszcze opinii.'}
          </p>
        ) : (
          // `columns` rather than a grid: testimonials vary a lot in length,
          // and in a grid the longest one would stretch the whole row.
          <div className="gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
            {testimonials.map((testimonial) => (
              <Quote key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        )}
      </Container>

      <Container className="pb-16 lg:pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-rock-900 p-8 lg:flex-row lg:items-center lg:p-12">
          <div className="max-w-[640px]">
            <h2 className="text-[24px] leading-tight text-white lg:text-[30px]">
              Byłeś na kursie? Napisz, jak było
            </h2>
            <p className="mt-2 text-[16px] leading-7 text-rock-fg">
              Publikujemy w całości, razem z krytyką — z niej wynika najwięcej dla kogoś, kto się
              dopiero zastanawia.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/kontakt" large>
              Dodaj opinię
            </Button>
            {tel && (
              <Button href={tel} variant="outlineLight" large>
                {siteConfig.phone}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </main>
  )
}
