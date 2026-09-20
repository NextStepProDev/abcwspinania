import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { getCourses, getUpcomingTerms, asImage } from '@/lib/content'
import { formatCena, formatLevel, formatZakresKrotki, odmien, POZIOMY } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Okruszki } from '@/components/Okruszki'
import { Filtry } from '@/components/Filtry'
import { Ptaszek, Zegar, Ludzie, Certyfikat, Pinezka } from '@/components/Ikony'
import { Przycisk, Odznaka, Kontener, MiejsceNaZdjecie } from '@/components/Ui'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Kursy wspinaczki',
    description:
      'Kursy wspinaczki skalnej według programu PZA: pełny kurs skałkowy, drogi ubezpieczone, asekuracja tradycyjna, ścianka i szkolenia indywidualne.',
    // Canonical BEZ parametru filtra — odfiltrowane widoki mają tę samą treść
    // w innej kolejności i nie ma powodu, żeby konkurowały w indeksie.
    path: '/kursy',
  })
}

const FILTRY = [
  { wartosc: 'wszystkie', etykieta: 'Wszystkie' },
  ...POZIOMY.map((p) => ({ wartosc: p.wartosc, etykieta: p.etykieta })),
]

type Props = { searchParams: Promise<{ poziom?: string }> }

export default async function StronaKursow({ searchParams }: Props) {
  const { poziom: wybrany = 'wszystkie' } = await searchParams
  const [wszystkie, terminy] = await Promise.all([getCourses(), getUpcomingTerms()])

  const kursy = wybrany === 'wszystkie' ? wszystkie : wszystkie.filter((k) => k.level === wybrany)

  // Najbliższy termin dla każdego kursu — terminy przychodzą już posortowane
  // rosnąco, więc pierwszy trafiony jest tym właściwym.
  const najblizszy = new Map<number, string>()
  for (const t of terminy) {
    const id = typeof t.kurs === 'object' ? t.kurs?.id : t.kurs
    if (typeof id === 'number' && !najblizszy.has(id)) {
      najblizszy.set(id, formatZakresKrotki(t.dataOd, t.dataDo))
    }
  }

  return (
    <main>
      <Kontener className="pb-8 pt-8">
        <Okruszki sciezka={[{ etykieta: 'Start', href: '/' }, { etykieta: 'Kursy' }]} />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Kursy wspinaczki
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Od pierwszego dotknięcia skały po samodzielne zakładanie asekuracji. Wszystkie prowadzone
          według programu Polskiego Związku Alpinizmu, w grupach do czterech osób na instruktora.
        </p>
      </Kontener>

      <Kontener>
        <Filtry
          etykieta="Poziom:"
          filtry={FILTRY}
          aktywny={wybrany}
          bazowyHref="/kursy"
          parametr="poziom"
          podsumowanie={`${kursy.length} ${odmien(kursy.length, 'kurs', 'kursy', 'kursów')}`}
        />
      </Kontener>

      <Kontener className="py-10">
        {kursy.length === 0 ? (
          <p className="text-rock-600">
            {wszystkie.length === 0
              ? 'Oferta kursów pojawi się tutaj po dodaniu jej w panelu.'
              : 'Na tym poziomie nie mamy teraz kursu. Zobacz pozostałe albo napisz — dobierzemy coś pod Ciebie.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-6">
            {kursy.map((kurs) => {
              const cover = asImage(kurs.cover)
              const medium = cover?.sizes?.medium
              const poziomEtykieta = formatLevel(kurs.level)
              const termin = najblizszy.get(kurs.id)

              return (
                <li key={kurs.id}>
                  <article className="grid overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)] lg:grid-cols-[260px_1fr_260px]">
                    {cover?.url ? (
                      <Image
                        src={medium?.url ?? cover.url}
                        alt={cover.alt ?? ''}
                        width={medium?.width ?? cover.width ?? 750}
                        height={medium?.height ?? cover.height ?? 500}
                        className="h-48 w-full object-cover lg:h-full"
                      />
                    ) : (
                      <MiejsceNaZdjecie opis="Zdjęcie · skała" wysokosc="h-48 lg:h-full" />
                    )}

                    <div className="flex flex-col gap-3 p-6 lg:p-7">
                      <div className="flex flex-wrap gap-2">
                        {kurs.wyrozniony && <Odznaka ton="akcent">Najpopularniejszy</Odznaka>}
                        {poziomEtykieta && <Odznaka>{poziomEtykieta}</Odznaka>}
                      </div>
                      <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.01em]">
                        <Link
                          href={`/kursy/${kurs.slug}`}
                          className="text-rock-900 hover:text-rope"
                        >
                          {kurs.title}
                        </Link>
                      </h2>
                      {kurs.summary && (
                        <p className="text-[15px] leading-6 text-rock-600">{kurs.summary}</p>
                      )}
                      <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-sm text-rock-600">
                        {kurs.duration && (
                          <li className="flex items-center gap-2">
                            <Zegar rozmiar={15} className="text-rope" />
                            {kurs.duration}
                          </li>
                        )}
                        {kurs.grupaMax && (
                          <li className="flex items-center gap-2">
                            <Ludzie rozmiar={15} className="text-rope" />
                            maks. {kurs.grupaMax} {odmien(kurs.grupaMax, 'osoba', 'osoby', 'osób')}
                          </li>
                        )}
                        {kurs.certyfikat && (
                          <li className="flex items-center gap-2">
                            <Certyfikat rozmiar={15} className="text-rope" />
                            {kurs.certyfikat}
                          </li>
                        )}
                        {kurs.miejsce && (
                          <li className="flex items-center gap-2">
                            <Pinezka rozmiar={15} className="text-rope" />
                            {kurs.miejsce}
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="flex flex-col justify-center gap-2 border-t border-rock-100 p-6 lg:border-l lg:border-t-0 lg:p-7">
                      <span className="text-[22px] font-semibold tabular-nums">
                        {formatCena(kurs.price, kurs.cenaOd)}
                      </span>
                      <span className="text-[13px] text-rock-600">
                        {termin ? `najbliższy termin: ${termin}` : 'termin do uzgodnienia'}
                      </span>
                      <div className="mt-2">
                        <Przycisk href={`/kursy/${kurs.slug}`}>Szczegóły kursu</Przycisk>
                      </div>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </Kontener>

      {/* --- Cennik zbiorczy --- */}
      {wszystkie.length > 0 && (
        <Kontener className="pb-16 lg:pb-24">
          <h2 className="text-[32px] leading-[1.05] lg:text-[44px]">Cennik</h2>
          <p className="mt-3 max-w-[680px] text-[17px] leading-7 text-rock-600">
            Podane kwoty to koszt szkolenia. Nie obejmują noclegu, wyżywienia ani dojazdu — ale mamy
            własną bazę w Rzędkowicach, więc nie trzeba szukać kwatery.
          </p>

          <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
            <table className="w-full min-w-[640px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-rock-100 text-left">
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Kurs
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Czas
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Grupa
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Zaświadczenie
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-right text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Cena
                  </th>
                </tr>
              </thead>
              <tbody>
                {wszystkie.map((k) => (
                  <tr key={k.id} className="border-b border-rock-100 last:border-0">
                    <td className="px-6 py-4">
                      <Link
                        href={`/kursy/${k.slug}`}
                        className="font-medium text-rock-900 hover:text-rope"
                      >
                        {k.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-rock-600">{k.duration ?? '—'}</td>
                    <td className="px-6 py-4 text-rock-600">
                      {k.grupaMax
                        ? `do ${k.grupaMax} ${odmien(k.grupaMax, 'osoby', 'osób', 'osób')}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-rock-600">
                      {k.certyfikat ? (
                        <span className="flex items-center gap-2">
                          <Ptaszek rozmiar={15} className="text-rope" />
                          {k.certyfikat}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums">
                      {formatCena(k.price, k.cenaOd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-rock-100 bg-white p-6">
              <h3 className="text-lg font-semibold">W każdej cenie</h3>
              <p className="mt-2 text-[15px] leading-6 text-rock-600">
                Instruktor z licencją PZA, komplet sprzętu technicznego (uprząż, kask, lina,
                przyrządy), materiały szkoleniowe i zaświadczenie po zaliczeniu.
              </p>
            </div>
            <div className="rounded-xl border border-rock-100 bg-white p-6">
              <h3 className="text-lg font-semibold">Poza ceną</h3>
              <p className="mt-2 text-[15px] leading-6 text-rock-600">
                Nocleg i wyżywienie — w naszej bazie w Rzędkowicach pokoje z łazienkami i wspólna
                kuchnia. Dojazd na miejsce i odzież własna.
              </p>
            </div>
          </div>
        </Kontener>
      )}
    </main>
  )
}
