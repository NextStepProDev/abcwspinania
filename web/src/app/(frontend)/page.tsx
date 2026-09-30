import type { Metadata } from 'next'
import Image from 'next/image'

import {
  getCourses,
  getHomePage,
  getUpcomingSessions,
  getTestimonials,
  getPosts,
  getSiteConfig,
  telHref,
  asImage,
} from '@/lib/content'
import { yearsSince, focalPosition, splitFirstSentence } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { SELECTABLE_ICONS, type IconName } from '@/components/Icons'
import { CourseCard } from '@/components/CourseCard'
import { SessionTable } from '@/components/SessionTable'
import { PostCard } from '@/components/PostCard'
import { Quote } from '@/components/Quote'
import { MountainBackdrop } from '@/components/MountainBackdrop'
import { MountainRidges } from '@/components/MountainRidges'
import { SignWatermark } from '@/components/Logo'
import { HeroSignAtEdge, HeroSignPlain, HeroSignScene, heroSceneFits } from '@/components/HeroSign'
import { Button, Badge, SectionHeading, Container, ImagePlaceholder } from '@/components/Ui'

// Exported as generateMetadata, NOT as `export const metadata` — that form
// requires a literal and will not accept a function call (rule 7).
export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Szkoła wspinaczki na Jurze',
    description:
      'Kursy wspinaczki skalnej według programu PZA, obozy dla dzieci i młodzieży, własna baza w Rzędkowicach. Maksymalnie cztery osoby na instruktora.',
    path: '/',
  })
}

