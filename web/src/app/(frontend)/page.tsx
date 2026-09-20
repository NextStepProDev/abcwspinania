import type { Metadata } from 'next'
import Image from 'next/image'

import {
  getCourses,
  getStronaGlowna,
  getUpcomingTerms,
  getOpinions,
  getPosts,
  getUstawienia,
  telHref,
  asImage,
} from '@/lib/content'
import { latOd } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { IKONY_WYBIERALNE, type NazwaIkony } from '@/components/Ikony'
import { KafelKursu } from '@/components/KafelKursu'
import { TabelaTerminow } from '@/components/Terminy'
import { KafelWpisu } from '@/components/KafelWpisu'
import { Cytat } from '@/components/Cytat'
import { TloGorskie } from '@/components/TloGorskie'
import { Przycisk, Odznaka, NaglowekSekcji, Kontener, MiejsceNaZdjecie } from '@/components/Ui'

// Eksportowane jako generateMetadata, NIE jako `export const metadata` —
// tamta forma wymaga literału i nie przyjmie wywołania funkcji (reguła 7).
export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Szkoła wspinaczki na Jurze',
    description:
      'Kursy wspinaczki skalnej według programu PZA, obozy dla dzieci i młodzieży, własna baza w Rzędkowicach. Maksymalnie cztery osoby na instruktora.',
    path: '/',
  })
}

