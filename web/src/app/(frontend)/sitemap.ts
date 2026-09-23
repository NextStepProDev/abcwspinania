import type { MetadataRoute } from 'next'

import { getCourses, getCamps, getPosts } from '@/lib/content'
import { SITE_URL } from '@/lib/site'

/**
 * The sitemap is generated from the code and the CMS rather than uploaded by
 * hand — the old site's map carried a `lastmod` from 2021 and duplicate
 * addresses with and without "www".
 *
 * Courses are added automatically: adding one in the panel puts it in the map at
 * the next revalidation, with nothing to remember.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, camps, posts] = await Promise.all([getCourses(), getCamps(), getPosts(200)])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    {
      url: `${SITE_URL}/kursy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/obozy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      // The schedule changes most often of anything — after every sign-up.
      url: `${SITE_URL}/terminarz`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/aktualnosci`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/o-nas`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/opinie`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    { url: `${SITE_URL}/en`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.6 },
    {
      url: `${SITE_URL}/kontakt`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
  ]

  const courseRoutes: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${SITE_URL}/kursy/${course.slug}`,
    // The entry's real modification date, not a hard-coded "today".
    lastModified: new Date(course.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const campRoutes: MetadataRoute.Sitemap = camps.map((camp) => ({
    url: `${SITE_URL}/obozy/${camp.slug}`,
    lastModified: new Date(camp.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/aktualnosci/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'yearly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...courseRoutes, ...campRoutes, ...postRoutes]
}
