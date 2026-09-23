import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { getPost, getPosts, asImage } from '@/lib/content'
import { readingTime, formatDate, formatCategory, tableOfContents } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { jsonLd } from '@/lib/schema'
import { SITE_URL, BRAND } from '@/lib/site'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PostCard } from '@/components/PostCard'
import { PostContent } from '@/components/PostContent'
import { Badge, Container } from '@/components/Ui'
import { MountainBackdrop } from '@/components/MountainBackdrop'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((w) => ({ slug: w.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post)
    return pageMetadata({
      title: 'Nie znaleziono wpisu',
      description: '',
      path: `/aktualnosci/${slug}`,
    })

  return pageMetadata({
    title: post.title,
    description: post.lead ?? `${post.title} — ${BRAND}.`,
    path: `/aktualnosci/${post.slug}`,
  })
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const all = await getPosts()
  const category = formatCategory(post.category)
  const toc = tableOfContents(post.content)
  const cover = asImage(post.cover)
  const medium = cover?.sizes?.medium

  // "Read next": same category first, then anything — so the section is not
  // empty while there are few posts.
  const rest = all.filter((other) => other.id !== post.id)
  const related = [
    ...rest.filter((w) => w.category === post.category),
    ...rest.filter((w) => w.category !== post.category),
  ].slice(0, 3)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    url: `${SITE_URL}/aktualnosci/${post.slug}`,
    ...(post.lead ? { description: post.lead } : {}),
    ...(post.author ? { author: { '@type': 'Person', name: post.author } } : {}),
    publisher: { '@type': 'Organization', name: BRAND, url: SITE_URL },
  }

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-rock-950">
        <MountainBackdrop variant="short" />
        <div className="absolute inset-0 bg-rock-950/65" />
        <Container className="relative flex flex-col gap-4 py-12 lg:py-16">
          <Breadcrumbs
            variant="onDark"
            trail={[
              { label: 'Start', href: '/' },
              { label: 'Aktualności', href: '/aktualnosci' },
              { label: post.title },
            ]}
          />
          {category && (
            <span className="self-start">
              <Badge tone="dark">{category}</Badge>
            </span>
          )}
          <h1 className="max-w-[860px] text-balance text-[32px] leading-[1.05] text-white lg:text-[48px]">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-rock-fg">
            {post.author && (
              <>
                <span className="font-medium text-white">{post.author}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <time dateTime={post.publishedAt.slice(0, 10)}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{readingTime(post.content)} min czytania</span>
          </div>
        </Container>
      </section>

      <Container className="grid gap-10 py-12 lg:grid-cols-[240px_1fr] lg:gap-16 lg:py-16">
        {/* Spis treści składany z nagłówków w treści — nie ma go w panelu,
            więc nie może się rozjechać z tekstem. */}
        {toc.length > 1 ? (
          <nav aria-label="Spis treści" className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-rock-600">
              W tym tekście
            </h2>
            <ul className="flex flex-col gap-2 border-l border-rock-200 pl-4">
              {toc.map((p) => (
                <li key={p.id}>
                  <a href={`#${p.id}`} className="text-[15px] text-rock-600 hover:text-rope">
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div aria-hidden="true" className="hidden lg:block" />
        )}

        <article className="max-w-[720px]">
          {cover?.url && (
            <Image
              src={medium?.url ?? cover.url}
              alt={cover.alt ?? ''}
              width={medium?.width ?? cover.width ?? 750}
              height={medium?.height ?? cover.height ?? 500}
              className="mb-8 w-full rounded-xl object-cover"
              priority
            />
          )}

          {post.lead && <p className="mb-7 text-[19px] leading-8 text-rock-700">{post.lead}</p>}

          {post.content && <PostContent content={post.content} />}

          {post.author && (
            <div className="mt-10 flex gap-4 rounded-2xl border border-rock-100 bg-white p-6">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rope text-lg font-semibold text-white"
              >
                {post.author.charAt(0)}
              </span>
              <div>
                <h2 className="text-[17px] font-semibold">{post.author}</h2>
                <p className="mt-1 text-[15px] leading-6 text-rock-600">
                  Instruktor wspinaczki skalnej PZA, prowadzi ABC Wspinania.
                </p>
              </div>
            </div>
          )}
        </article>
      </Container>

      {related.length > 0 && (
        <Container className="pb-16 lg:pb-24">
          <h2 className="mb-8 text-[28px] leading-[1.05] lg:text-[36px]">Czytaj dalej</h2>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {related.map((w) => (
              <li key={w.id} className="flex">
                <PostCard post={w} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </main>
  )
}
