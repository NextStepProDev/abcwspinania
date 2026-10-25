import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import {
  asImage,
  getCourses,
  getEnglishPage,
  getHomePage,
  getSiteConfig,
  telHref,
} from '@/lib/content'
import { focalPosition, formatPriceLabel, formatLevel } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Button, Badge, Container } from '@/components/Ui'
import { MountainBackdrop } from '@/components/MountainBackdrop'

/**
 * One English page, not a full translation of the site.
 *
 * `hrefLang` and `lang` on the section, because the rest of the site is Polish —
 * without them a screen reader would read this text with Polish pronunciation
 * and a search engine would take the page for Polish with odd content.
 */
export function generateMetadata(): Metadata {
  const base = pageMetadata({
    title: 'Climbing courses on the Polish Jura',
    description:
      'Rock climbing courses in English on the Kraków-Częstochowa Upland, led by PZA-licensed instructors. Four climbers per instructor, own base in Rzędkowice.',
    path: '/en',
  })
  // Spread, not replaced: `openGraph: { locale }` alone dropped the title,
  // description and image from the shared preview (fixed 10.10.2026).
  return { ...base, openGraph: { ...base.openGraph, locale: 'en_GB' } }
}

export default async function EnglishPage() {
  const [content, courses, siteConfig, home] = await Promise.all([
    getEnglishPage(),
    getCourses(),
    getSiteConfig(),
    getHomePage(),
  ])
  const tel = telHref(siteConfig)
  // The homepage's hero photo (reported 10.10.2026: the English page had only
  // the drawn backdrop and looked unfinished next to the Polish one).
  const heroImage = asImage(home?.heroImage)

  // With no price there is nothing to show in the table — individually quoted
  // training stays out of it, so no row consists of a lone dash.
  const forTable = courses.filter((k) => typeof k.price === 'number')

  const address = [
    siteConfig.street,
    [siteConfig.postalCode, siteConfig.city].filter(Boolean).join(' '),
    'Poland',
  ].filter(Boolean)

  return (
    <main lang="en">
      <section className="relative isolate overflow-hidden bg-rock-950">
        {heroImage?.url ? (
          <>
            <Image
              src={heroImage.url}
              alt={heroImage.alt ?? ''}
              fill
              loading="eager"
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: focalPosition(heroImage) }}
            />
            {/* The homepage's gradient: dark where the text sits, clear over the rock. */}
            <div className="absolute inset-0 bg-linear-to-r from-rock-950/80 via-rock-950/55 via-45% to-rock-950/10" />
          </>
        ) : (
          <>
            <MountainBackdrop />
            <div className="absolute inset-0 bg-rock-950/60" />
          </>
        )}
        <Container className="relative flex min-h-[420px] flex-col justify-center gap-5 py-14 lg:min-h-[520px]">
          {content?.badge && (
            <span className="self-start">
              <Badge tone="dark" uppercase>
                {content.badge}
              </Badge>
            </span>
          )}
          <h1 className="max-w-[820px] text-balance text-[36px] leading-[1.02] text-white lg:text-[58px]">
            {content?.title ?? 'Learn to climb on Polish Jura limestone'}
          </h1>
          {content?.lead && (
            <p className="max-w-[620px] text-[17px] leading-7 text-rock-fg-strong lg:text-[19px]">
              {content.lead}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3.5">
            {tel && (
              <Button href={tel} large>
                Call {siteConfig.phone}
              </Button>
            )}
            {siteConfig.email && (
              <Button href={`mailto:${siteConfig.email}`} variant="outlineLight" large>
                Send an email
              </Button>
            )}
          </div>
        </Container>
      </section>

      {(content?.about || content?.accommodation) && (
        <Container className="grid gap-8 py-14 lg:grid-cols-2 lg:gap-14">
          {content?.about && (
            <section>
              <h2 className="text-[28px] leading-tight lg:text-[34px]">Who we are</h2>
              <p className="mt-4 whitespace-pre-line text-[16px] leading-7 text-rock-600">
                {content.about}
              </p>
            </section>
          )}
          {content?.accommodation && (
            <section>
              <h2 className="text-[28px] leading-tight lg:text-[34px]">Where you stay</h2>
              <p className="mt-4 whitespace-pre-line text-[16px] leading-7 text-rock-600">
                {content.accommodation}
              </p>
            </section>
          )}
        </Container>
      )}

      {forTable.length > 0 && (
        <Container className="pb-14">
          <h2 className="text-[28px] leading-tight lg:text-[34px]">Courses and prices</h2>
          {content?.coursesNote && (
            <p className="mt-3 max-w-[680px] text-[16px] leading-7 text-rock-600">
              {content.coursesNote}
            </p>
          )}

          <div className="mt-7 overflow-x-auto rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
            <table className="w-full min-w-[560px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-rock-75 text-left">
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Course
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Length
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Level
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-right text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {forTable.map((k) => (
                  <tr key={k.id} className="border-b border-rock-100 last:border-0">
                    {/* Nazwa po angielsku, gdy jest; inaczej polska — lepiej
                        pokazać oryginał niż pustą komórkę. */}
                    <td className="px-6 py-4 font-medium">{k.titleEn || k.title}</td>
                    <td className="px-6 py-4 text-rock-600">{k.duration ?? '—'}</td>
                    <td className="px-6 py-4 text-rock-600">
                      {POZIOM_EN[k.level ?? ''] ?? formatLevel(k.level) ?? '—'}
                    </td>
                    {/* Ceny zaciągają się z tych samych kursów co po polsku,
                        więc nie mogą się z nimi rozjechać. */}
                    <td className="px-6 py-4 text-right font-semibold tabular-nums">
                      {formatPriceLabel(k.price, k.priceFrom)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      )}

      <Container className="pb-16 lg:pb-24">
        <div className="grid gap-8 rounded-2xl bg-rock-900 p-8 lg:grid-cols-2 lg:gap-14 lg:p-14">
          <div>
            <h2 className="text-[26px] leading-tight text-white lg:text-[32px]">
              Getting here and booking
            </h2>
            {content?.directions && (
              <p className="mt-4 whitespace-pre-line text-[16px] leading-7 text-rock-fg">
                {content.directions}
              </p>
            )}
            {content?.season && (
              <p className="mt-4 whitespace-pre-line text-[16px] leading-7 text-rock-fg">
                {content.season}
              </p>
            )}
          </div>

          <div>
            <dl className="flex flex-col gap-4 text-[15px]">
              {siteConfig.phone && tel && (
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-400">Phone</dt>
                  <dd className="mt-1">
                    <a href={tel} className="font-semibold text-white hover:text-rope-light">
                      {siteConfig.phoneE164 || siteConfig.phone}
                    </a>
                  </dd>
                </div>
              )}
              {siteConfig.email && (
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-400">Email</dt>
                  <dd className="mt-1">
                    <a
                      href={`mailto:${siteConfig.email}`}
                      className="break-all text-rock-fg hover:text-rope-light"
                    >
                      {siteConfig.email}
                    </a>
                  </dd>
                </div>
              )}
              {address.length > 1 && (
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-400">Address</dt>
                  <dd className="mt-1">
                    <address className="not-italic leading-6 text-rock-fg">
                      {address.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-6">
              <Button href="/kontakt">Send an enquiry</Button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-[15px] text-rock-600">
          Full schedule and Polish-language detail:{' '}
          <Link
            href="/terminarz"
            hrefLang="pl"
            lang="pl"
            className="text-rope underline underline-offset-4"
          >
            Terminarz
          </Link>
          .
        </p>
      </Container>
    </main>
  )
}

/** Levels in English — the same values as in `format.ts`, different labels. */
const POZIOM_EN: Record<string, string> = {
  poczatkujacy: 'Beginner',
  sredniozaawansowany: 'Intermediate',
  zaawansowany: 'Advanced',
}
