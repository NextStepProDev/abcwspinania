import type { Metadata } from 'next'

import { getOpinions, getUstawienia, telHref } from '@/lib/content'
import { odmien, RODZAJE_OPINII } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Okruszki } from '@/components/Okruszki'
import { Filtry } from '@/components/Filtry'
import { Cytat } from '@/components/Cytat'
import { Przycisk, Kontener } from '@/components/Ui'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Opinie kursantów',
    description:
      'Co piszą osoby, które były na naszych kursach i obozach. Publikujemy wszystkie opinie, także krytyczne.',
    path: '/opinie',
  })
}

const FILTRY = [{ wartosc: 'wszystkie', etykieta: 'Wszystkie' }, ...RODZAJE_OPINII]

type Props = { searchParams: Promise<{ kurs?: string }> }

export default async function StronaOpinii({ searchParams }: Props) {
  const { kurs = 'wszystkie' } = await searchParams
  const [wszystkie, ustawienia] = await Promise.all([getOpinions(), getUstawienia()])
  const tel = telHref(ustawienia)

  const opinie = kurs === 'wszystkie' ? wszystkie : wszystkie.filter((o) => o.czego === kurs)

  return (
    <main>
      <Kontener className="pb-8 pt-8">
        <Okruszki
          sciezka={[
            { etykieta: 'Start', href: '/' },
            { etykieta: 'Kursy', href: '/kursy' },
            { etykieta: 'Opinie' },
          ]}
        />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Opinie kursantów
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Publikujemy wszystkie opinie, które dostajemy — także krytyczne, bo z nich najwięcej
          wynika dla kogoś, kto się dopiero zastanawia. Podpisujemy imieniem i nazwą szkolenia,
          nigdy pełnym nazwiskiem bez zgody.
        </p>
      </Kontener>

      {wszystkie.length > 0 && (
        <Kontener>
          <Filtry
            etykieta="Czego dotyczy:"
            filtry={FILTRY}
            aktywny={kurs}
            bazowyHref="/opinie"
            parametr="kurs"
            podsumowanie={`${opinie.length} ${odmien(opinie.length, 'opinia', 'opinie', 'opinii')}`}
          />
        </Kontener>
      )}

      <Kontener className="py-10">
        {opinie.length === 0 ? (
          <p className="text-rock-600">
            {wszystkie.length === 0
              ? 'Opinie pojawią się tutaj po dodaniu ich w panelu.'
              : 'Dla tego szkolenia nie mamy jeszcze opinii.'}
          </p>
        ) : (
          // `columns` zamiast siatki: opinie mają bardzo różną długość,
          // a w siatce najdłuższa rozpychałaby cały rząd.
          <div className="gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
            {opinie.map((o) => (
              <Cytat key={o.id} opinia={o} />
            ))}
          </div>
        )}
      </Kontener>

      <Kontener className="pb-16 lg:pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-rock-900 p-8 lg:flex-row lg:items-center lg:p-12">
          <div className="max-w-[640px]">
            <h2 className="text-[24px] leading-tight text-white lg:text-[30px]">
              Byłeś na kursie? Napisz, jak było
            </h2>
            <p className="mt-2 text-[16px] leading-7 text-rock-fg">
              Publikujemy w całości, razem z krytyką — z niej wynika najwięcej dla kogoś, kto się
              dopiero zastanawia.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Przycisk href="/kontakt" duzy>
              Dodaj opinię
            </Przycisk>
            {tel && (
              <Przycisk href={tel} wariant="obrysJasny" duzy>
                {ustawienia.telefon}
              </Przycisk>
            )}
          </div>
        </div>
      </Kontener>
    </main>
  )
}
