import { getPayload } from 'payload'
import config from '@payload-config'

import type {
  Course,
  Camp,
  Session,
  Post,
  Testimonial,
  Instructor,
  Media,
  SiteConfig,
  HomePage,
  AboutPage,
  EnglishPage,
} from '@/payload-types'

/**
 * The ONLY entry point to content from the site side.
 *
 * Previously (Strapi) this issued a real HTTP request to a separate container.
 * Payload now lives in the SAME process, so we reach the database directly — no
 * network hop, no CORS, no hand-maintained types (`Course` comes from
 * payload-types.ts, generated from the collection config).
 *
 * The empty-data fallback STAYS, though its reason changed. It used to guard
 * against an unreachable Strapi; now against an unreachable database. The effect
 * is the same and just as intended: `next build` in CI must pass without a
 * working database, and a production outage must yield an empty section rather
 * than a 500.
 */
async function withPayloadSafe<T>(
  label: string,
  run: (payload: Awaited<ReturnType<typeof getPayload>>) => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    const payload = await getPayload({ config })
    return await run(payload)
  } catch (error) {
    // Deliberately `warn`, not `error`: a missing database at build time is an
    // EXPECTED scenario. Logged as an error, a genuine production outage would
    // look identical in the logs to an ordinary CI build.
    console.warn(`Content unavailable (${label}), rendering empty:`, error)
    return fallback
  }
}

export type { Course, Camp, Session, Post, Testimonial, Instructor, SiteConfig }

/** An image from an `upload` field arrives as an object or as a bare id (at depth: 0). */
export type Image = Media

/**
 * Default values for the `site-config` global.
 *
 * Needed because `withPayloadSafe()` has to be handed a sensible substitute
 * when there is no database (a CI build). The empty strings are INTENTIONAL:
 * components check `if (phone)` and render no `tel:` link at all rather than a
 * broken one. That is the same rule that used to live inside `telHref()`.
 */
const EMPTY_SITE_CONFIG: SiteConfig = {
  id: 0,
  phone: null,
  phoneE164: null,
  email: null,
  openingHours: null,
  contactNote: null,
  legalName: 'ABC Wspinania',
  street: null,
  postalCode: null,
  city: null,
  directions: null,
  mapEmbedUrl: null,
  pzaLicence: null,
  stateQualifications: null,
  foundedYear: null,
  shortDescription: null,
  facebook: null,
  youtube: null,
  updatedAt: null,
  createdAt: null,
}

/**
 * Contact details and information about the school.
 *
 * Called from the layout, so it runs on EVERY page. Payload keeps globals in a
 * single row and caches them in-process, so this is not a per-request query —
 * but there is still no sense in calling it twice in one tree; components
 * receive the result through props rather than fetching it themselves.
 */
export function getSiteConfig(): Promise<SiteConfig> {
  return withPayloadSafe(
    'site-config',
    (payload) => payload.findGlobal({ slug: 'site-config', depth: 1 }),
    EMPTY_SITE_CONFIG,
  )
}

/** The number formatted for an `href` attribute. `null` when there is nothing to link. */
export function telHref(config: Pick<SiteConfig, 'phone' | 'phoneE164'>): string | null {
  const number = config.phoneE164 || config.phone
  if (!number) return null
  const cleaned = number.replace(/[^\d+]/g, '')
  return cleaned ? `tel:${cleaned}` : null
}

/** Homepage copy. `null` when the global has not been filled in yet. */
export function getHomePage(): Promise<HomePage | null> {
  return withPayloadSafe(
    'home-page',
    (payload) => payload.findGlobal({ slug: 'home-page', depth: 1 }),
    null,
  )
}

/**
 * The list of courses to display on the site.
 *
 * `limit` is stated explicitly — Payload returns 10 entries by default, so
 * without it the list would truncate with no error and no trace in the logs.
 * The same trap as `pagination[pageSize]` in Strapi, under a different name.
 */
export function getCourses(): Promise<Course[]> {
  return withPayloadSafe(
    'courses',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'courses',
        limit: 100,
        sort: 'order',
        depth: 1, // pulls in the related `cover` rather than a bare id
      })
      return docs
    },
    [],
  )
}

export function getCourse(slug: string): Promise<Course | null> {
  return withPayloadSafe(
    `course/${slug}`,
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'courses',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 1,
      })
      return docs[0] ?? null
    },
    null,
  )
}

/** An `upload` field value arrives as an object or as a bare id (at depth: 0). */
export function asImage(value: Course['cover']): Image | null {
  return value && typeof value === 'object' ? value : null
}

// --- Camps and trips ---------------------------------------------------------

export function getCamps(): Promise<Camp[]> {
  return withPayloadSafe(
    'camps',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'camps',
        limit: 100,
        sort: 'order',
        depth: 1,
      })
      return docs
    },
    [],
  )
}

export function getCamp(slug: string): Promise<Camp | null> {
  return withPayloadSafe(
    `camp/${slug}`,
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'camps',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 1,
      })
      return docs[0] ?? null
    },
    null,
  )
}

// --- Sessions ----------------------------------------------------------------

