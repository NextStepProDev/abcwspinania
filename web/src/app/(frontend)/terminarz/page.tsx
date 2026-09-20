import type { Metadata } from 'next'
import Link from 'next/link'

import { getUpcomingTerms, getUstawienia, telHref } from '@/lib/content'
import { formatCena, formatZakresKrotki, grupujPoMiesiacach, odmien } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Okruszki } from '@/components/Okruszki'
import { Filtry } from '@/components/Filtry'
import { opisTerminu, OdznakaMiejsc } from '@/components/Terminy'
import { Przycisk, Kontener } from '@/components/Ui'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Terminarz',
    description:
      'Wszystkie terminy kursów wspinaczkowych i obozów w jednym miejscu. Liczba wolnych miejsc aktualizowana po każdym zapisie.',
    path: '/terminarz',
  })
}

const FILTRY = [
  { wartosc: 'wszystkie', etykieta: 'Wszystko' },
  { wartosc: 'kursy', etykieta: 'Kursy' },
  { wartosc: 'obozy', etykieta: 'Obozy' },
  { wartosc: 'wolne', etykieta: 'Tylko z wolnymi miejscami' },
]

type Props = { searchParams: Promise<{ pokaz?: string }> }

export default async function StronaTerminarza({ searchParams }: Props) {
  const { pokaz = 'wszystkie' } = await searchParams
  const [wszystkie, ustawienia] = await Promise.all([getUpcomingTerms(200), getUstawienia()])
  const tel = telHref(ustawienia)

  const terminy = wszystkie.filter((t) => {
    if (pokaz === 'kursy') return Boolean(t.kurs)
    if (pokaz === 'obozy') return Boolean(t.oboz)
    if (pokaz === 'wolne') return !opisTerminu(t).brakMiejsc
    return true
  })

  const miesiace = grupujPoMiesiacach(terminy)

  return (
    <main>
      <Kontener className="pb-8 pt-8">
        <Okruszki sciezka={[{ etykieta: 'Start', href: '/' }, { etykieta: 'Terminarz' }]} />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Terminarz
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Wszystkie kursy i obozy w jednym miejscu. Liczbę miejsc aktualizujemy po każdym zapisie —
          jeśli nie widzisz pasującego terminu, napisz, przy grupie od trzech osób ustalamy termin
          indywidualnie.
        </p>
      </Kontener>

      <Kontener>
        <Filtry
          etykieta="Pokaż:"
          filtry={FILTRY}
          aktywny={pokaz}
          bazowyHref="/terminarz"
          parametr="pokaz"
          podsumowanie={`${terminy.length} ${odmien(terminy.length, 'termin', 'terminy', 'terminów')}`}
        />
      </Kontener>

      <Kontener className="py-10">
        {miesiace.length === 0 ? (
          <p className="rounded-xl border border-rock-100 bg-white p-6 text-rock-600">
            {wszystkie.length === 0
              ? 'Terminy pojawią się tutaj po dodaniu ich w panelu.'
              : 'Dla tego filtra nie ma terminów. Zobacz wszystkie albo napisz do nas.'}
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {miesiace.map((m) => (
              <section key={m.klucz} aria-labelledby={`m-${m.klucz}`}>
                <h2
                  id={`m-${m.klucz}`}
                  className="mb-4 flex items-center gap-4 text-[22px] lg:text-[26px]"
                >
                  {m.nazwa}
                  <span aria-hidden="true" className="h-px grow bg-rock-200" />
                </h2>

                <ul className="overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
                  {m.pozycje.map((t) => {
                    const o = opisTerminu(t)
                    return (
                      <li
                        key={t.id}
                        className="grid gap-3 border-b border-rock-100 p-5 last:border-0 lg:grid-cols-[172px_1fr_140px_132px_210px] lg:items-center lg:gap-5 lg:px-6"
                      >
                        <span className="font-semibold tabular-nums lg:text-[15px]">
                          {formatZakresKrotki(t.dataOd, t.dataDo)}
                        </span>

                        <span>
                          {o.href ? (
                            <Link
                              href={o.href}
                              className="font-medium text-rock-900 hover:text-rope"
                            >
                              {o.nazwa}
                            </Link>
                          ) : (
                            <span className="font-medium">{o.nazwa}</span>
                          )}
                          {t.uwagi && (
                            <span className="ml-2 text-[13px] text-rock-600">{t.uwagi}</span>
                          )}
                        </span>

                        <span className="text-[14px] text-rock-600">{o.miejsce ?? '—'}</span>

                        <span>
                          <OdznakaMiejsc termin={t} />
                        </span>

                        <span className="flex items-center justify-between gap-3 lg:justify-end">
                          <span className="font-semibold tabular-nums">
                            {formatCena(o.cena, o.cenaOd)}
                          </span>
                          <Przycisk
                            href={`/kontakt?termin=${t.id}`}
                            wariant={o.brakMiejsc ? 'obrys' : 'glowny'}
                          >
                            {o.brakMiejsc ? 'Lista rezerwowa' : 'Zapisz się'}
                          </Przycisk>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Kontener>

      <Kontener className="pb-16 lg:pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-rock-200 bg-white p-8 lg:flex-row lg:items-center lg:p-10">
          <div className="max-w-[640px]">
            <h2 className="text-[24px] leading-tight lg:text-[28px]">Nie pasuje żaden termin?</h2>
            <p className="mt-2 text-[16px] leading-7 text-rock-600">
              Przy grupie od trzech osób ustalamy termin indywidualnie, także w tygodniu. Poza
              sezonem (marzec, kwiecień, październik) terminy i tak uzgadniamy osobno.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Przycisk href="/kontakt" duzy>
              Zaproponuj termin
            </Przycisk>
            {tel && (
              <Przycisk href={tel} wariant="obrys" duzy>
                {ustawienia.telefon}
              </Przycisk>
            )}
          </div>
        </div>
      </Kontener>
    </main>
  )
}
