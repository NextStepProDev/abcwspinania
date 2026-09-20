import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'

import { getCamp, getCamps, getTermsForCamp, getUstawienia, telHref } from '@/lib/content'
import { formatCena, formatWiek, formatZakresDat, formatWolneMiejsca, odmien } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { OkruszkiJasne } from '@/components/Okruszki'
import { Ptaszek } from '@/components/Ikony'
import { Przycisk, Odznaka, Kontener } from '@/components/Ui'
import { TloGorskie } from '@/components/TloGorskie'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const obozy = await getCamps()
  return obozy.map((o) => ({ slug: o.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const oboz = await getCamp(slug)
  if (!oboz)
    return pageMetadata({ title: 'Nie znaleziono', description: '', path: `/obozy/${slug}` })

  return pageMetadata({
    title: oboz.title,
    description: oboz.summary ?? `${oboz.title} — ABC Wspinania.`,
    path: `/obozy/${oboz.slug}`,
  })
}

export default async function StronaObozu({ params }: Props) {
  const { slug } = await params
  const oboz = await getCamp(slug)
  if (!oboz) notFound()

  const [terminy, ustawienia] = await Promise.all([getTermsForCamp(oboz.id), getUstawienia()])
  const tel = telHref(ustawienia)
  const wiek = formatWiek(oboz.wiekOd, oboz.wiekDo)

  const fakty = [
    oboz.czas && { etykieta: 'Czas trwania', wartosc: oboz.czas },
    wiek && { etykieta: 'Wiek', wartosc: wiek },
    oboz.grupaMax && {
      etykieta: 'Grupa',
      wartosc: `do ${oboz.grupaMax} ${odmien(oboz.grupaMax, 'osoby', 'osób', 'osób')}`,
    },
    oboz.miejsce && { etykieta: 'Miejsce', wartosc: oboz.miejsce },
  ].filter(Boolean) as { etykieta: string; wartosc: string }[]

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-rock-950">
        <TloGorskie wariant="niski" />
        <div className="absolute inset-0 bg-rock-950/65" />
        <Kontener className="relative flex flex-col gap-4 py-12 lg:py-16">
          <OkruszkiJasne
            sciezka={[
              { etykieta: 'Start', href: '/' },
              { etykieta: 'Obozy i wyjazdy', href: '/obozy' },
              { etykieta: oboz.title },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {wiek && <Odznaka ton="ciemna">{wiek}</Odznaka>}
            {oboz.poziom === 'zaawansowany' && <Odznaka ton="naCiemnym">po kursie</Odznaka>}
          </div>
          <h1 className="max-w-[860px] text-balance text-[34px] leading-[1.03] text-white lg:text-[52px]">
            {oboz.title}
          </h1>
          {oboz.summary && (
            <p className="max-w-[640px] text-[17px] leading-7 text-rock-fg-strong">
              {oboz.summary}
            </p>
          )}
        </Kontener>
      </section>

      <Kontener className="grid gap-10 py-12 lg:grid-cols-[1fr_360px] lg:gap-14 lg:py-16">
        <div className="flex flex-col gap-12">
          {fakty.length > 0 && (
            <dl className="grid grid-cols-2 gap-5 rounded-xl border border-rock-100 bg-white p-6 lg:grid-cols-4">
              {fakty.map((f) => (
                <div key={f.etykieta}>
                  <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-600">
                    {f.etykieta}
                  </dt>
                  <dd className="mt-1.5 font-semibold">{f.wartosc}</dd>
                </div>
              ))}
            </dl>
          )}

          {oboz.description && (
            <section className="tresc-bogata">
              <RichText data={oboz.description} />
            </section>
          )}

          {oboz.atrakcje && oboz.atrakcje.length > 0 && (
            <section>
              <h2 className="mb-4 text-[28px] leading-tight lg:text-[32px]">Co w programie</h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {oboz.atrakcje.map((a, i) => (
                  <li key={a.id ?? i} className="flex gap-2.5 text-[15px] leading-6">
                    <Ptaszek rozmiar={17} className="mt-0.5 shrink-0 text-rope" />
                    {a.pozycja}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {oboz.planDnia && oboz.planDnia.length > 0 && (
            <section>
              <h2 className="mb-5 text-[28px] leading-tight lg:text-[32px]">Jak wygląda dzień</h2>
              <ol className="flex flex-col gap-4">
                {oboz.planDnia.map((p, i) => (
                  <li
                    key={p.id ?? i}
                    className="flex flex-col gap-3 rounded-xl border border-rock-100 bg-white p-5 sm:flex-row sm:gap-6"
                  >
                    <span className="shrink-0 self-start rounded-md bg-rock-100 px-3 py-1.5 text-[13px] font-semibold tabular-nums text-rock-600">
                      {p.godzina}
                    </span>
                    <div>
                      <h3 className="text-[17px] font-semibold">{p.tytul}</h3>
                      {p.opis && (
                        <p className="mt-1.5 text-[15px] leading-6 text-rock-600">{p.opis}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-5 rounded-2xl border border-rock-100 bg-white p-6 shadow-[0_4px_16px_rgba(42,38,32,0.08)]">
            <div>
              <div className="text-[13px] uppercase tracking-[0.04em] text-rock-600">Cena</div>
              <div className="mt-1 text-[30px] font-semibold tabular-nums">
                {formatCena(oboz.cena, oboz.cenaOd)}
                {oboz.jednostkaCeny && (
                  <span className="ml-1 text-[15px] font-normal text-rock-600">
                    {oboz.jednostkaCeny}
                  </span>
                )}
              </div>
              {(oboz.nocleg || oboz.wyzywienie) && (
                <div className="mt-1 text-[13px] text-rock-600">
                  {[oboz.nocleg && 'nocleg', oboz.wyzywienie && 'wyżywienie']
                    .filter(Boolean)
                    .join(' i ')}{' '}
                  w cenie
                </div>
              )}
            </div>

            {terminy.length > 0 && (
              <div>
                <h2 className="mb-3 text-[15px] font-semibold">Turnusy</h2>
                <ul className="flex flex-col gap-2">
                  {terminy.map((t) => {
                    const brak = t.status === 'brak-miejsc' || (t.wolneMiejsca ?? 1) <= 0
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-rock-100 px-3.5 py-2.5"
                      >
                        <span className="text-sm font-medium tabular-nums">
                          {formatZakresDat(t.dataOd, t.dataDo)}
                        </span>
                        <span
                          className={`shrink-0 text-[13px] ${brak ? 'text-rock-400' : 'text-wolne-text'}`}
                        >
                          {brak ? 'brak miejsc' : formatWolneMiejsca(t.wolneMiejsca)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <Przycisk href={`/kontakt?oboz=${oboz.slug}`} className="w-full">
                Zapytaj o miejsce
              </Przycisk>
              {tel && (
                <Przycisk href={tel} wariant="obrys" className="w-full">
                  {ustawienia.telefon}
                </Przycisk>
              )}
            </div>
          </div>
        </aside>
      </Kontener>
    </main>
  )
}
