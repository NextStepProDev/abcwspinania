import Link from 'next/link'

import { Phone } from './Icons'

/**
 * The bar pinned to the bottom of the screen with a phone number and a sign-up
 * call to action — from the mobile design.
 *
 * Visible below `lg` only, because on desktop the same actions sit in the
 * header.
 *
 * The bar covers the bottom of the screen permanently, so `<body>` gets a
 * matching `padding-bottom` (see the layout) — without it the bar would hide the
 * last line of the footer, and nobody would notice on desktop, where there is no
 * bar.
 */
export function MobileActionBar({
  phone,
  telHref,
}: {
  phone: string | null
  telHref: string | null
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-rock-200 bg-rock-50/95 px-4 py-2.5 backdrop-blur lg:hidden">
      {telHref && (
        <a
          href={telHref}
          aria-label={phone ? `Zadzwoń: ${phone}` : 'Zadzwoń'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-rock-300 text-rock-900"
        >
          <Phone size={19} className="text-rope" />
        </a>
      )}
      <Link
        href="/kontakt"
        className="flex h-11 grow items-center justify-center rounded-lg bg-banner-fill px-5 font-semibold text-white"
      >
        Zapisz się na kurs
      </Link>
    </div>
  )
}
