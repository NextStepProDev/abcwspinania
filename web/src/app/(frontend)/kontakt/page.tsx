import type { Metadata } from 'next'

import { getCourse, getUstawienia, telHref } from '@/lib/content'
import { pageMetadata } from '@/lib/seo'
import { Okruszki } from '@/components/Okruszki'
import { Telefon, Koperta, Pinezka, Zegar } from '@/components/Ikony'
import { Kontener } from '@/components/Ui'
import { FormularzKontaktowy } from './FormularzKontaktowy'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Kontakt',
    description:
      'Napisz lub zadzwoń — kursy wspinaczki skalnej, obozy i wyjazdy na Jurze Krakowsko-Częstochowskiej. Odpowiadamy zwykle tego samego dnia.',
    path: '/kontakt',
  })
}

type Props = { searchParams: Promise<{ kurs?: string; oboz?: string }> }

export default async function Kontakt({ searchParams }: Props) {
  const { kurs: slugKursu, oboz } = await searchParams
  const [ustawienia, kurs] = await Promise.all([
    getUstawienia(),
    // Slug pochodzi z adresu, więc może wskazywać na nic — wtedy po prostu
    // nie podpowiadamy niczego, zamiast pokazywać błąd.
    slugKursu ? getCourse(slugKursu) : Promise.resolve(null),
  ])
  const tel = telHref(ustawienia)

  const adres = [
    ustawienia.ulica,
    [ustawienia.kodPocztowy, ustawienia.miejscowosc].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <main>
      <Kontener className="pb-8 pt-8">
        <Okruszki sciezka={[{ etykieta: 'Start', href: '/' }, { etykieta: 'Kontakt' }]} />
        <h1 className="mt-5 max-w-[800px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
          Kontakt
        </h1>
        <p className="mt-4 max-w-[680px] text-[17px] leading-7 text-rock-600">
          Odpowiadamy zwykle tego samego dnia. Jeśli sprawa jest pilna albo chcesz dopytać o poziom
          — po prostu zadzwoń.
        </p>
      </Kontener>

      <Kontener className="grid gap-8 pb-16 lg:grid-cols-[1fr_380px] lg:gap-12 lg:pb-24">
        <section aria-labelledby="formularz">
          <h2 id="formularz" className="sr-only">
            Formularz kontaktowy
          </h2>
          <FormularzKontaktowy
            temat={oboz ? 'oboz' : undefined}
            kurs={kurs ? { id: kurs.id, title: kurs.title } : undefined}
          />
        </section>

        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border border-rock-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Dane kontaktowe</h2>
            <dl className="mt-4 flex flex-col gap-4">
              {ustawienia.telefon && tel && (
                <PozycjaKontaktu ikona={<Telefon rozmiar={18} />} etykieta="Telefon">
                  <a href={tel} className="font-semibold text-rock-900 hover:text-rope">
                    {ustawienia.telefon}
                  </a>
                </PozycjaKontaktu>
              )}
              {ustawienia.email && (
                <PozycjaKontaktu ikona={<Koperta rozmiar={18} />} etykieta="E-mail">
                  <a
                    href={`mailto:${ustawienia.email}`}
                    className="break-all text-rock-900 hover:text-rope"
                  >
                    {ustawienia.email}
                  </a>
                </PozycjaKontaktu>
              )}
              {adres && (
                <PozycjaKontaktu ikona={<Pinezka rozmiar={18} />} etykieta="Adres">
                  {/* Adres w znaczniku <address> i równolegle w danych
                      strukturalnych, żeby wyszukiwarka nie musiała go zgadywać. */}
                  <address className="not-italic leading-6">{adres}</address>
                </PozycjaKontaktu>
              )}
              {ustawienia.godziny && (
                <PozycjaKontaktu ikona={<Zegar rozmiar={18} />} etykieta="Kiedy dzwonić">
                  <span className="whitespace-pre-line leading-6">{ustawienia.godziny}</span>
                </PozycjaKontaktu>
              )}
            </dl>

            {ustawienia.uwagaKontaktowa && (
              <p className="mt-5 border-t border-rock-100 pt-4 text-[14px] leading-6 text-rock-600">
                {ustawienia.uwagaKontaktowa}
              </p>
            )}
          </div>

          {ustawienia.mapaEmbed ? (
            <iframe
              src={ustawienia.mapaEmbed}
              title={`Mapa — ${ustawienia.miejscowosc ?? 'baza szkoły'}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[260px] w-full rounded-2xl border border-rock-200"
            />
          ) : (
            // Mapy nie osadzamy „na wszelki wypadek": zewnętrzna ramka wymaga
            // rozluźnienia CSP i ustawia ciasteczka, więc wchodzi dopiero, gdy
            // klient poda konkretny adres osadzenia.
            <div className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-rock-300 bg-white px-6 text-center">
              <Pinezka rozmiar={22} className="text-rock-400" />
              <p className="text-sm text-rock-600">
                Mapa pojawi się po podaniu adresu osadzenia w panelu.
              </p>
            </div>
          )}

          {ustawienia.dojazd && (
            <div className="rounded-2xl border border-rock-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Jak dojechać</h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-6 text-rock-600">
                {ustawienia.dojazd}
              </p>
            </div>
          )}
        </aside>
      </Kontener>
    </main>
  )
}

function PozycjaKontaktu({
  ikona,
  etykieta,
  children,
}: {
  ikona: React.ReactNode
  etykieta: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3.5">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-rope">
        {ikona}
      </span>
      <div>
        <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-600">{etykieta}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  )
}
