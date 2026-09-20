import Image from 'next/image'
import Link from 'next/link'

import type { Kurs } from '@/lib/content'
import { asImage } from '@/lib/content'
import { formatCena, formatLevel } from '@/lib/format'
import { Odznaka, MiejsceNaZdjecie } from './Ui'

/**
 * Kafel kursu na siatce (strona główna, lista kursów).
 *
 * Klikalny jest TYTUŁ, nie cały kafel. Czytnik ekranu ogłasza wtedy sensowną
 * nazwę linku zamiast „link, link, link", a użytkownik może zaznaczyć tekst
 * opisu bez przypadkowego przejścia na podstronę.
 */
export function KafelKursu({ kurs }: { kurs: Kurs }) {
  const cover = asImage(kurs.cover)
  const medium = cover?.sizes?.medium
  const poziom = formatLevel(kurs.level)

  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
      {cover?.url ? (
        <Image
          src={medium?.url ?? cover.url}
          alt={cover.alt ?? ''}
          width={medium?.width ?? cover.width ?? 750}
          height={medium?.height ?? cover.height ?? 500}
          className="h-[156px] w-full border-b border-rock-200 object-cover"
        />
      ) : (
        <MiejsceNaZdjecie opis="Zdjęcie · skała" wysokosc="h-[156px]" />
      )}

      <div className="flex grow flex-col gap-3 p-[22px]">
        <div className="flex flex-wrap gap-2">
          {kurs.wyrozniony && <Odznaka ton="akcent">Najpopularniejszy</Odznaka>}
          {poziom && <Odznaka>{poziom}</Odznaka>}
        </div>

        <h3 className="text-[19px] font-semibold leading-tight tracking-[-0.01em]">
          <Link href={`/kursy/${kurs.slug}`} className="text-rock-900 hover:text-rope">
            {kurs.title}
          </Link>
        </h3>

        {kurs.summary && (
          <p className="grow text-sm leading-[21px] text-rock-600">{kurs.summary}</p>
        )}

        <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-rock-100 pt-3">
          <span className="text-[17px] font-semibold tabular-nums">
            {formatCena(kurs.price, kurs.cenaOd)}
          </span>
          {kurs.duration && <span className="text-[13px] text-rock-600">{kurs.duration}</span>}
        </div>
      </div>
    </article>
  )
}