/**
 * Sessions to show on the site.
 *
 * Cancelled and finished ones are filtered out: they stay in the panel (the
 * client needs the history), but there is no reason for anyone to land on them
 * from a search engine.
 *
 * Everything before today is cut off too. The cut-off is the START of the day,
 * not "now" — otherwise a session starting this morning would disappear from
 * the site by the afternoon, while it is still running.
 *
 * Midnight is computed in UTC, not locally. Sessions are written by a "dayOnly"
 * picker, i.e. as UTC midnight; comparing them against local midnight shifts the
 * boundary by the timezone offset and, west of UTC, drops a session starting
 * TODAY. The same rule as for date formatting (see `formatDateRange`).
 */
function startOfToday(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

export function getUpcomingSessions(limit = 100): Promise<Session[]> {
  return withPayloadSafe(
    'sessions',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'sessions',
        where: {
          and: [
            { status: { in: ['open', 'waitlist'] } },
            { startDate: { greater_than_equal: startOfToday() } },
          ],
        },
        // Explicit limit — Payload returns 10 by default, so without it the
        // schedule would stop halfway through the year with no error and no
        // trace in the logs (rule 3).
        limit,
        sort: 'startDate',
        depth: 1,
      })
      return docs
    },
    [],
  )
}

/** Sessions of one course — for the date picker card on its page. */
export function getSessionsForCourse(courseId: number): Promise<Session[]> {
  return withPayloadSafe(
    `sessions/course/${courseId}`,
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'sessions',
        where: {
          and: [
            { course: { equals: courseId } },
            { status: { in: ['open', 'waitlist'] } },
            { startDate: { greater_than_equal: startOfToday() } },
          ],
        },
        limit: 50,
        sort: 'startDate',
        depth: 0,
      })
      return docs
    },
    [],
  )
}

/** Sessions of one camp. */
export function getSessionsForCamp(campId: number): Promise<Session[]> {
  return withPayloadSafe(
    `sessions/camp/${campId}`,
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'sessions',
        where: {
          and: [
            { camp: { equals: campId } },
            { status: { in: ['open', 'waitlist'] } },
            { startDate: { greater_than_equal: startOfToday() } },
          ],
        },
        limit: 50,
        sort: 'startDate',
        depth: 0,
      })
      return docs
    },
    [],
  )
}

/** A related entry arrives as an object or as a bare id (at depth: 0). */
export function asCourse(value: Session['course']): Course | null {
  return value && typeof value === 'object' ? value : null
}

export function asCamp(value: Session['camp']): Camp | null {
  return value && typeof value === 'object' ? value : null
}

// --- News --------------------------------------------------------------------

/**
 * Posts for the list.
 *
 * `where` filters out texts dated in the future: Payload has drafts, but the
 * publication date also serves to schedule a post for later, and without this
 * filter a scheduled text would be visible immediately.
 */
export function getPosts(limit = 50): Promise<Post[]> {
  return withPayloadSafe(
    'posts',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'posts',
        where: { publishedAt: { less_than_equal: new Date().toISOString() } },
        limit,
        sort: '-publishedAt',
        depth: 1,
      })
      return docs
    },
    [],
  )
}

export function getPost(slug: string): Promise<Post | null> {
  return withPayloadSafe(
    `post/${slug}`,
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'posts',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 1,
      })
      return docs[0] ?? null
    },
    null,
  )
}

// --- Testimonials ------------------------------------------------------------

/** Only those marked published — a testimonial is someone else's statement. */
export function getTestimonials(): Promise<Testimonial[]> {
  return withPayloadSafe(
    'testimonials',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'testimonials',
        where: { published: { equals: true } },
        limit: 100,
        sort: 'order',
        depth: 0,
      })
      return docs
    },
    [],
  )
}

// --- Instructors -------------------------------------------------------------

export function getInstructors(): Promise<Instructor[]> {
  return withPayloadSafe(
    'instructors',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'instructors',
        limit: 50,
        sort: 'order',
        depth: 1,
      })
      return docs
    },
    [],
  )
}

export function getAboutPage(): Promise<AboutPage | null> {
  return withPayloadSafe(
    'about-page',
    (payload) => payload.findGlobal({ slug: 'about-page', depth: 1 }),
    null,
  )
}

export function getEnglishPage(): Promise<EnglishPage | null> {
  return withPayloadSafe(
    'english-page',
    (payload) => payload.findGlobal({ slug: 'english-page', depth: 1 }),
    null,
  )
}

// --- Gallery -----------------------------------------------------------------

/**
 * Photos ticked for the gallery page, newest first.
 *
 * Sorted by `createdAt`, not `updatedAt`: "newest" means newly taken and
 * uploaded, and correcting a description years later must not shove an old
 * photo back to the front of the gallery.
 *
 * `depth: 0` because nothing here points anywhere else — the photos ARE the
 * content of this page.
 */
export function getGalleryImages(limit = 200): Promise<Image[]> {
  return withPayloadSafe(
    'gallery',
    async (payload) => {
      const { docs } = await payload.find({
        collection: 'media',
        where: { showInGallery: { equals: true } },
        limit,
        sort: '-createdAt',
        depth: 0,
      })
      return docs
    },
    [],
  )
}