export default async function Home() {
  // Trzy niezależne zapytania — równolegle, bo szeregowo dołożyłyby sobie
  // czasy nawzajem, a żadne nie potrzebuje wyniku pozostałych.
  const [tresc, kursy, terminy, opinie, wpisy, ustawienia] = await Promise.all([
    getStronaGlowna(),
    getCourses(),
    getUpcomingTerms(4),
    getOpinions(),
    getPosts(3),
    getUstawienia(),
  ])
  // Na stronę startową wchodzą opinie wyraźnie do tego zaznaczone; gdy nikt
  // żadnej nie zaznaczył, bierzemy dwie pierwsze, żeby sekcja nie zniknęła.
  const zaznaczone = opinie.filter((o) => o.naStronieGlownej)
  const opinieNaStart = (zaznaczone.length > 0 ? zaznaczone : opinie).slice(0, 2)
  const tel = telHref(ustawienia)
  const lat = latOd(ustawienia.rokZalozenia)

  return (
    <main>
      {/* --- Nagłówek powitalny --- */}
      <section className="relative isolate overflow-hidden bg-rock-950">
        <TloGorskie />
        <div className="absolute inset-0 bg-rock-950/60" />
        <Kontener className="relative flex min-h-[520px] flex-col justify-center gap-6 py-16 lg:min-h-[640px] lg:py-0">
          {(tresc?.heroOdznaka || tresc?.heroPodtytul) && (
            <div className="flex flex-wrap items-center gap-3">
              {tresc.heroOdznaka && (
                <Odznaka ton="ciemna" wersaliki>
                  {tresc.heroOdznaka}
                </Odznaka>
              )}
              {tresc.heroPodtytul && (
                <span className="text-sm font-medium text-rock-100">{tresc.heroPodtytul}</span>
              )}
            </div>
          )}

          {/* Dokładnie jeden <h1> na stronę (reguła 11). Tekst zastępczy jest
              tu po to, żeby strona miała nagłówek także zanim ktokolwiek
              wypełni panel — pusty h1 jest gorszy niż zachowawczy. */}
          <h1 className="max-w-[830px] text-balance text-[40px] leading-[0.98] text-white sm:text-[56px] lg:text-[72px] lg:tracking-[-0.035em]">
            {tresc?.heroTytul ?? 'Naucz się wspinać na jurajskim wapieniu'}
          </h1>

          {tresc?.heroTekst && (
            <p className="max-w-[620px] text-[17px] leading-7 text-rock-fg-strong lg:text-[19px] lg:leading-[30px]">
              {tresc.heroTekst}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3.5">
            <Przycisk href="/kursy" duzy zeStrzalka>
              Zobacz kursy
            </Przycisk>
            {tel && (
              <Przycisk href={tel} wariant="obrysJasny" duzy>
                Zadzwoń: {ustawienia.telefon}
              </Przycisk>
            )}
          </div>
        </Kontener>
      </section>

      {/* --- Pasek z liczbami --- */}
      {tresc?.liczby && tresc.liczby.length > 0 && (
        <section className="border-b border-rock-100 bg-white">
          <Kontener className="grid grid-cols-2 gap-8 py-10 lg:grid-cols-4 lg:gap-10">
            {tresc.liczby.map((k) => (
              <div key={k.id ?? k.wartosc} className="flex flex-col gap-1">
                <div
                  className={`font-display text-[22px] font-extrabold tracking-[-0.02em] lg:text-[30px] ${
                    k.wyrozniony ? 'text-rope' : 'text-rock-900'
                  }`}
                >
                  {/* „25 lat" liczone z roku założenia, żeby nie zestarzało się
                      w styczniu. Panel może to nadpisać własnym tekstem. */}
                  {k.wartosc === '{lat}' && lat ? `${lat} lat` : k.wartosc}
                </div>
                <div className="text-sm leading-5 text-rock-600">{k.opis}</div>
              </div>
            ))}
          </Kontener>
        </section>
      )}

      {/* --- Kursy --- */}
      <section className="py-16 lg:py-24">
        <Kontener>
          <NaglowekSekcji
            id="kursy"
            tytul={tresc?.kursyTytul ?? 'Kursy'}
            opis={tresc?.kursyTekst}
            link="/kursy"
            etykietaLinku="Wszystkie kursy"
          />

          {kursy.length === 0 ? (
            // Stan pusty jest CZĘŚCIĄ PROJEKTU, nie awarią: getCourses() celowo
            // zwraca pustą listę, gdy baza jest nieosiągalna (build w CI) albo
            // gdy w panelu nie ma jeszcze treści (reguła 2).
            <p className="text-rock-600">Oferta kursów pojawi się tutaj po dodaniu jej w panelu.</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {kursy.slice(0, 4).map((kurs) => (
                <li key={kurs.id} className="flex">
                  <div className="flex w-full">
                    <KafelKursu kurs={kurs} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Kontener>
      </section>

      {/* --- Obozy --- */}
      {tresc?.obozyTytul && (
        <section className="pb-16 lg:pb-24">
          <Kontener>
            <div className="grid overflow-hidden rounded-2xl bg-rock-900 lg:grid-cols-2">
              <div className="flex flex-col justify-center gap-5 p-8 lg:p-16">
                {tresc.obozyOdznaka && (
                  <span className="self-start">
                    <Odznaka ton="naCiemnym" wersaliki>
                      {tresc.obozyOdznaka}
                    </Odznaka>
                  </span>
                )}
                <h2 className="text-[28px] leading-[1.05] text-white lg:text-[40px]">
                  {tresc.obozyTytul}
                </h2>
                {tresc.obozyTekst && (
                  <p className="text-[17px] leading-7 text-rock-fg">{tresc.obozyTekst}</p>
                )}
                <div className="mt-2">
                  <Przycisk href="/obozy">Terminy obozów</Przycisk>
                </div>
              </div>

              {(() => {
                const zdjecie = asImage(tresc.obozyZdjecie)
                const medium = zdjecie?.sizes?.medium
                return zdjecie?.url ? (
                  <Image
                    src={medium?.url ?? zdjecie.url}
                    alt={zdjecie.alt ?? ''}
                    width={medium?.width ?? zdjecie.width ?? 750}
                    height={medium?.height ?? zdjecie.height ?? 500}
                    className="h-full min-h-[240px] w-full object-cover lg:min-h-[380px]"
                  />
                ) : (
                  <MiejsceNaZdjecie
                    opis="Zdjęcie · obóz w Rzędkowicach"
                    wysokosc="min-h-[240px] lg:min-h-[380px] h-full"
                    ciemne
                  />
                )
              })()}
            </div>
          </Kontener>
        </section>
      )}

      {/* --- Opinie --- */}
      {opinieNaStart.length > 0 && (
        <section className="pb-16 lg:pb-24">
          <Kontener>
            <NaglowekSekcji
              tytul="Co mówią kursanci"
              link="/opinie"
              etykietaLinku="Wszystkie opinie"
            />
            <ul className="grid gap-6 lg:grid-cols-2">
              {opinieNaStart.map((o) => (
                <li key={o.id} className="flex">
                  <Cytat opinia={o} duzy />
                </li>
              ))}
            </ul>
          </Kontener>
        </section>
      )}

      {/* --- Najbliższe terminy --- */}
      {terminy.length > 0 && (
        <section className="pb-16 lg:pb-24">
          <Kontener>
            <NaglowekSekcji
              tytul="Najbliższe terminy"
              link="/terminarz"
              etykietaLinku="Pełny terminarz"
            />
            <TabelaTerminow terminy={terminy} />
          </Kontener>
        </section>
      )}

      {/* --- Dlaczego instruktor z licencją --- */}
      {tresc?.dlaczego && tresc.dlaczego.length > 0 && (
        <section className="pb-16 lg:pb-24">
          <Kontener>
            <h2 className="mb-9 max-w-[700px] text-[32px] leading-[1.05] lg:text-[44px]">
              Dlaczego instruktor z licencją
            </h2>
            <ul className="grid gap-8 lg:grid-cols-3">
              {tresc.dlaczego.map((p) => {
                const Ikona = IKONY_WYBIERALNE[(p.ikona ?? 'tarcza') as NazwaIkony]
                return (
                  <li key={p.id ?? p.tytul} className="flex flex-col gap-3">
                    <Ikona rozmiar={28} className="text-rope" />
                    <h3 className="text-xl font-semibold tracking-[-0.01em]">{p.tytul}</h3>
                    <p className="text-[15px] leading-6 text-rock-600">{p.opis}</p>
                  </li>
                )
              })}
            </ul>
          </Kontener>
        </section>
      )}

      {/* --- Ostatnie wpisy --- */}
      {wpisy.length > 0 && (
        <section className="pb-16 lg:pb-24">
          <Kontener>
            <NaglowekSekcji
              tytul="Ostatnio pisaliśmy"
              opis="Relacje z kursów, historia rejonu i rzeczy, które warto wiedzieć, zanim pierwszy raz wyjdziesz w skały."
              link="/aktualnosci"
              etykietaLinku="Wszystkie wpisy"
            />
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {wpisy.map((w) => (
                <li key={w.id} className="flex">
                  <KafelWpisu wpis={w} />
                </li>
              ))}
            </ul>
          </Kontener>
        </section>
      )}

      {/* --- Wezwanie końcowe --- */}
      {tresc?.ctaTytul && (
        <section className="pb-16 lg:pb-24">
          <Kontener>
            <div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-rope px-8 py-12 lg:flex-row lg:items-center lg:px-16 lg:py-14">
              <div className="max-w-[640px]">
                <h2 className="text-[26px] leading-[1.08] text-white lg:text-[38px]">
                  {tresc.ctaTytul}
                </h2>
                {tresc.ctaTekst && (
                  <p className="mt-2.5 text-[17px] leading-7 text-rope-soft">{tresc.ctaTekst}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-3.5">
                <Przycisk href="/kontakt" wariant="jasny" duzy>
                  Napisz do nas
                </Przycisk>
                {tel && (
                  <Przycisk href={tel} wariant="obrysJasny" duzy>
                    {ustawienia.telefon}
                  </Przycisk>
                )}
              </div>
            </div>
          </Kontener>
        </section>
      )}
    </main>
  )
}
