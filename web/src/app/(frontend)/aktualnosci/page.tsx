import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { getPosts, asImage } from '@/lib/content'
import {
  formatCategory,
  POST_CATEGORIES,
  pluralPl,
  focalPosition,
  croppedSource,
} from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Filters } from '@/components/Filters'
import { PostCard, PostMeta } from '@/components/PostCard'
import { Button, Badge, Container, ImagePlaceholder } from '@/components/Ui'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Aktualności',
    description:
      'Co się dzieje w szkole i na Jurze: otwarcia zapisów, relacje z kursów, historia rejonu i poradniki przed pierwszym wyjściem w skały.',
    path: '/aktualnosci',
  })
}

const FILTER_OPTIONS = [{ value: 'all', label: 'Wszystkie' }, ...POST_CATEGORIES]

type Props = { searchParams: Promise<{ topic?: string }> }

export default async function NewsPage({ searchParams }: Props) {
  const { topic = 'all' } = await searchParams
  const all = await getPosts()

  const posts = topic === 'all' ? all : all.filter((w) => w.category === topic)

  // The featured post only on the unfiltered view — on a narrowed list,
  // pulling one text to the top is confusing, because it does not follow from
  // the choice.
  const featured = topic === 'all' ? posts.find((post) => post.featured) : undefined
  const others = featured ? posts.filter((post) => post.id !== featured.id) : posts

  return (
    <main>
      <Container className="pb-8 pt-8">
        <Breadcrumbs trail={[{ label: 'Start', href: '/' }, { label: 'Aktualności' }]} />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Aktualności
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Co się dzieje w szkole i na Jurze: otwarcia zapisów, relacje z kursów, historia rejonu i
          rzeczy, które warto wiedzieć przed pierwszym wyjściem w skały.
        </p>
      </Container>

      <Container>
        <Filters
          label="Temat:"
          options={FILTER_OPTIONS}
          active={topic}
          baseHref="/aktualnosci"
          param="topic"
          summary={`${posts.length} ${pluralPl(posts.length, 'wpis', 'wpisy', 'wpisów')}`}
        />
      </Container>

      <Container className="py-10">
        {posts.length === 0 ? (
          <p className="text-rock-600">
            {all.length === 0
              ? 'Wpisy pojawią się tutaj po dodaniu ich w panelu.'
              : 'W tym temacie nie ma jeszcze wpisów.'}
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {featured && <FeaturedPost post={featured} />}

            {others.length > 0 && (
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {others.map((post) => (
                  <li key={post.id} className="flex">
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Container>
    </main>
  )
}

function FeaturedPost({ post }: { post: Awaited<ReturnType<typeof getPosts>>[number] }) {
  const cover = asImage(post.cover)
  const coverSource = cover && croppedSource(cover)
  const category = formatCategory(post.category)

  return (
    <article className="grid overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)] lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-7 lg:p-10">
        <div className="flex flex-wrap gap-2">
          <Badge tone="dark">Najnowsze</Badge>
          {category && <Badge>{category}</Badge>}
        </div>
        <h2 className="text-[28px] leading-tight lg:text-[36px]">
          <Link href={`/aktualnosci/${post.slug}`} className="text-rock-900 hover:text-rope">
            {post.title}
          </Link>
        </h2>
        {post.lead && <p className="text-[16px] leading-7 text-rock-600">{post.lead}</p>}
        <PostMeta post={post} withAuthor />
        <div className="mt-2">
          <Button href={`/aktualnosci/${post.slug}`} withArrow>
            Czytaj dalej
          </Button>
        </div>
      </div>

      {cover?.url && coverSource ? (
        <Image
          // Half the container on desktop, well past 750px on a retina screen,
          // so landscape covers come from the original. A portrait one would be
          // cropped to a strip here — croppedSource() caps it at `medium`.
          src={coverSource.url}
          alt={cover.alt ?? ''}
          width={coverSource.width}
          height={coverSource.height}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="h-full min-h-[240px] w-full object-cover"
          style={{ objectPosition: focalPosition(cover) }}
        />
      ) : (
        <ImagePlaceholder caption="Zdjęcie · archiwum szkoły" height="min-h-[240px] h-full" />
      )}
    </article>
  )
}
