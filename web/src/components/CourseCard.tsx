import Image from 'next/image'
import Link from 'next/link'

import type { Course } from '@/lib/content'
import { asImage } from '@/lib/content'
import { formatPriceLabel, formatLevel, focalPosition } from '@/lib/format'
import { Badge, ImagePlaceholder } from './Ui'

/**
 * A course card on the grid (homepage, course list).
 *
 * The TITLE is the link, not the whole card. A screen reader then announces a
 * meaningful link name instead of "link, link, link", and a visitor can select
 * the description text without accidentally navigating away.
 */
export function CourseCard({ course }: { course: Course }) {
  const cover = asImage(course.cover)
  const medium = cover?.sizes?.medium
  const level = formatLevel(course.level)

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border-t-[3px] border-t-banner bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
      {cover?.url ? (
        <Image
          src={medium?.url ?? cover.url}
          alt={cover.alt ?? ''}
          width={medium?.width ?? cover.width ?? 750}
          height={medium?.height ?? cover.height ?? 500}
          className="h-[156px] w-full border-b border-rock-200 object-cover"
          style={{ objectPosition: focalPosition(cover) }}
        />
      ) : (
        <ImagePlaceholder caption="Zdjęcie · skała" height="h-[156px]" />
      )}

      <div className="flex grow flex-col gap-3 p-[22px]">
        <div className="flex flex-wrap gap-2">
          {course.featured && <Badge tone="accent">Najpopularniejszy</Badge>}
          {level && <Badge>{level}</Badge>}
        </div>

        <h3 className="text-[19px] font-semibold leading-tight tracking-[-0.01em]">
          <Link href={`/kursy/${course.slug}`} className="text-rock-900 hover:text-rope">
            {course.title}
          </Link>
        </h3>

        {course.summary && (
          <p className="grow text-sm leading-[21px] text-rock-600">{course.summary}</p>
        )}

        <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-rock-100 pt-3">
          <span className="text-[17px] font-semibold tabular-nums">
            {formatPriceLabel(course.price, course.priceFrom)}
          </span>
          {course.duration && <span className="text-[13px] text-rock-600">{course.duration}</span>}
        </div>
      </div>
    </article>
  )
}
