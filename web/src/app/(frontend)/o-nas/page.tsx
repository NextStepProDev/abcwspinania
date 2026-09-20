import type { Metadata } from 'next'
import Image from 'next/image'
import { RichText } from '@payloadcms/richtext-lexical/react'

import { getStronaONas, getInstructors, getUstawienia, asImage } from '@/lib/content'
import { latOd } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { Okruszki } from '@/components/Okruszki'
import { Tarcza, Ptaszek, Certyfikat, Strzalka } from '@/components/Ikony'
import { Kontener, MiejsceNaZdjecie } from '@/components/Ui'
import Link from 'next/link'

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: 'O nas',
    description:
      'Szkoła wspinaczki z licencją Polskiego Związku Alpinizmu. Własna baza w Rzędkowicach, instruktorzy z weryfikowanymi uprawnieniami, grupy do czterech osób.',
    path: '/o-nas',
  })
}

const IKONY_POWODOW = [Tarcza, Ptaszek, Certyfikat]

export default async function StronaONas() {
  const [tresc, instruktorzy, ustawienia] = await Promise.all([
    getStronaONas(),
    getInstructors(),
    getUstawienia(),
  ])
  const lat = latOd(ustawienia.rokZalozenia)
  const zdjecie = asImage(tresc?.zdjecie)
  const medium = zdjecie?.sizes?.medium

  return (
    <main>
      <Kontener className="grid gap-10 py-8 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-14 lg:py-12">
        <div>
          <Okruszki sciezka={[{ etykieta: 'Start', href: '/' }, { etykieta: 'O nas' }]} />
          <h1 className="mt-5 max-w-[700px] text-balance text-[36px] leading-[1.05] lg:text-[52px]">
            {tresc?.tytul ?? 'O szkole'}
          </h1>
          {tresc?.wstep && (
            <p className="mt-5 max-w-[640px] whitespace-pre-line text-[17px] leading-7 text-rock-600">
              {tresc.wstep}
            </p>
          )}
          {lat && (
            <p className="mt-4 text-[15px] text-rock-600">
              Szkolimy od {ustawienia.rokZalozenia} roku, czyli {lat} lat.
              {ustawienia.licencjaPza &&
                ` Licencja instruktorska PZA nr ${ustawienia.licencjaPza}.`}
            </p>
          )}
        </div>

        {zdjecie?.url ? (
          <Image
            src={medium?.url ?? zdjecie.url}
            alt={zdjecie.alt ?? ''}
            width={medium?.width ?? zdjecie.width ?? 750}
            height={medium?.height ?? zdjecie.height ?? 500}
            className="h-full max-h-[380px] w-full rounded-2xl object-cover"
          />
        ) : (
          <MiejsceNaZdjecie
            opis="Zdjęcie · instruktor przy skale"
            wysokosc="h-[280px] lg:h-[380px]"
          />
        )}
      </Kontener>

      {tresc?.powodyLicencji && tresc.powodyLicencji.length > 0 && (
        <Kontener className="py-12 lg:py-16">
          <h2 className="mb-8 max-w-[700px] text-[32px] leading-[1.05] lg:text-[44px]">
            Dlaczego licencja PZA ma znaczenie
          </h2>
          <ul className="grid gap-8 lg:grid-cols-3">
            {tresc.powodyLicencji.map((p, i) => {
              const Ikona = IKONY_POWODOW[i % IKONY_POWODOW.length]
              return (
                <li key={p.id ?? i} className="flex flex-col gap-3">
                  <Ikona rozmiar={28} className="text-rope" />
                  <h3 className="text-xl font-semibold tracking-[-0.01em]">{p.tytul}</h3>
                  <p className="text-[15px] leading-6 text-rock-600">{p.opis}</p>
                </li>
              )
            })}
          </ul>
        </Kontener>
      )}

      {instruktorzy.length > 0 && (
        <Kontener className="pb-12 lg:pb-16">
          <h2 className="text-[32px] leading-[1.05] lg:text-[44px]">Instruktorzy</h2>
          <p className="mt-3 max-w-[680px] text-[17px] leading-7 text-rock-600">
            Każdy z licencją PZA, każdy wspina się dalej na własną rękę — instruktor, który przestał
            się wspinać, przestaje rozumieć, co jest trudne.
          </p>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {instruktorzy.map((i) => {
              const portret = asImage(i.portret)
              const mini = portret?.sizes?.medium
              return (
                <li
                  key={i.id}
                  className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]"
                >
                  {portret?.url ? (
                    <Image
                      src={mini?.url ?? portret.url}
                      alt={portret.alt ?? ''}
                      width={mini?.width ?? portret.width ?? 750}
                      height={mini?.height ?? portret.height ?? 500}
                      className="h-[240px] w-full border-b border-rock-200 object-cover"
                    />
                  ) : (
                    <MiejsceNaZdjecie opis="Portret" wysokosc="h-[240px]" />
                  )}
                  <div className="flex flex-col gap-2 p-6">
                    <h3 className="text-[19px] font-semibold">{i.imie}</h3>
                    {i.rola && <p className="text-[14px] text-rope">{i.rola}</p>}
                    {i.licencja && (
                      <p className="text-[13px] text-rock-600">Licencja {i.licencja}</p>
                    )}
                    {i.opis && <p className="mt-1 text-[15px] leading-6 text-rock-600">{i.opis}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </Kontener>
      )}

      {(tresc?.oJurze || (tresc?.liczbyJura && tresc.liczbyJura.length > 0)) && (
        <section className="pb-12 lg:pb-16">
          <Kontener>
            <div className="rounded-2xl bg-rock-900 p-8 lg:p-14">
              <h2 className="text-[28px] leading-[1.05] text-white lg:text-[38px]">
                Wspinanie na Jurze
              </h2>
              {tresc?.oJurze && (
                <p className="mt-4 max-w-[760px] text-[17px] leading-7 text-rock-fg">
                  {tresc.oJurze}
                </p>
              )}
              {tresc?.liczbyJura && tresc.liczbyJura.length > 0 && (
                <dl className="mt-9 grid grid-cols-2 gap-7 lg:grid-cols-4">
                  {tresc.liczbyJura.map((l, i) => (
                    <div key={l.id ?? i}>
                      <dt className="sr-only">{l.opis}</dt>
                      <dd>
                        <span className="block font-display text-[26px] font-extrabold text-rope-light lg:text-[32px]">
                          {l.wartosc}
                        </span>
                        <span className="mt-1 block text-[14px] leading-5 text-rock-fg">
                          {l.opis}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </Kontener>
        </section>
      )}

      {tresc?.tresc && (
        <Kontener className="pb-12 lg:pb-16">
          <div className="tresc-bogata max-w-[720px]">
            <RichText data={tresc.tresc} />
          </div>
        </Kontener>
      )}

      <Kontener className="pb-16 lg:pb-24">
        <ul className="grid gap-5 md:grid-cols-2">
          {[
            {
              href: '/opinie',
              tytul: 'Opinie kursantów',
              opis: 'Wszystkie, które dostajemy — razem z krytyką.',
            },
            {
              href: '/en',
              tytul: 'Courses in English',
              opis: 'Prowadzimy kursy po angielsku. Skrót oferty na osobnej stronie.',
            },
          ].map((k) => (
            <li key={k.href}>
              <Link
                href={k.href}
                className="flex items-center gap-4 rounded-2xl border border-rock-200 bg-white p-6 transition-colors hover:border-rope"
              >
                <span className="grow">
                  <span className="block text-[17px] font-semibold">{k.tytul}</span>
                  <span className="mt-1 block text-[15px] leading-6 text-rock-600">{k.opis}</span>
                </span>
                <Strzalka rozmiar={20} className="shrink-0 text-rope" />
              </Link>
            </li>
          ))}
        </ul>
      </Kontener>
    </main>
  )
}
