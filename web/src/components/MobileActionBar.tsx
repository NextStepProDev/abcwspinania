'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Phone } from './Icons'
import { signUpHref } from './navigation'

/**
 * The bar pinned to the bottom of the screen with a phone number and a sign-up
 * call to action — from the mobile design.
 *
 * Visible below `lg` only, because on desktop the same actions sit in the
 * header.
 *
 * Not on pages with a form (`signUpHref`). Where it shows, it covers the
 * bottom of the screen, so it brings its own spacer of the same height after
 * the footer — without it the bar would hide the last line of the footer, and
 * nobody would notice on desktop, where there is no bar. The spacer used to
 * be `padding-bottom` on `<body>`, which left an empty strip on the pages
 * without the bar.
 */
export function MobileActionBar({
  phone,
  telHref,
}: {
  phone: string | null
  telHref: string | null
}) {
  // Not on forms: on the booking form it led away to the schedule, mid-form
  // (12.10.2026). The page's own call takes its place (`signUpHref`).
  const signUp = signUpHref(usePathname() ?? '/')
  if (!signUp) return null
  return (
    <>
      <div aria-hidden="true" className="h-[68px] shrink-0 lg:hidden" />
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
          href={signUp}
          className="flex h-11 grow items-center justify-center rounded-lg bg-rope px-5 font-semibold text-white"
        >
          Zapisz się
        </Link>
      </div>
    </>
  )
}
