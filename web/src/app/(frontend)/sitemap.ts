import type { MetadataRoute } from 'next'

import { getCourses } from '@/lib/content'
import { SITE_URL } from '@/lib/site'

/**
 * Mapa strony generowana z kodu i z CMS-a, nie wgrywana ręcznie — mapa starej
 * strony miała `lastmod` z 2021 roku i duplikaty adresów z „www" i bez.
 *
 * Kursy dochodzą automatycznie: dodanie kursu w panelu dopisuje go do mapy
 * przy najbliższej rewalidacji, bez pamiętania o niczym.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await getCourses()

  const statyczne: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    {
      url: `${SITE_URL}/kontakt`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
  ]

  const zKursow: MetadataRoute.Sitemap = courses.map((kurs) => ({
    url: `${SITE_URL}/kursy/${kurs.slug}`,
    // Prawdziwa data zmiany wpisu, a nie „dzisiaj" wpisane na sztywno.
    lastModified: new Date(kurs.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...statyczne, ...zKursow]
}
