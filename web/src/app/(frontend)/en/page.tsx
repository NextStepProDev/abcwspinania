import type { Metadata } from 'next'
import Link from 'next/link'

import { getCourses, getStronaEn, getUstawienia, telHref } from '@/lib/content'
import { formatCena, formatLevel } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Przycisk, Odznaka, Kontener } from '@/components/Ui'
import { TloGorskie } from '@/components/TloGorskie'

/**
 * Jedna podstrona po angielsku, a nie pełne tłumaczenie serwisu.
 *
 * `hrefLang` i `lang` na sekcji, bo reszta serwisu jest po polsku — bez tego
 * czytnik ekranu przeczytałby ten tekst polską wymową, a wyszukiwarka uznała
 * stronę za polską z dziwną treścią.
 */
export function generateMetadata(): Metadata {
  return {
    ...pageMetadata({
      title: 'Climbing courses on the Polish Jura',
      description:
        'Rock climbing courses in English on the Kraków-Częstochowa Upland, led by PZA-licensed instructors. Four climbers per instructor, own base in Rzędkowice.',
      path: '/en',
    }),
    openGraph: { locale: 'en_GB' },
  }
}

export default async function StronaEn() {
  const [tresc, kursy, ustawienia] = await Promise.all([
    getStronaEn(),
    getCourses(),
    getUstawienia(),
  ])
  const tel = telHref(ustawienia)

  // Bez ceny nie ma czego pokazać w tabeli — szkolenia wyceniane indywidualnie
  // zostają poza nią, żeby nie tworzyć wiersza z samym myślnikiem.
  const doTabeli = kursy.filter((k) => typeof k.price === 'number')

  const adres = [
    ustawienia.ulica,
    [ustawienia.kodPocztowy, ustawienia.miejscowosc].filter(Boolean).join(' '),
    'Poland',
  ].filter(Boolean)

  return (
    <main lang="en">
      <section className="relative isolate overflow-hidden bg-rock-950">
        <TloGorskie />
        <div className="absolute inset-0 bg-rock-950/60" />
        <Kontener className="relative flex min-h-[420px] flex-col justify-center gap-5 py-14 lg:min-h-[520px]">
          {tresc?.badge && (
            <span className="self-start">
              <Odznaka ton="ciemna" wersaliki>
                {tresc.badge}
              </Odznaka>
            </span>
          )}
          <h1 className="max-w-[820px] text-balance text-[36px] leading-[1.02] text-white lg:text-[58px]">
            {tresc?.tytul ?? 'Learn to climb on Polish Jura limestone'}
          </h1>
          {tresc?.lead && (
            <p className="max-w-[620px] text-[17px] leading-7 text-rock-fg-strong lg:text-[19px]">
              {tresc.lead}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3.5">
            {tel && (
              <Przycisk href={tel} duzy>
                Call {ustawienia.telefon}
              </Przycisk>
            )}
            {ustawienia.email && (
              <Przycisk href={`mailto:${ustawienia.email}`} wariant="obrysJasny" duzy>
                Send an email
              </Przycisk>
            )}
          </div>
        </Kontener>
      </section>

      {(tresc?.oNas || tresc?.baza) && (
        <Kontener className="grid gap-8 py-14 lg:grid-cols-2 lg:gap-14">
          {tresc?.oNas && (
            <section>
              <h2 className="text-[28px] leading-tight lg:text-[34px]">Who we are</h2>
              <p className="mt-4 whitespace-pre-line text-[16px] leading-7 text-rock-600">
                {tresc.oNas}
              </p>
            </section>
          )}
          {tresc?.baza && (
            <section>
              <h2 className="text-[28px] leading-tight lg:text-[34px]">Where you stay</h2>
              <p className="mt-4 whitespace-pre-line text-[16px] leading-7 text-rock-600">
                {tresc.baza}
              </p>
            </section>
          )}
        </Kontener>
      )}

      {doTabeli.length > 0 && (
        <Kontener className="pb-14">
          <h2 className="text-[28px] leading-tight lg:text-[34px]">Courses and prices</h2>
          {tresc?.kursOpis && (
            <p className="mt-3 max-w-[680px] text-[16px] leading-7 text-rock-600">
              {tresc.kursOpis}
            </p>
          )}

          <div className="mt-7 overflow-x-auto rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
            <table className="w-full min-w-[560px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-rock-100 text-left">
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Course
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Length
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Level
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-right text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
                  >
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {doTabeli.map((k) => (
                  <tr key={k.id} className="border-b border-rock-100 last:border-0">
                    {/* Nazwa po angielsku, gdy jest; inaczej polska — lepiej
                        pokazać oryginał niż pustą komórkę. */}
                    <td className="px-6 py-4 font-medium">{k.tytulEn || k.title}</td>
                    <td className="px-6 py-4 text-rock-600">{k.duration ?? '—'}</td>
                    <td className="px-6 py-4 text-rock-600">
                      {POZIOM_EN[k.level ?? ''] ?? formatLevel(k.level) ?? '—'}
                    </td>
                    {/* Ceny zaciągają się z tych samych kursów co po polsku,
                        więc nie mogą się z nimi rozjechać. */}
                    <td className="px-6 py-4 text-right font-semibold tabular-nums">
                      {formatCena(k.price, k.cenaOd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kontener>
      )}

      <Kontener className="pb-16 lg:pb-24">
        <div className="grid gap-8 rounded-2xl bg-rock-900 p-8 lg:grid-cols-2 lg:gap-14 lg:p-14">
          <div>
            <h2 className="text-[26px] leading-tight text-white lg:text-[32px]">
              Getting here and booking
            </h2>
            {tresc?.dojazd && (
              <p className="mt-4 whitespace-pre-line text-[16px] leading-7 text-rock-fg">
                {tresc.dojazd}
              </p>
            )}
            {tresc?.sezon && (
              <p className="mt-4 whitespace-pre-line text-[16px] leading-7 text-rock-fg">
                {tresc.sezon}
              </p>
            )}
          </div>

          <dl className="flex flex-col gap-4 text-[15px]">
            {ustawienia.telefon && tel && (
              <div>
                <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-500">Phone</dt>
                <dd className="mt-1">
                  <a href={tel} className="font-semibold text-white hover:text-rope-light">
                    {ustawienia.telefonE164 || ustawienia.telefon}
                  </a>
                </dd>
              </div>
            )}
            {ustawienia.email && (
              <div>
                <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-500">Email</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${ustawienia.email}`}
                    className="break-all text-rock-fg hover:text-rope-light"
                  >
                    {ustawienia.email}
                  </a>
                </dd>
              </div>
            )}
            {adres.length > 1 && (
              <div>
                <dt className="text-[13px] uppercase tracking-[0.04em] text-rock-500">Address</dt>
                <dd className="mt-1">
                  <address className="not-italic leading-6 text-rock-fg">
                    {adres.map((l) => (
                      <span key={l} className="block">
                        {l}
                      </span>
                    ))}
                  </address>
                </dd>
              </div>
            )}
            <div className="mt-2">
              <Przycisk href="/kontakt">Send an enquiry</Przycisk>
            </div>
          </dl>
        </div>

        <p className="mt-6 text-[15px] text-rock-600">
          Full schedule and Polish-language detail:{' '}
          <Link
            href="/terminarz"
            hrefLang="pl"
            lang="pl"
            className="text-rope underline underline-offset-4"
          >
            Terminarz
          </Link>
          .
        </p>
      </Kontener>
    </main>
  )
}

/** Poziomy po angielsku — te same wartości, co w `format.ts`, inne etykiety. */
const POZIOM_EN: Record<string, string> = {
  poczatkujacy: 'Beginner',
  sredniozaawansowany: 'Intermediate',
  zaawansowany: 'Advanced',
}
