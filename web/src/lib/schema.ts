import type { Course, SiteConfig } from '@/payload-types'
import { BRAND, SITE_URL } from '@/lib/site'

/**
 * schema.org structured data.
 *
 * For a business operating locally this is the cheapest thing that can be done
 * for visibility in search and in maps, so it goes in from day one.
 *
 * `SportsActivityLocation` is narrower than `LocalBusiness` and a better fit for
 * a climbing school.
 *
 * The data comes from the `site-config` global, and every field is attached
 * CONDITIONALLY — Google prefers a missing field to an empty one, and the global
 * may not be filled in yet, or the database may be unreachable at build time.
 */
export function organizationSchema(config: SiteConfig) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: BRAND,
    url: SITE_URL,
  }

  if (config.legalName) schema.legalName = config.legalName

  // The address is attached IN FULL or not at all. A partial `PostalAddress`
  // (just the town, no street) does not help in maps, yet looks complete in the
  // data — and nobody would notice something is missing.
  if (config.street && config.postalCode && config.city) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: config.street,
      postalCode: config.postalCode,
      addressLocality: config.city,
      addressCountry: 'PL',
    }
  }

  if (config.phone) schema.telephone = config.phoneE164 || config.phone
  if (config.email) schema.email = config.email

  const profiles = [config.facebook, config.youtube].filter(Boolean)
  if (profiles.length > 0) schema.sameAs = profiles

  return schema
}

/**
 * Serialisation for embedding in `<script type="application/ld+json">`.
 * `</` is broken up in case content from the CMS contains `</script>` —
 * otherwise the browser would close the tag in the middle of the data.
 */
export function jsonLd(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

/**
 * Schema for a single course.
 *
 * schema.org's `Course` requires a `provider`, otherwise Google treats the entry
 * as incomplete and skips it in rich results. The price is attached only when it
 * is in the CMS — a course without a price is "quoted individually", not free,
 * and putting a zero there would be misleading.
 */
export function courseSchema(course: Course) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    url: `${SITE_URL}/kursy/${course.slug}`,
    provider: {
      '@type': 'Organization',
      name: BRAND,
      url: SITE_URL,
    },
  }

  if (course.summary) schema.description = course.summary

  if (typeof course.price === 'number') {
    schema.offers = {
      '@type': 'Offer',
      price: course.price,
      priceCurrency: 'PLN',
      url: `${SITE_URL}/kursy/${course.slug}`,
    }
  }

  return schema
}
