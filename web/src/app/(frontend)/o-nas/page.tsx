import type { Metadata } from 'next'
import Image from 'next/image'
import { RichText } from '@payloadcms/richtext-lexical/react'

import { getAboutPage, getInstructors, getSiteConfig, asImage } from '@/lib/content'
import { yearsSince } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Shield, Check, Certificate, Arrow } from '@/components/Icons'
import { Container, ImagePlaceholder } from '@/components/Ui'
import Link from 'next/link'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'O nas',
    description:
      'Szkoła wspinaczki z licencją Polskiego Związku Alpinizmu. Własna baza w Rzędkowicach, instruktorzy z weryfikowanymi uprawnieniami, grupy do czterech osób.',
    path: '/o-nas',
  })
}

const REASON_ICONS = [Shield, Check, Certificate]

interface ArchivePhoto {
  src: string
  width: number
  height: number
  alt: string
  /** Spans two columns — for the one panoramic frame in the set. */
  wide?: boolean
}

/**
 * Photographs from Krzysztof Wróbel's family archive, showing the Jura decades
 * ago. They sit in the repository rather than the media library on purpose:
 * they are a fixed part of this page's story, not content the client swaps, and
 * a fresh deploy should show them without anyone uploading anything first.
 *
 * Supplied as screen captures of scans, so the resolution is whatever the
 * screen held. Re-encoded to 1200px JPEG at quality 70, chosen by measuring
 * rather than by eye: for the largest of them quality 70 gives 196 KB against
 * 232 KB at quality 80 — about a fifth more for nothing visible at the size
 * these are shown.
 *
 * The alt text says what is VISIBLE and nothing more. Where each was taken is
 * not recorded anywhere, and naming a crag we cannot verify would be an
 * invention presented as the school's own history — which is exactly what the
 * first draft of the heading above did before review caught it.
 */
const ARCHIVE_PHOTOS: ArchivePhoto[] = [
  {
    src: '/images/archive/jura-arch.jpg',
    width: 1200,
    height: 600,
    wide: true,
    alt: 'Skalna brama w wapiennym ostańcu, przed nią pastwisko z krowami, w kadrze sosny',
  },
  {
    src: '/images/archive/jura-ostance.jpg',
    width: 1200,
    height: 798,
    alt: 'Grupa wapiennych ostańców na trawiastym wzgórzu, w tle pola i las',
  },
  {
    src: '/images/archive/jura-pinnacles.jpg',
    width: 1200,
    height: 763,
    alt: 'Rząd skalnych turni na łagodnym stoku, oświetlonych niskim słońcem',
  },
  {
    src: '/images/archive/jura-hikers.jpg',
    width: 1200,
    height: 846,
    alt: 'Trzy osoby z plecakami idące pod skały, ubrane po turystycznemu',
  },
  {
    src: '/images/archive/jura-postcard.jpg',
    width: 1200,
    height: 741,
    alt: 'Zbliżenie na masyw skalny z otworem okiennym, odbitka w sepii',
  },
]

