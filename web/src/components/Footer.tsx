import Image from 'next/image'
import Link from 'next/link'

import type { SiteConfig } from '@/payload-types'
import { BRAND } from '@/lib/site'
import { FullLogo } from './Logo'
import { NewsletterForm } from './NewsletterForm'
import { OFFER_NAV, SCHOOL_NAV, type NavItem } from './navigation'

/**
 * The footer.
 *
 * The newsletter heading is an `<h2>`, not an `<h1>` — every page already has
 * one level-one heading in its content, and a second would break rule 11.
 *
 * The newsletter form writes the address to the database together with the text
 * of the consent. Sending is not wired up yet (Brevo is a separate stage) — but
 * a field that stores nothing loses the addresses of interested people, and
 * those cannot be recovered.
 */
export function Footer({ config }: { config: SiteConfig }) {
  const year = new Date().getFullYear()
  const address = [
    config.street,
    [config.postalCode, config.city].filter(Boolean).join(' '),
  ].filter(Boolean)

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
          <NewsletterForm />
        </div>

        {/* Two columns from the smallest screen, so "Oferta" and "Szkoła" sit side
            by side on a phone instead of in one long list — their longest entry
            ("Opinie kursantów", ~125 px) fits the ~167 px column at 390 px.
            The brand row and the contact block span both columns. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-b border-rock-line py-11 lg:grid-cols-3 lg:gap-12">
          {/* The logo BESIDE the text, on a row of its own, rather than on top
              of it in the first of four columns. Stacked, the long description
              turned that column into a narrow tower with empty space under the
              short link columns; side by side at full width it runs to about
              four lines. */}
          <div className="col-span-2 flex flex-col gap-6 sm:flex-row sm:items-start lg:col-span-3">
            {/* The school's logo and the PZA instructor badge side by side, at
                one height — the two marks a visitor should connect. The logo
                needs no variant for the dark ground: its blue panel and white
                plate both stand clear of `rock-900` as they are. */}
            <div className="flex shrink-0 items-center gap-4 self-start">
              <FullLogo title={BRAND} className="h-[120px] w-auto" />
              <Image
                src="/images/pza/instruktor-pza.png"
                alt="Odznaka Instruktor PZA"
                width={120}
                height={120}
                className="size-[120px]"
              />
            </div>
            <div className="flex flex-col gap-3.5">
              {/* The full name only when it says more than the logo beside it —
                  the no-database fallback is the bare brand, which would repeat. */}
              {config.legalName && config.legalName !== BRAND && (
                <p className="text-[15px] font-semibold text-white">{config.legalName}</p>
              )}
              {config.shortDescription && (
                <p className="max-w-[760px] whitespace-pre-line text-[15px] leading-6">
                  {config.shortDescription}
                </p>
              )}
            </div>
          </div>

          <LinkColumn title="Oferta" items={OFFER_NAV} />
          <LinkColumn title="Szkoła" items={SCHOOL_NAV} />

          <div className="col-span-2 md:col-span-1">
            <h2 className="mb-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-rock-500">
              Kontakt
            </h2>
            <ul className="flex flex-col gap-2.5 text-[15px]">
              {config.phone && (
                <li>
                  <a
                    href={`tel:${(config.phoneE164 || config.phone).replace(/[^\d+]/g, '')}`}
                    className="font-semibold text-white hover:text-rope-light"
                  >
                    {config.phone}
                  </a>
                </li>
              )}
              {config.email && (
                <li>
                  <a href={`mailto:${config.email}`} className="hover:text-rope-light">
                    {config.email}
                  </a>
                </li>
              )}
              {address.length > 0 && (
                <li className="leading-[22px]">
                  {address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-rock-500">
          <span>
            © {year} {config.legalName || 'ABC Wspinania'}
          </span>
          {config.pzaLicence && <span>Licencja instruktorska PZA nr {config.pzaLicence}</span>}
        </div>
      </div>
    </footer>
  )
}

function LinkColumn({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <h2 className="mb-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-rock-500">
        {title}
      </h2>
      <ul className="flex flex-col gap-2.5 text-[15px]">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="hover:text-rope-light">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
