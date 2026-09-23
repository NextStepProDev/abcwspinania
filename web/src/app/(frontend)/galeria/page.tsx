import type { Metadata } from 'next'

import { getGalleryImages } from '@/lib/content'
import { galleryNeighbours, parseGalleryId, photoHref } from '@/lib/gallery'
import { pluralPl } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { GalleryGrid, GalleryLightbox } from '@/components/Gallery'
import { GalleryLightboxBehavior } from '@/components/GalleryLightboxBehavior'
import { Container } from '@/components/Ui'

export function generateMetadata(): Metadata {
  // `canonical` deliberately ignores `?zdjecie` — the same rule the filters
  // follow. Fifty addresses carrying one page of content would otherwise all
  // compete in the index.
  return pageMetadata({
    title: 'Galeria',
    description: 'Zdjęcia z kursów, obozów i wyjazdów w skały Jury Krakowsko-Częstochowskiej.',
    path: '/galeria',
  })
}

type Props = { searchParams: Promise<{ zdjecie?: string }> }

export default async function GalleryPage({ searchParams }: Props) {
  const { zdjecie } = await searchParams

  // A record with no file would render an <Image> with an empty `src`, which
  // Next refuses outright. Filtering here rather than in the query keeps
  // `content.ts` a plain read of the collection.
  const photos = (await getGalleryImages()).filter((photo) => photo.url)

  const ids = photos.map((photo) => photo.id)
  const openId = parseGalleryId(zdjecie, ids)
  const openIndex = openId === null ? -1 : ids.indexOf(openId)
  const openPhoto = openIndex === -1 ? null : photos[openIndex]!

  // `-1` is never a real id, and `galleryNeighbours` answers "no neighbours"
  // for anything it cannot find — so the no-photo-open case needs no branch.
  const { previousId, nextId } = galleryNeighbours(ids, openId ?? -1)
  const previousHref = previousId === null ? null : photoHref(previousId)
  const nextHref = nextId === null ? null : photoHref(nextId)

  return (
    <main>
      <Container className="pb-8 pt-8">
        <Breadcrumbs trail={[{ label: 'Start', href: '/' }, { label: 'Galeria' }]} />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Galeria
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Zdjęcia z kursów, obozów i wyjazdów w skały Jury Krakowsko-Częstochowskiej.
        </p>
        {photos.length > 0 && (
          <p className="mt-3 text-sm text-rock-500">
            {photos.length} {pluralPl(photos.length, 'zdjęcie', 'zdjęcia', 'zdjęć')}
          </p>
        )}
      </Container>

      <Container className="pb-16 lg:pb-24">
        {photos.length === 0 ? (
          <p className="text-rock-600">
            Zdjęcia pojawią się tutaj po zaznaczeniu ich w bibliotece mediów w panelu.
          </p>
        ) : (
          <GalleryGrid photos={photos} />
        )}
      </Container>

      {openPhoto && (
        <GalleryLightboxBehavior
          currentId={openPhoto.id}
          previousHref={previousHref}
          nextHref={nextHref}
        >
          <GalleryLightbox
            photo={openPhoto}
            previousHref={previousHref}
            nextHref={nextHref}
            position={openIndex + 1}
            total={photos.length}
          />
        </GalleryLightboxBehavior>
      )}
    </main>
  )
}
