import Image from 'next/image'
import Link from 'next/link'

import type { Post } from '@/lib/content'
import { asImage } from '@/lib/content'
import { readingTime, formatDate, formatCategory, focalPosition } from '@/lib/format'
import { Badge, ImagePlaceholder } from './Ui'

/** Post byline: date and reading time. Repeats in four places. */
export function PostMeta({ post, withAuthor }: { post: Post; withAuthor?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-rock-600">
      {withAuthor && post.author && (
        <>
          <span>{post.author}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <time dateTime={post.publishedAt.slice(0, 10)}>{formatDate(post.publishedAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{readingTime(post.content)} min</span>
    </div>
  )
}

export function PostCard({ post }: { post: Post }) {
  const cover = asImage(post.cover)
  const medium = cover?.sizes?.medium
  const category = formatCategory(post.category)

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
      {cover?.url ? (
        <Image
          src={medium?.url ?? cover.url}
          alt={cover.alt ?? ''}
          width={medium?.width ?? cover.width ?? 750}
          height={medium?.height ?? cover.height ?? 500}
          className="h-[170px] w-full border-b border-rock-200 object-cover"
          style={{ objectPosition: focalPosition(cover) }}
        />
      ) : (
        <ImagePlaceholder caption="Zdjęcie" height="h-[170px]" />
      )}

      <div className="flex grow flex-col gap-3 p-6">
        {category && (
          <span className="self-start">
            <Badge tone={post.category === 'school-life' ? 'accent' : 'neutral'}>{category}</Badge>
          </span>
        )}
        <h3 className="text-xl font-semibold leading-tight tracking-[-0.01em]">
          <Link href={`/aktualnosci/${post.slug}`} className="text-rock-900 hover:text-rope">
            {post.title}
          </Link>
        </h3>
        {post.lead && <p className="grow text-[15px] leading-6 text-rock-600">{post.lead}</p>}
        <div className="mt-auto border-t border-rock-100 pt-3">
          <PostMeta post={post} />
        </div>
      </div>
    </article>
  )
}
