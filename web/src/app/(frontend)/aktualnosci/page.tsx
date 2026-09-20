import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { getPosts, asImage } from '@/lib/content'
import { formatKategoria, KATEGORIE_WPISOW, odmien } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Okruszki } from '@/components/Okruszki'
import { Filtry } from '@/components/Filtry'
import { KafelWpisu, MetrykaWpisu } from '@/components/KafelWpisu'
import { Przycisk, Odznaka, Kontener, MiejsceNaZdjecie } from '@/components/Ui'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Aktualności',
    description:
      'Co się dzieje w szkole i na Jurze: otwarcia zapisów, relacje z kursów, historia rejonu i poradniki przed pierwszym wyjściem w skały.',
    path: '/aktualnosci',
  })
}

const FILTRY = [{ wartosc: 'wszystkie', etykieta: 'Wszystkie' }, ...KATEGORIE_WPISOW]

type Props = { searchParams: Promise<{ temat?: string }> }

export default async function StronaAktualnosci({ searchParams }: Props) {
  const { temat = 'wszystkie' } = await searchParams
  const wszystkie = await getPosts()

  const wpisy = temat === 'wszystkie' ? wszystkie : wszystkie.filter((w) => w.kategoria === temat)

  // Wyróżniony wpis tylko na widoku bez filtra — przy zawężonej liście
  // wyciąganie jednego tekstu na górę myli, bo nie wynika z wyboru.
  const wyrozniony = temat === 'wszystkie' ? wpisy.find((w) => w.wyrozniony) : undefined
  const pozostale = wyrozniony ? wpisy.filter((w) => w.id !== wyrozniony.id) : wpisy

  return (
    <main>
      <Kontener className="pb-8 pt-8">
        <Okruszki sciezka={[{ etykieta: 'Start', href: '/' }, { etykieta: 'Aktualności' }]} />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Aktualności
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Co się dzieje w szkole i na Jurze: otwarcia zapisów, relacje z kursów, historia rejonu i
          rzeczy, które warto wiedzieć przed pierwszym wyjściem w skały.
        </p>
      </Kontener>

      <Kontener>
        <Filtry
          etykieta="Temat:"
          filtry={FILTRY}
          aktywny={temat}
          bazowyHref="/aktualnosci"
          parametr="temat"
          podsumowanie={`${wpisy.length} ${odmien(wpisy.length, 'wpis', 'wpisy', 'wpisów')}`}
        />
      </Kontener>

      <Kontener className="py-10">
        {wpisy.length === 0 ? (
          <p className="text-rock-600">
            {wszystkie.length === 0
              ? 'Wpisy pojawią się tutaj po dodaniu ich w panelu.'
              : 'W tym temacie nie ma jeszcze wpisów.'}
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {wyrozniony && <WyroznionyWpis wpis={wyrozniony} />}

            {pozostale.length > 0 && (
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pozostale.map((w) => (
                  <li key={w.id} className="flex">
                    <KafelWpisu wpis={w} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Kontener>
    </main>
  )
}

function WyroznionyWpis({ wpis }: { wpis: Awaited<ReturnType<typeof getPosts>>[number] }) {
  const cover = asImage(wpis.cover)
  const medium = cover?.sizes?.medium
  const kategoria = formatKategoria(wpis.kategoria)

  return (
    <article className="grid overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)] lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-7 lg:p-10">
        <div className="flex flex-wrap gap-2">
          <Odznaka ton="ciemna">Najnowsze</Odznaka>
          {kategoria && <Odznaka>{kategoria}</Odznaka>}
        </div>
        <h2 className="text-[28px] leading-tight lg:text-[36px]">
          <Link href={`/aktualnosci/${wpis.slug}`} className="text-rock-900 hover:text-rope">
            {wpis.title}
          </Link>
        </h2>
        {wpis.lead && <p className="text-[16px] leading-7 text-rock-600">{wpis.lead}</p>}
        <MetrykaWpisu wpis={wpis} autor />
        <div className="mt-2">
          <Przycisk href={`/aktualnosci/${wpis.slug}`} zeStrzalka>
            Czytaj dalej
          </Przycisk>
        </div>
      </div>

      {cover?.url ? (
        <Image
          src={medium?.url ?? cover.url}
          alt={cover.alt ?? ''}
          width={medium?.width ?? cover.width ?? 750}
          height={medium?.height ?? cover.height ?? 500}
          className="h-full min-h-[240px] w-full object-cover"
        />
      ) : (
        <MiejsceNaZdjecie opis="Zdjęcie · archiwum szkoły" wysokosc="min-h-[240px] h-full" />
      )}
    </article>
  )
}