export default async function Home() {
  // Every query is independent of the others, so they run in parallel — run in
  // series they would add up their latencies.
  const [content, courses, sessions, testimonials, posts, siteConfig] = await Promise.all([
    getHomePage(),
    getCourses(),
    getUpcomingSessions(4),
    getTestimonials(),
    getPosts(3),
    getSiteConfig(),
  ])
  // The homepage shows testimonials explicitly marked for it; when nobody has
  // marked any, we take the first two so the section does not vanish.
  const marked = testimonials.filter((t) => t.onHomepage)
  const homepageTestimonials = (marked.length > 0 ? marked : testimonials).slice(0, 2)
  const tel = telHref(siteConfig)
  const years = yearsSince(siteConfig.foundedYear)
  const heroImage = asImage(content?.heroImage)
  const sceneFits = !!heroImage?.url && heroSceneFits(heroImage)
  const heroText = content?.heroText ? splitFirstSentence(content.heroText) : null

  return (
    <main>
      {/* --- Hero header --- */}
      <section className="relative isolate overflow-hidden bg-rock-950">
        {heroImage?.url ? (
          // The ORIGINAL, not the 750px `medium` variant — this is the single
          // largest image on the site, and Next's optimizer already resizes it
          // per device (rule 24's reasoning: one resize cost, paid once, here).
          <Image
            src={heroImage.url}
            alt={heroImage.alt ?? ''}
            fill
            loading="eager"
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: focalPosition(heroImage) }}
          />
        ) : (
          <MountainBackdrop />
        )}
        {/* The logo behind the rock — before the tint, so it sits IN the
            photo and darkens with it. Only where the rock is in frame. */}
        {sceneFits && <HeroSignScene className="hidden xl:block" />}
        {heroImage?.url ? (
          // A flat tint can't win here: dark enough to keep the text legible
          // over the photo's brightest leaves, and the photo itself goes dull;
          // light enough to stay vivid, and letters disappear into pale
          // foliage. A left-to-right gradient instead: dark where the text
          // actually sits, near-clear over the open sky and rock on the right
          // where nothing is written.
          <div className="absolute inset-0 bg-linear-to-r from-rock-950/80 via-rock-950/55 via-45% to-rock-950/10" />
        ) : (
          // Illustration keeps its original flat /60, unchanged; its own
          // rope-accent colour was tuned for contrast against ITS background,
          // not against a gradient, so leave that pairing exactly as it was.
          <div className="absolute inset-0 bg-rock-950/60" />
        )}
        {/* Bottom padding below `xl` makes room for the logo standing near the
            section's bottom edge (`HeroSignAtEdge`), so it never runs under
            the buttons.

            On a phone the section is meant to fit one screen with the header
            and the bottom action bar — measured 30.09.2026 at 390 px it was
            797 px tall; after these changes, 557. The room it has is an
            estimate, not a measurement: Safari on a typical iPhone shows
            about 660–750 px depending on its toolbar, minus 72 px of header
            and 65 px of action bar, so roughly 520–610 px. Hence, below `sm`
            only: tighter spacing, a smaller heading, the first sentence of
            the text, and no call button (the phone number is in the header
            and in the bottom bar already). */}
        <Container className="relative flex flex-col justify-center gap-4 pt-8 pb-[186px] sm:min-h-[520px] sm:gap-6 sm:pt-16 sm:pb-[216px] lg:min-h-[640px] xl:py-0">
          {(content?.heroBadge || content?.heroSubtitle) && (
            <div className="flex flex-wrap items-center gap-3">
              {content.heroBadge && (
                <Badge tone="dark" uppercase>
                  {content.heroBadge}
                </Badge>
              )}
              {content.heroSubtitle && (
                <span className="text-sm font-medium text-rock-100">{content.heroSubtitle}</span>
              )}
            </div>
          )}

          {/* Exactly one <h1> per page (rule 11). The fallback text is here so
              the page has a heading even before anyone fills in the panel — an
              empty h1 is worse than a conservative one. */}
          <h1 className="max-w-[830px] text-balance text-[36px] leading-[0.98] text-white sm:text-[56px] lg:text-[72px] lg:tracking-[-0.035em]">
            {content?.heroTitle ?? 'Twoja droga wspinaczkowa zaczyna się tutaj'}
          </h1>

          {heroText && (
            // The rest is in the HTML at every width, only hidden on a phone,
            // so search engines always get the whole text (rule 9). A screen
            // reader on a phone reads what is shown — `hidden` hides it too.
            <p className="max-w-[620px] text-[16px] leading-6 text-rock-fg-strong sm:text-[17px] sm:leading-7 lg:text-[19px] lg:leading-[30px]">
              {heroText.head}
              {heroText.rest && <span className="hidden sm:inline">{heroText.rest}</span>}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3.5 sm:mt-2">
            <Button href="/kursy" large withArrow>
              Zobacz kursy
            </Button>
            {tel && (
              // `contents` from `sm` up: the wrapper vanishes from the layout,
              // so the button sits in the flex row exactly as before.
              <span className="hidden sm:contents">
                <Button href={tel} variant="outlineLight" large>
                  Zadzwoń: {siteConfig.phone}
                </Button>
              </span>
            )}
          </div>
        </Container>

        {/* From `xl` up, where the photo shows the rock, the logo and the PZA
            badge stand behind it (the scene above). Over any other photo the
            rock mask would not fit, so they stand in the open right side
            instead. */}
        {!sceneFits && (
          <Container className="pointer-events-none absolute inset-0 hidden items-center justify-end xl:flex">
            <HeroSignPlain />
          </Container>
        )}

        {/* Below `xl` the rock is out of frame: the logo and the badge stand
            near the bottom edge of the section instead. Decorative everywhere — the
            header already names the school. */}
        <Container className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-end xl:hidden">
          <HeroSignAtEdge />
        </Container>
      </section>

      {/* --- Stats bar --- */}
      {content?.stats && content.stats.length > 0 && (
        <section className="border-b border-rock-100 bg-white">
          <Container className="grid grid-cols-2 gap-8 py-10 lg:grid-cols-4 lg:gap-10">
            {content.stats.map((stat) => (
              <div key={stat.id ?? stat.value} className="flex flex-col gap-1">
                <div
                  className={`font-display text-[22px] font-extrabold tracking-[-0.02em] lg:text-[30px] ${
                    stat.highlighted ? 'text-rope' : 'text-rock-900'
                  }`}
                >
                  {/* "25 lat" is computed from the founding year so it does not
                      go stale in January. The panel can override it with its own
                      text. */}
                  {stat.value === '{lat}' && years ? `${years} lat` : stat.value}
                </div>
                <div className="text-sm leading-5 text-rock-600">{stat.caption}</div>
              </div>
            ))}
          </Container>
        </section>
      )}

      {/* --- Courses --- */}
      <section className="py-16 lg:py-24">
        <Container>
          <SectionHeading
            id="kursy"
            title={content?.coursesTitle ?? 'Kursy'}
            description={content?.coursesText}
            link="/kursy"
            linkLabel="Wszystkie kursy"
          />

          {courses.length === 0 ? (
            // The empty state is PART OF THE DESIGN, not a failure: getCourses()
            // deliberately returns an empty list when the database is
            // unreachable (a CI build) or when the panel has no content yet
            // (rule 2).
            <p className="text-rock-600">Oferta kursów pojawi się tutaj po dodaniu jej w panelu.</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {courses.slice(0, 4).map((course) => (
                <li key={course.id} className="flex">
                  <div className="flex w-full">
                    <CourseCard course={course} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      {/* --- Camps --- */}
      {content?.campsTitle && (
        <section className="pb-16 lg:pb-24">
          <Container>
            {/* Photo column capped at 520px: at 3:4 that is ~690px tall, so
                the whole section fits on a laptop screen without scrolling. */}
            <div className="grid overflow-hidden rounded-2xl bg-rock-900 lg:grid-cols-[minmax(0,1fr)_520px]">
              <div className="relative isolate flex flex-col justify-center gap-5 p-8 lg:p-16">
                {/* A quiet mountain skyline along the bottom of the panel,
                    behind the text. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2">
                  <MountainRidges />
                </div>
                {content.campsBadge && (
                  <span className="self-start">
                    <Badge tone="onDark" uppercase>
                      {content.campsBadge}
                    </Badge>
                  </span>
                )}
                <h2 className="text-[28px] leading-[1.05] text-white lg:text-[40px]">
                  {content.campsTitle}
                </h2>
                {content.campsText && (
                  <p className="text-[17px] leading-7 text-rock-fg">{content.campsText}</p>
                )}
                <div className="mt-2">
                  <Button href="/obozy">Terminy obozów</Button>
                </div>
              </div>

              {(() => {
                const image = asImage(content.campsImage)
                return image?.url ? (
                  <Image
                    // The original, not the 750px `medium` variant: this
                    // column is 520px wide, so retina screens need more
                    // pixels than `medium` has.
                    src={image.url}
                    alt={image.alt ?? ''}
                    width={image.width ?? 1200}
                    height={image.height ?? 1600}
                    sizes="(min-width: 1024px) 520px, 100vw"
                    // The photo fills its column at a fixed 3:4. object-cover
                    // crops whatever doesn't match that ratio, so upload
                    // campsImage already framed at 3:4 — then nothing is cut —
                    // or set its focal point to choose what the crop keeps.
                    className="aspect-[3/4] h-full w-full object-cover"
                    style={{ objectPosition: focalPosition(image) }}
                  />
                ) : (
                  <ImagePlaceholder
                    caption="Zdjęcie · obóz w Rzędkowicach"
                    height="aspect-[3/4]"
                    dark
                  />
                )
              })()}
            </div>
          </Container>
        </section>
      )}

      {/* --- Testimonials --- */}
      {homepageTestimonials.length > 0 && (
        <section className="pb-16 lg:pb-24">
          <Container>
            <SectionHeading title="Co mówią kursanci" link="/opinie" linkLabel="Wszystkie opinie" />
            <ul className="grid gap-6 lg:grid-cols-2">
              {homepageTestimonials.map((testimonial) => (
                <li key={testimonial.id} className="flex">
                  <Quote testimonial={testimonial} large />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* --- Upcoming sessions --- */}
      {sessions.length > 0 && (
        <section className="pb-16 lg:pb-24">
          <Container>
            <SectionHeading
              title="Najbliższe terminy"
              link="/terminarz"
              linkLabel="Pełny terminarz"
            />
            <SessionTable sessions={sessions} />
          </Container>
        </section>
      )}

      {/* --- Why a licensed instructor --- */}
      {content?.reasons && content.reasons.length > 0 && (
        <section className="relative overflow-hidden pb-16 lg:pb-24">
          <SignWatermark className="-top-24 -right-32" />
          <Container className="relative">
            <h2 className="mb-9 max-w-[700px] text-[32px] leading-[1.05] lg:text-[44px]">
              Dlaczego instruktor z licencją
            </h2>
            <ul className="grid gap-8 lg:grid-cols-3">
              {content.reasons.map((reason) => {
                const Icon = SELECTABLE_ICONS[(reason.icon ?? 'shield') as IconName]
                return (
                  <li key={reason.id ?? reason.title} className="flex flex-col gap-3">
                    <Icon size={28} className="text-rope" />
                    <h3 className="text-xl font-semibold tracking-[-0.01em]">{reason.title}</h3>
                    <p className="text-[15px] leading-6 text-rock-600">{reason.description}</p>
                  </li>
                )
              })}
            </ul>
          </Container>
        </section>
      )}

      {/* --- Latest posts --- */}
      {posts.length > 0 && (
        <section className="pb-16 lg:pb-24">
          <Container>
            <SectionHeading
              title="Ostatnio pisaliśmy"
              description="Relacje z kursów, historia rejonu i rzeczy, które warto wiedzieć, zanim pierwszy raz wyjdziesz w skały."
              link="/aktualnosci"
              linkLabel="Wszystkie wpisy"
            />
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id} className="flex">
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* --- Closing call to action --- */}
      {content?.ctaTitle && (
        <section className="pb-16 lg:pb-24">
          <Container>
            <div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-rope-panel px-8 py-12 lg:flex-row lg:items-center lg:px-16 lg:py-14">
              <div className="max-w-[640px]">
                <h2 className="text-[26px] leading-[1.08] text-white lg:text-[38px]">
                  {content.ctaTitle}
                </h2>
                {content.ctaText && (
                  <p className="mt-2.5 text-[17px] leading-7 text-rope-soft">{content.ctaText}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-3.5">
                <Button href="/kontakt" variant="light" large>
                  Napisz do nas
                </Button>
                {tel && (
                  <Button href={tel} variant="outlineLight" large>
                    {siteConfig.phone}
                  </Button>
                )}
              </div>
            </div>
          </Container>
        </section>
      )}
    </main>
  )
}
