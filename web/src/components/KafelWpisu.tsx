import Image from 'next/image'
import Link from 'next/link'

import type { Wpis } from '@/lib/content'
import { asImage } from '@/lib/content'
import { czasCzytania, formatData, formatKategoria } from '@/lib/format'
import { Odznaka, MiejsceNaZdjecie } from './Ui'

/** Metryczka wpisu: data i czas czytania. Powtarza się w czterech miejscach. */
export function MetrykaWpisu({ wpis, autor }: { wpis: Wpis; autor?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-rock-600">
      {autor && wpis.autor && (
        <>
          <span>{wpis.autor}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <time dateTime={wpis.publishedAt.slice(0, 10)}>{formatData(wpis.publishedAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{czasCzytania(wpis.tresc)} min</span>
    </div>
  )
}

export function KafelWpisu({ wpis }: { wpis: Wpis }) {
  const cover = asImage(wpis.cover)
  const medium = cover?.sizes?.medium
  const kategoria = formatKategoria(wpis.kategoria)

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
      {cover?.url ? (
        <Image
          src={medium?.url ?? cover.url}
          alt={cover.alt ?? ''}
          width={medium?.width ?? cover.width ?? 750}
          height={medium?.height ?? cover.height ?? 500}
          className="h-[170px] w-full border-b border-rock-200 object-cover"
        />
      ) : (
        <MiejsceNaZdjecie opis="Zdjęcie" wysokosc="h-[170px]" />
      )}

      <div className="flex grow flex-col gap-3 p-6">
        {kategoria && (
          <span className="self-start">
            <Odznaka ton={wpis.kategoria === 'z-zycia-szkoly' ? 'akcent' : 'neutralna'}>
              {kategoria}
            </Odznaka>
          </span>
        )}
        <h3 className="text-xl font-semibold leading-tight tracking-[-0.01em]">
          <Link href={`/aktualnosci/${wpis.slug}`} className="text-rock-900 hover:text-rope">
            {wpis.title}
          </Link>
        </h3>
        {wpis.lead && <p className="grow text-[15px] leading-6 text-rock-600">{wpis.lead}</p>}
        <div className="mt-auto border-t border-rock-100 pt-3">
          <MetrykaWpisu wpis={wpis} />
        </div>
      </div>
    </article>
  )
}
