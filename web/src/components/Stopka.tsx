import Link from 'next/link'

import type { Ustawienia } from '@/payload-types'
import { Logotyp } from './Znak'
import { FormularzNewslettera } from './FormularzNewslettera'
import { MENU_OFERTA, MENU_SZKOLA } from './nawigacja'

/**
 * Stopka.
 *
 * Nagłówek newslettera jest `<h2>`, nie `<h1>` — na każdej podstronie stoi już
 * jeden nagłówek pierwszego stopnia w treści, a drugi złamałby regułę 11.
 *
 * Formularz newslettera zapisuje adres do bazy razem z treścią zgody. Wysyłki
 * jeszcze nie ma (Brevo to osobny etap) — ale pole, które nic nie zapisuje,
 * traci adresy osób zainteresowanych, a takich nie da się odzyskać.
 */
export function Stopka({ ustawienia }: { ustawienia: Ustawienia }) {
  const u = ustawienia
  const rok = new Date().getFullYear()
  const adres = [u.ulica, [u.kodPocztowy, u.miejscowosc].filter(Boolean).join(' ')].filter(Boolean)

  return (
    <footer className="mt-auto bg-rock-900 text-rock-fg">
      <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-14 sm:px-6 lg:px-20">
        <div className="flex flex-col items-start justify-between gap-7 border-b border-rock-line pb-10 lg:flex-row lg:items-center lg:gap-14">
          <div className="max-w-[540px]">
            <h2 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-white">
              Nowe terminy i teksty z Jury
            </h2>
            <p className="mt-2 text-[15px] leading-6">
              Kilka maili w sezonie: otwarcie zapisów, zwolnione miejsca, nowy artykuł. Bez spamu,
              wypisujesz się jednym kliknięciem.
            </p>
          </div>
          <FormularzNewslettera />
        </div>

        <div className="grid gap-10 border-b border-rock-line py-11 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-12">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5 text-white">
              <Logotyp rozmiarZnaku={24} rozmiarTekstu="text-[18px]" kolorZnaku="text-rope" />
            </div>
            {u.opisKrotki && <p className="max-w-[320px] text-[15px] leading-6">{u.opisKrotki}</p>}
          </div>

          <KolumnaLinkow tytul="Oferta" pozycje={MENU_OFERTA} />
          <KolumnaLinkow tytul="Szkoła" pozycje={MENU_SZKOLA} />

          <div>
            <h2 className="mb-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-rock-500">
              Kontakt
            </h2>
            <ul className="flex flex-col gap-2.5 text-[15px]">
              {u.telefon && (
                <li>
                  <a
                    href={`tel:${(u.telefonE164 || u.telefon).replace(/[^\d+]/g, '')}`}
                    className="font-semibold text-white hover:text-rope-light"
                  >
                    {u.telefon}
                  </a>
                </li>
              )}
              {u.email && (
                <li>
                  <a href={`mailto:${u.email}`} className="hover:text-rope-light">
                    {u.email}
                  </a>
                </li>
              )}
              {adres.length > 0 && (
                <li className="leading-[22px]">
                  {adres.map((linia) => (
                    <span key={linia} className="block">
                      {linia}
                    </span>
                  ))}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-rock-500">
          <span>
            © {rok} {u.nazwaFirmy || 'ABC Wspinania'}
          </span>
          {u.licencjaPza && <span>Licencja instruktorska PZA nr {u.licencjaPza}</span>}
        </div>
      </div>
    </footer>
  )
}

function KolumnaLinkow({
  tytul,
  pozycje,
}: {
  tytul: string
  pozycje: { href: string; etykieta: string }[]
}) {
  return (
    <div>
      <h2 className="mb-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-rock-500">
        {tytul}
      </h2>
      <ul className="flex flex-col gap-2.5 text-[15px]">
        {pozycje.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="hover:text-rope-light">
              {p.etykieta}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
