import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'

import { getCourse, getCourses, getTermsForCourse, getUstawienia, telHref } from '@/lib/content'
import { formatCena, formatLevel, formatZakresDat, formatWolneMiejsca, odmien } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { jsonLd, courseSchema } from '@/lib/schema'
import { Okruszki } from '@/components/Okruszki'
import { Ptaszek, Krzyzyk } from '@/components/Ikony'
import { Przycisk, Odznaka, Kontener } from '@/components/Ui'
import { TloGorskie } from '@/components/TloGorskie'

type Props = { params: Promise<{ slug: string }> }

/**
 * Lista adresów do wygenerowania przy buildzie. Gdy baza jest nieosiągalna
 * (CI), `getCourses()` zwraca pustą listę i Next wyrenderuje te strony
 * na żądanie — build i tak przechodzi.
 */
export async function generateStaticParams() {
  const kursy = await getCourses()
  return kursy.map((kurs) => ({ slug: kurs.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const kurs = await getCourse(slug)
  if (!kurs)
    return pageMetadata({ title: 'Nie znaleziono kursu', description: '', path: `/kursy/${slug}` })

  return pageMetadata({
    title: kurs.title,
    description: kurs.summary ?? `Kurs wspinaczkowy: ${kurs.title}.`,
    path: `/kursy/${kurs.slug}`,
  })
}

export default async function StronaKursu({ params }: Props) {
  const { slug } = await params
  const kurs = await getCourse(slug)
  // 404 zamiast pustej strony — inaczej Google zaindeksowałby adres bez treści.
  if (!kurs) notFound()

  const [terminy, ustawienia] = await Promise.all([getTermsForCourse(kurs.id), getUstawienia()])
  const tel = telHref(ustawienia)
  const poziom = formatLevel(kurs.level)

  const fakty = [
    kurs.duration && { etykieta: 'Czas trwania', wartosc: kurs.duration },
    kurs.grupaMax && {
      etykieta: 'Grupa',
      wartosc: `maks. ${kurs.grupaMax} ${odmien(kurs.grupaMax, 'osoba', 'osoby', 'osób')}`,
    },
    poziom && { etykieta: 'Poziom', wartosc: poziom },
    kurs.miejsce && { etykieta: 'Miejsce', wartosc: kurs.miejsce },
  ].filter(Boolean) as { etykieta: string; wartosc: string }[]

  return (
    <main>
      {/* --- Nagłówek --- */}
      <section className="relative isolate overflow-hidden bg-rock-950">
        <TloGorskie wariant="niski" />
        <div className="absolute inset-0 bg-rock-950/65" />
        <Kontener className="relative flex flex-col gap-4 py-12 lg:py-16">
          <Okruszki
            sciezka={[
              { etykieta: 'Start', href: '/' },
              { etykieta: 'Kursy', href: '/kursy' },
              { etykieta: kurs.title },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {kurs.wyrozniony && <Odznaka ton="ciemna">Najpopularniejszy</Odznaka>}
            {poziom && <Odznaka ton="naCiemnym">{poziom}</Odznaka>}
          </div>
          <h1 className="max-w-[860px] text-balance text-[34px] leading-[1.03] text-white lg:text-[52px]">
            {kurs.title}
          </h1>
          {kurs.summary && (
            <p className="max-w-[640px] text-[17px] leading-7 text-rock-fg-strong">
              {kurs.summary}
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

          {kurs.dlaKogo && (
            <section>
              <h2 className="mb-4 text-[28px] leading-tight lg:text-[32px]">Dla kogo</h2>
              <div className="tresc-bogata">
                <RichText data={kurs.dlaKogo} />
              </div>
            </section>
          )}

          {kurs.program && kurs.program.length > 0 && (
            <section>
              <h2 className="mb-5 text-[28px] leading-tight lg:text-[32px]">Program</h2>
              <ol className="flex flex-col gap-4">
                {kurs.program.map((dzien, i) => (
                  <li
                    key={dzien.id ?? i}
                    className="flex flex-col gap-3 rounded-xl border border-rock-100 bg-white p-5 sm:flex-row sm:gap-6"
                  >
                    <span className="shrink-0 self-start rounded-md bg-rock-100 px-3 py-1.5 text-[13px] font-semibold text-rock-600">
                      {dzien.etykieta || `Dzień ${i + 1}`}
                    </span>
                    <div>
                      <h3 className="text-[17px] font-semibold">{dzien.tytul}</h3>
                      {dzien.opis && (
                        <p className="mt-1.5 text-[15px] leading-6 text-rock-600">{dzien.opis}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {((kurs.wCenie && kurs.wCenie.length > 0) ||
            (kurs.pozaCena && kurs.pozaCena.length > 0)) && (
            <section className="grid gap-5 md:grid-cols-2">
              {kurs.wCenie && kurs.wCenie.length > 0 && (
                <div className="rounded-xl border border-rock-100 bg-white p-6">
                  <h2 className="text-lg font-semibold">W cenie</h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {kurs.wCenie.map((p, i) => (
                      <li key={p.id ?? i} className="flex gap-2.5 text-[15px] leading-6">
                        <Ptaszek rozmiar={17} className="mt-0.5 shrink-0 text-rope" />
                        {p.pozycja}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {kurs.pozaCena && kurs.pozaCena.length > 0 && (
                <div className="rounded-xl border border-rock-100 bg-white p-6">
                  <h2 className="text-lg font-semibold">Poza ceną</h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {kurs.pozaCena.map((p, i) => (
                      <li
                        key={p.id ?? i}
                        className="flex gap-2.5 text-[15px] leading-6 text-rock-600"
                      >
                        <Krzyzyk rozmiar={17} className="mt-0.5 shrink-0 text-rock-400" />
                        {p.pozycja}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {kurs.warianty && kurs.warianty.length > 0 && (
            <section>
              <h2 className="mb-5 text-[28px] leading-tight lg:text-[32px]">Warianty</h2>
              <ul className="flex flex-col gap-3">
                {kurs.warianty.map((w, i) => (
                  <li
                    key={w.id ?? i}
                    className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl border border-rock-100 bg-white px-5 py-4"
                  >
                    <div>
                      <span className="font-medium">{w.nazwa}</span>
                      {w.opis && <span className="ml-2 text-[14px] text-rock-600">{w.opis}</span>}
                    </div>
                    <span className="font-semibold tabular-nums">{formatCena(w.cena)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {kurs.faq && kurs.faq.length > 0 && (
            <section>
              <h2 className="mb-5 text-[28px] leading-tight lg:text-[32px]">Częste pytania</h2>
              {/* <details> z treścią OBECNĄ w HTML-u. Googlebot nie klika
                  w rozwijane sekcje, więc odpowiedzi muszą być w źródle strony
                  niezależnie od tego, czy ktoś je rozwinął (reguła 9). */}
              <div className="flex flex-col gap-3">
                {kurs.faq.map((q, i) => (
                  <details
                    key={q.id ?? i}
                    open={i === 0}
                    className="group rounded-xl border border-rock-100 bg-white px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                      {q.pytanie}
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-xl text-rope transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-6 text-rock-600">{q.odpowiedz}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {kurs.description && (
            <section className="tresc-bogata">
              <RichText data={kurs.description} />
            </section>
          )}
        </div>

        {/* --- Karta zapisu --- */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-5 rounded-2xl border border-rock-100 bg-white p-6 shadow-[0_4px_16px_rgba(42,38,32,0.08)]">
            <div>
              <div className="text-[13px] uppercase tracking-[0.04em] text-rock-600">
                Cena kursu
              </div>
              <div className="mt-1 text-[30px] font-semibold tabular-nums">
                {formatCena(kurs.price, kurs.cenaOd)}
              </div>
              <div className="mt-1 text-[13px] text-rock-600">za osobę, sprzęt w cenie</div>
            </div>

            {terminy.length > 0 && (
              <div>
                <h2 className="mb-3 text-[15px] font-semibold">Najbliższe terminy</h2>
                <ul className="flex flex-col gap-2">
                  {terminy.slice(0, 4).map((t) => {
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
              <Przycisk href={`/kontakt?kurs=${kurs.slug}`} className="w-full">
                Zapisz się na kurs
              </Przycisk>
              {tel && (
                <Przycisk href={tel} wariant="obrys" className="w-full">
                  Zapytaj: {ustawienia.telefon}
                </Przycisk>
              )}
            </div>

            <p className="text-[13px] leading-5 text-rock-600">
              Zgłoszenie nie jest wiążące. Potwierdzamy termin, a dopiero potem prosimy o zaliczkę.
            </p>
          </div>
        </aside>
      </Kontener>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(courseSchema(kurs)) }}
      />
    </main>
  )
}
