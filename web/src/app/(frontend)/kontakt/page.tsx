import type { Metadata } from 'next'

import { getCourse, getSiteConfig, telHref } from '@/lib/content'
import { mapEmbedSrc } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Phone, Envelope, Pin, Clock } from '@/components/Icons'
import { Container } from '@/components/Ui'
import { ContactForm } from './ContactForm'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Kontakt',
    description:
      'Napisz lub zadzwoń — kursy wspinaczki skalnej, obozy i wyjazdy na Jurze Krakowsko-Częstochowskiej. Odpowiadamy zwykle tego samego dnia.',
    path: '/kontakt',
  })
}

type Props = { searchParams: Promise<{ course?: string; camp?: string }> }

export default async function Kontakt({ searchParams }: Props) {
  const { course: courseSlug, camp } = await searchParams
  const [siteConfig, course] = await Promise.all([
    getSiteConfig(),
    // The slug comes from the address, so it may point at nothing — in that
    // case we simply suggest nothing rather than showing an error.
    courseSlug ? getCourse(courseSlug) : Promise.resolve(null),
  ])
  const tel = telHref(siteConfig)

  const address = [
    siteConfig.street,
    [siteConfig.postalCode, siteConfig.city].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  // The map is built from the address itself, so it needs no key and no
  // extra step in the panel. `mapEmbedUrl` only overrides it for a more
  // precise pin; `frame-src` in next.config.ts lets nothing but Google Maps in.
  const mapSrc = mapEmbedSrc(siteConfig.mapEmbedUrl, address)

  return (
    <main>
      <Container className="pb-8 pt-8">
        <Breadcrumbs trail={[{ label: 'Start', href: '/' }, { label: 'Kontakt' }]} />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Kontakt
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Odpowiadamy zwykle tego samego dnia. Jeśli sprawa jest pilna albo chcesz dopytać o poziom
          — po prostu zadzwoń.
        </p>
      </Container>

      <Container className="grid gap-8 pb-16 lg:grid-cols-[1fr_380px] lg:gap-12 lg:pb-24">
        <section aria-labelledby="formularz">
          <h2 id="formularz" className="sr-only">
            Formularz kontaktowy
          </h2>
          <ContactForm
            topic={camp ? 'camp' : undefined}
            course={course ? { id: course.id, title: course.title } : undefined}
          />
        </section>

        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border border-rock-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Dane kontaktowe</h2>
            <dl className="mt-4 flex flex-col gap-4">
              {siteConfig.phone && tel && (
                <ContactRow icon={<Phone size={18} />} label="Telefon">
                  <a href={tel} className="font-semibold text-rock-900 hover:text-rope">
                    {siteConfig.phone}
                  </a>
                </ContactRow>
              )}
              {siteConfig.email && (
                <ContactRow icon={<Envelope size={18} />} label="E-mail">
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="break-all text-rock-900 hover:text-rope"
                  >
                    {siteConfig.email}
                  </a>
                </ContactRow>
              )}
              {address && (
                <ContactRow icon={<Pin size={18} />} label="Adres">
                  {/* Adres w znaczniku <address> i równolegle w danych
                      strukturalnych, żeby wyszukiwarka nie musiała go zgadywać. */}
                  <address className="not-italic leading-6">{address}</address>
                </ContactRow>
              )}
              {siteConfig.openingHours && (
                <ContactRow icon={<Clock size={18} />} label="Kiedy dzwonić">
                  <span className="whitespace-pre-line leading-6">{siteConfig.openingHours}</span>
                </ContactRow>
              )}
            </dl>

            {siteConfig.contactNote && (
              <p className="mt-5 border-t border-rock-100 pt-4 text-[14px] leading-6 text-rock-600">
                {siteConfig.contactNote}
              </p>
            )}
          </div>

          {mapSrc && (
            <iframe
              src={mapSrc}
              title={`Mapa — ${address || 'baza szkoły'}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[260px] w-full rounded-2xl border border-rock-200"
            />
          )}

          {siteConfig.directions && (
            <div className="rounded-2xl border border-rock-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Jak dojechać</h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-6 text-rock-600">
                {siteConfig.directions}
              </p>
            </div>
          )}
        </aside>
      </Container>
    </main>
  )
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3.5">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-rope">
        {icon}
      </span>
      <div>
        <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-600">{label}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  )
}