export default async function AboutPage() {
  const [content, instructors, siteConfig] = await Promise.all([
    getAboutPage(),
    getInstructors(),
    getSiteConfig(),
  ])
  const years = yearsSince(siteConfig.foundedYear)
  const image = asImage(content?.image)
  const medium = image?.sizes?.medium

  return (
    <main>
      <Container className="grid gap-10 py-8 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-14 lg:py-12">
        <div>
          <Breadcrumbs trail={[{ label: 'Start', href: '/' }, { label: 'O nas' }]} />
          <h1 className="mt-5 max-w-[700px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
            {content?.title ?? 'O szkole'}
          </h1>
          {content?.intro && (
            <p className="mt-5 max-w-[640px] whitespace-pre-line text-[17px] leading-7 text-rock-600">
              {content.intro}
            </p>
          )}
          {years && (
            <p className="mt-4 text-[15px] text-rock-600">
              Szkolimy od {siteConfig.foundedYear} roku, czyli {years} years.
              {siteConfig.pzaLicence && ` Licencja instruktorska PZA nr ${siteConfig.pzaLicence}.`}
            </p>
          )}
        </div>

        {image?.url ? (
          <Image
            src={medium?.url ?? image.url}
            alt={image.alt ?? ''}
            width={medium?.width ?? image.width ?? 750}
            height={medium?.height ?? image.height ?? 500}
            className="h-full max-h-[380px] w-full rounded-2xl object-cover"
          />
        ) : (
          <ImagePlaceholder
            caption="Zdjęcie · instruktor przy skale"
            height="h-[280px] lg:h-[380px]"
          />
        )}
      </Container>

      {content?.licenceReasons && content.licenceReasons.length > 0 && (
        <Container className="py-12 lg:py-16">
          <h2 className="mb-8 max-w-[700px] text-[32px] leading-[1.05] lg:text-[44px]">
            Dlaczego licencja PZA ma znaczenie
          </h2>
          <ul className="grid gap-8 lg:grid-cols-3">
            {content.licenceReasons.map((p, i) => {
              const Icon = REASON_ICONS[i % REASON_ICONS.length]
              return (
                <li key={p.id ?? i} className="flex flex-col gap-3">
                  <Icon size={28} className="text-rope" />
                  <h3 className="text-xl font-semibold tracking-[-0.01em]">{p.title}</h3>
                  <p className="text-[15px] leading-6 text-rock-600">{p.description}</p>
                </li>
              )
            })}
          </ul>
        </Container>
      )}

      {instructors.length > 0 && (
        <Container className="pb-12 lg:pb-16">
          <h2 className="text-[32px] leading-[1.05] lg:text-[44px]">Instruktorzy</h2>
          <p className="mt-3 max-w-[680px] text-[17px] leading-7 text-rock-600">
            Każdy z licencją PZA, każdy wspina się dalej na własną rękę — instruktor, który przestał
            się wspinać, przestaje rozumieć, co jest trudne.
          </p>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {instructors.map((i) => {
              const portret = asImage(i.portrait)
              const mini = portret?.sizes?.medium
              return (
                <li
                  key={i.id}
                  className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]"
                >
                  {portret?.url ? (
                    <Image
                      src={mini?.url ?? portret.url}
                      alt={portret.alt ?? ''}
                      width={mini?.width ?? portret.width ?? 750}
                      height={mini?.height ?? portret.height ?? 500}
                      className="h-[240px] w-full border-b border-rock-200 object-cover"
                    />
                  ) : (
                    <ImagePlaceholder caption="Portret" height="h-[240px]" />
                  )}
                  <div className="flex flex-col gap-2 p-6">
                    <h3 className="text-[19px] font-semibold">{i.name}</h3>
                    {i.role && <p className="text-[14px] text-rope">{i.role}</p>}
                    {i.license && <p className="text-[13px] text-rock-600">Licencja {i.license}</p>}
                    {i.bio && <p className="mt-1 text-[15px] leading-6 text-rock-600">{i.bio}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </Container>
      )}

      {(content?.aboutJura || (content?.juraFacts && content.juraFacts.length > 0)) && (
        <section className="pb-12 lg:pb-16">
          <Container>
            <div className="rounded-2xl bg-rock-900 p-8 lg:p-14">
              <h2 className="text-[28px] leading-[1.05] text-white lg:text-[38px]">
                Wspinanie na Jurze
              </h2>
              {content?.aboutJura && (
                <p className="mt-4 max-w-[760px] text-[17px] leading-7 text-rock-fg">
                  {content.aboutJura}
                </p>
              )}
              {content?.juraFacts && content.juraFacts.length > 0 && (
                <dl className="mt-9 grid grid-cols-2 gap-7 lg:grid-cols-4">
                  {content.juraFacts.map((fact, i) => (
                    <div key={fact.id ?? i}>
                      <dt className="sr-only">{fact.caption}</dt>
                      <dd>
                        <span className="block font-display text-[26px] font-extrabold text-rope-light lg:text-[32px]">
                          {fact.value}
                        </span>
                        <span className="mt-1 block text-[14px] leading-5 text-rock-fg">
                          {fact.caption}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </Container>
        </section>
      )}

      {content?.content && (
        <Container className="pb-12 lg:pb-16">
          <div className="rich-text max-w-[720px]">
            <RichText data={content.content} />
          </div>
        </Container>
      )}

      <Container className="pb-12 lg:pb-16">
        <h2 className="text-[32px] leading-[1.05] lg:text-[44px]">Jura sprzed lat</h2>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Zdjęcia z rodzinnego archiwum Krzysztofa Wróbla — Jura sprzed kilkudziesięciu lat.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHIVE_PHOTOS.map((photo) => (
            <li key={photo.src} className={photo.wide ? 'sm:col-span-2' : undefined}>
              {/* Every one lazy, Next's default. On the gallery the first tile
                  is the LCP candidate and gets `eager`; this strip sits near
                  the bottom of a long page, so eager-loading anything here
                  fetches a photo most visitors never scroll to. */}
              <figure className="overflow-hidden rounded-xl border border-rock-200">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  sizes={
                    photo.wide
                      ? '(min-width: 1024px) 62vw, (min-width: 640px) 94vw, 94vw'
                      : '(min-width: 1024px) 31vw, (min-width: 640px) 47vw, 94vw'
                  }
                  className="h-full w-full object-cover"
                />
              </figure>
            </li>
          ))}
        </ul>
      </Container>

      <Container className="pb-16 lg:pb-24">
        <ul className="grid gap-5 md:grid-cols-2">
          {[
            {
              href: '/opinie',
              title: 'Opinie kursantów',
              description: 'Wszystkie, które dostajemy — razem z krytyką.',
            },
            {
              href: '/en',
              title: 'Courses in English',
              description: 'Prowadzimy kursy po angielsku. Skrót oferty na osobnej stronie.',
            },
          ].map((k) => (
            <li key={k.href}>
              <Link
                href={k.href}
                className="flex items-center gap-4 rounded-2xl border border-rock-200 bg-white p-6 transition-colors hover:border-rope"
              >
                <span className="grow">
                  <span className="block text-[17px] font-semibold">{k.title}</span>
                  <span className="mt-1 block text-[15px] leading-6 text-rock-600">
                    {k.description}
                  </span>
                </span>
                <Arrow size={20} className="shrink-0 text-rope" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  )
}
