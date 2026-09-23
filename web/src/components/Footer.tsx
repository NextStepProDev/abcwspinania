import Link from 'next/link'

import type { SiteConfig } from '@/payload-types'
import { Logo } from './Logo'
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

        <div className="grid gap-10 border-b border-rock-line py-11 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-12">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5 text-white">
              <Logo markSize={24} textSize="text-[18px]" markColor="text-rope" />
            </div>
            {config.shortDescription && (
              <p className="max-w-[320px] text-[15px] leading-6">{config.shortDescription}</p>
            )}
          </div>

          <LinkColumn title="Oferta" items={OFFER_NAV} />
          <LinkColumn title="Szkoła" items={SCHOOL_NAV} />

          <div>
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
