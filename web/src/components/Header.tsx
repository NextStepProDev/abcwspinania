'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'

import { Logo } from './Logo'
import { Phone, Menu, Close } from './Icons'
import { MAIN_NAV, isActive } from './navigation'

/**
 * The site header.
 *
 * A client component SOLELY because of the mobile menu (open state and closing
 * with Escape). The link content renders on the server and is present in the
 * HTML even with JS disabled — CSS collapses it, not a condition in the JSX.
 * The same principle as with collapsible sections (rule 9): Googlebot does not
 * click, so the navigation cannot come into existence only after a click.
 */
export function Header({ phone, telHref }: { phone: string | null; telHref: string | null }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const [previousPathname, setPreviousPathname] = useState(pathname)
  const menuId = useId()

  // Changing page must close the menu — otherwise the panel stays open over the
  // new page after a link is clicked.
  //
  // The state is corrected DURING RENDER, not in a `useEffect`. This is the
  // pattern React documents for "reset state when a prop changes": React aborts
  // the render and repeats it immediately with the new value, without an extra
  // repaint. The effect variant produces a cascade of renders and is caught by
  // the `react-hooks/set-state-in-effect` rule.
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname)
    setOpen(false)
  }

  // Escape closes it. Without that the only way out is hitting a small button,
  // which is a trap for keyboard navigation.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-rock-100 bg-rock-50">
      {/* TRIAL — thin stripe in the old banner's blue (`--color-banner`), purely
          decorative, no text on it. Remove if the client doesn't want it. */}
      <div className="h-[3px] bg-banner" aria-hidden="true" />
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:h-[76px] lg:gap-9 lg:px-20 xl:gap-6 wide:gap-9">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-rock-900">
          <Logo />
        </Link>

        {/* Horizontal navigation — from `xl` up. Measured 24.09.2026: at `lg`
            the eight entries overflowed, "Obozy i wyjazdy" and "O nas" broke
            over two lines up to ~1430px and the sign-up button fell off the
            edge below ~1280px. Below `xl` the menu button takes over, with the
            sign-up button still in the bar. Between `xl` and `wide` the row
            fits only with tighter gaps and the phone shown as an icon alone;
            from `wide` up it is the full design. `whitespace-nowrap` keeps a
            label whole — if the row ever overflows again, move the breakpoint,
            do not let it wrap. */}
        <nav aria-label="Główna" className="hidden grow xl:block">
          <ul className="flex items-center gap-4 whitespace-nowrap wide:gap-[22px]">
            {MAIN_NAV.map((item) => {
              const active = isActive(item.href, pathname)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={
                      active
                        ? 'border-b-2 border-rope pb-0.5 text-[15px] font-semibold text-rock-900'
                        : 'text-[15px] font-medium text-rock-600 hover:text-rock-900'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-0.5 xl:flex">
          {/* `rock-100`, not the lighter `rock-75` the decorative fills moved
              to: this chip is the ACTIVE STATE of the language switch, not
              decoration. Two things mark it — this fill and the darker text
              (PL inherits `rock-900`, EN is `rock-600`) — and the fill is the
              one you notice first. Lightening it would leave the pair leaning
              on a difference between two greys. */}
          <span className="rounded bg-rock-100 px-2.5 py-1.5 text-[13px] font-semibold">PL</span>
          <Link
            href="/en"
            hrefLang="en"
            className="px-2.5 py-1.5 text-[13px] font-semibold text-rock-600 hover:text-rock-900"
          >
            EN
          </Link>
        </div>

        {/* The number in the header: with a caption on a large screen, just the
            icon with a label for screen readers on a small one. Rendered only
            when it is in the CMS — an empty number would give a `tel:` link
            leading nowhere. */}
        {telHref && (
          <a
            href={telHref}
            aria-label={phone ? `Zadzwoń: ${phone}` : 'Zadzwoń'}
            className="ml-auto flex shrink-0 items-center gap-2 text-[15px] font-semibold text-rock-900 xl:ml-0"
          >
            <Phone className="text-rope" />
            <span className="hidden wide:inline">{phone}</span>
          </a>
        )}

        <Link
          href="/kontakt"
          className="hidden shrink-0 rounded-lg bg-banner-fill px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-banner-fill-dark lg:block"
        >
          Zapisz się
        </Link>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
          className="shrink-0 rounded-md p-2 text-rock-900 hover:bg-rock-100 xl:hidden"
        >
          {open ? <Close size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* The collapsible panel — phones and narrow desktops, below `xl`. Hidden
          with the `hidden` attribute rather than cut out of the tree — the
          content stays in the HTML regardless of state. */}
      <div id={menuId} hidden={!open} className="border-t border-rock-100 bg-rock-50 xl:hidden">
        <nav
          aria-label="Główna (rozwijana)"
          className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6 lg:px-20"
        >
          <ul className="flex flex-col">
            {MAIN_NAV.map((item) => {
              const active = isActive(item.href, pathname)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={
                      active
                        ? 'block border-l-2 border-rope py-2.5 pl-3 font-semibold text-rock-900'
                        : 'block border-l-2 border-transparent py-2.5 pl-3 text-rock-600'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
            <li className="mt-2 border-t border-rock-100 pt-3">
              <Link href="/en" hrefLang="en" className="block py-2 pl-3 text-rock-600">
                In English
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
