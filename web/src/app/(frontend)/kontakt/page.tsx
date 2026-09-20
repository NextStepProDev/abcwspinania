import type { Metadata } from 'next'

import { pageMetadata } from '@/lib/seo'
import { getUstawienia, telHref } from '@/lib/content'
import { FormularzKontaktowy } from './FormularzKontaktowy'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'Kontakt',
    description:
      'Napisz lub zadzwoń — kursy wspinaczki skalnej, szkolenia i obozy na Jurze Krakowsko-Częstochowskiej.',
    path: '/kontakt',
  })
}

export default async function Kontakt() {
  const ustawienia = await getUstawienia()
  const tel = telHref(ustawienia)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-4">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Kontakt</h1>
        <p className="max-w-[65ch] text-lg text-rock-600">
          Napisz, w czym możemy pomóc — odpowiemy najszybciej, jak się da.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="formularz">
          <h2 id="formularz" className="sr-only">
            Formularz kontaktowy
          </h2>
          <FormularzKontaktowy />
        </section>

        <aside className="flex flex-col gap-6">
          <section aria-labelledby="adres">
            <h2 id="adres" className="text-lg font-medium">
              Adres
            </h2>
            {/* Adres w znaczniku <address> i równolegle w danych
                strukturalnych, żeby wyszukiwarka nie musiała go zgadywać
                z samego tekstu. */}
            <address className="mt-2 not-italic leading-relaxed text-rock-600">
              {ustawienia.nazwaFirmy}
              <br />
              {ustawienia.ulica}
              <br />
              {ustawienia.kodPocztowy} {ustawienia.miejscowosc}
            </address>
          </section>

          {tel && (
            <section aria-labelledby="telefon-naglowek">
              <h2 id="telefon-naglowek" className="text-lg font-medium">
                Telefon
              </h2>
              {/* Numer jako link tel: — na telefonie wystarczy stuknąć. */}
              <p className="mt-2">
                <a href={tel} className="text-rope underline underline-offset-4">
                  {ustawienia.telefon}
                </a>
              </p>
            </section>
          )}
        </aside>
      </div>
    </main>
  )
}
