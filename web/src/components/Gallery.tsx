import Image from 'next/image'
import Link from 'next/link'

import type { GalleryPhoto as Photo } from '@/lib/content'
import { GALLERY_PATH, photoHref, tileDomId } from '@/lib/gallery'
import { Arrow, Close } from '@/components/Icons'

/**
 * The grid.
 *
 * `columns` rather than a grid, the same trick as on /opinie: photos arrive in
 * mixed portrait and landscape, and in a grid row the tallest one dictates the
 * height of the rest. Here each keeps its own proportions, so nothing is cropped
 * and nothing is padded.
 *
 * Tiles are ordinary links. The full-screen view is a state of the ADDRESS, not
 * of the browser, so it works with JavaScript switched off and a single photo
 * can be sent to someone.
 *
 * Expects photos that HAVE a file: a record without one would yield an <Image>
 * with an empty `src`, which Next refuses. The page filters them out before
 * calling this.
 */
export function GalleryGrid({ photos }: { photos: Photo[] }) {
  return (
    <ul className="gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {photos.map((photo, index) => {
        const medium = photo.sizes?.medium

        return (
          <li key={photo.id}>
            <Link
              id={tileDomId(photo.id)}
              href={photoHref(photo.id)}
              scroll={false}
              className="block overflow-hidden rounded-xl border border-rock-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rope"
            >
              <Image
                src={medium?.url ?? photo.url!}
                alt={photo.alt ?? ''}
                width={medium?.width ?? photo.width ?? 750}
                height={medium?.height ?? photo.height ?? 500}
                // Explicit `sizes` — a deliberate departure from the rest of the
                // site, earned by the multiplier: a tile renders far narrower
                // than 750px, and without this every one of fifty photos would
                // pull the widest candidate.
                sizes="(min-width: 1280px) 23vw, (min-width: 1024px) 31vw, (min-width: 640px) 47vw, 94vw"
                // Only the very first one is eager. In a `columns` layout the
                // DOM order runs DOWN the first column, not across the top row,
                // so "the first four" would eagerly fetch photos below the fold
                // while the tops of the other columns — which ARE on screen —
                // stayed lazy. Which items those are depends on the viewport,
                // so the server cannot know them. The rest keep Next's default
                // lazy loading; `priority` is deprecated in Next 16.
                loading={index === 0 ? 'eager' : undefined}
                className="h-auto w-full transition-opacity hover:opacity-90"
              />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The full-screen view, rendered on the server.
 *
 * Every control is a real link, so closing and paging work without JavaScript.
 * Keyboard handling, the focus trap and the scroll lock live in the client
 * wrapper around this — those are the only parts HTML cannot do by itself.
 */
export function GalleryLightbox({
  photo,
  previousHref,
  nextHref,
  position,
  total,
}: {
  photo: Photo
  previousHref: string | null
  nextHref: string | null
  position: number
  total: number
}) {
  const controlClass =
    'flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

  return (
    <>
      <div className="flex w-full items-center justify-between gap-4">
        <p className="text-sm text-white/80">
          {position} z {total}
        </p>
        <Link
          href={GALLERY_PATH}
          scroll={false}
          className={controlClass}
          aria-label="Zamknij zdjęcie"
        >
          <Close size={20} />
        </Link>
      </div>

      <div className="flex w-full flex-1 items-center justify-center gap-3 py-4">
        {previousHref && (
          <Link
            href={previousHref}
            scroll={false}
            className={`${controlClass} shrink-0`}
            aria-label="Poprzednie zdjęcie"
          >
            <Arrow size={20} className="rotate-180" />
          </Link>
        )}

        <Image
          src={photo.url!}
          alt={photo.alt ?? ''}
          width={photo.width ?? 1600}
          height={photo.height ?? 1200}
          // The ORIGINAL, resized on demand by the Next image optimiser (it is
          // enabled for /api/media/file/** and caches for 30 days). Deliberately
          // not a second Payload variant: that cost would land during upload,
          // which is exactly where sharp on a small ARM machine once stalled.
          // No `quality` — Next 16 allows only 75 unless configured otherwise.
          sizes="100vw"
          loading="eager"
          className="max-h-[80vh] w-auto object-contain"
        />

        {nextHref && (
          <Link
            href={nextHref}
            scroll={false}
            className={`${controlClass} shrink-0`}
            aria-label="Następne zdjęcie"
          >
            <Arrow size={20} />
          </Link>
        )}
      </div>
    </>
  )
}
