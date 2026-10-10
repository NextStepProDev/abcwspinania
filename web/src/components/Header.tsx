'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'

import { Logo } from './Logo'
import { Phone, Menu, Close, Person } from './Icons'
import { useLoggedIn } from './useAccount'
import { LANGUAGES, MAIN_NAV, isActive, languageOf } from './navigation'

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
  const currentLanguage = languageOf(pathname)
  const otherLanguage = LANGUAGES.find((language) => language.code !== currentLanguage)!
  const loggedIn = useLoggedIn(pathname)
  const account = loggedIn
    ? { href: '/konto', label: 'Moje konto' }
    : { href: '/logowanie', label: 'Zaloguj się' }

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
      {/* TRIAL — thin stripe in the logo blue, purely decorative, no text on
          it. Remove if the client doesn't want it. */}
      <div className="h-[3px] bg-rope" aria-hidden="true" />
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:h-[76px] lg:gap-9 lg:px-20 xl:gap-5 wide:gap-9">
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
        {/* Each link is exactly the box of its label: clickable over the whole
            word, gaps between letters included, and nowhere else. Set
            01.10.2026, after a version where every entry stretched to the
            full header height with the gaps folded into its padding — the
            pointer turned into a hand over empty space around and between
            the labels, which read as broken. The active underline is drawn by
            `after:`, outside the layout, so it adds no height: as a border it
            made the active entry 4 px taller and, centred, 2 px higher than
            its neighbours. It sits on an inner span, measured from the
            bottom of the glyphs: on the link it would measure from the
            bottom of the 22.5 px line box and drop 2.5 px lower (measured).
            2 px thick, 2 px below the text. */}
        <nav aria-label="Główna" className="hidden grow xl:block">
          <ul className="flex items-center gap-4 whitespace-nowrap wide:gap-[22px]">
            {MAIN_NAV.map((item) => {
              const active = isActive(item.href, pathname)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block text-[15px] ${
                      active
                        ? 'font-semibold text-rock-900'
                        : 'font-medium text-rock-600 hover:text-rock-900'
                    }`}
                  >
                    <span
                      className={
                        active
                          ? 'relative after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-rope'
                          : undefined
                      }
                    >
                      {item.label}
                    </span>
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
              (the active chip inherits `rock-900`, the link is `rock-600`) —
              and the fill is the one you notice first. Lightening it would
              leave the pair leaning on a difference between two greys. */}
          {/* The chip follows the page: on `/en` EN is the active one and PL
              links back to the Polish homepage. A fixed "PL active, EN link"
              pair left `/en` with a switch pointing at itself and no way back.
              `aria-current="true"`, not `"page"`: on `/kursy` the PL chip marks
              the current language, not the current page. No `aria-label`: the
              spoken name must contain the visible "PL"/"EN" (WCAG 2.5.3), or a
              voice-control user saying "click PL" hits nothing. */}
          {LANGUAGES.map((language) =>
            language.code === currentLanguage ? (
              <span
                key={language.code}
                aria-current="true"
                className="rounded bg-rock-100 px-2.5 py-1.5 text-[13px] font-semibold"
              >
                {language.short}
              </span>
            ) : (
              <Link
                key={language.code}
                href={language.href}
                hrefLang={language.code}
                lang={language.code}
                className="px-2.5 py-1.5 text-[13px] font-semibold text-rock-600 hover:text-rock-900"
              >
                {language.short}
              </Link>
            ),
          )}
        </div>

        {/* Phone and account, side by side as two icons, 20 px apart (widened
            from 12 on request, 02.10.2026 — measured to still fit at 1280 px).
            One group rather than two items in the row's own gap: the row was
            tuned to the pixel before the account link existed.

            The number is an ICON ONLY at every width (decided 02.10.2026,
            to make room for the account link): measured, the spelled-out
            number from `wide` up plus the account link pushed "Zapisz się"
            70 px past the edge, and at 1280 px the account link alone was
            27 px too many. Hence also: each icon's padding (the click target)
            is taken back by an equal negative margin, so it costs no width,
            and the row's gap at `xl` went from 24 to 20 px. The number stays in the hover hint, the spoken
            label, the footer, /kontakt and the phone's bottom bar.

            The phone renders only when it is in the CMS — an empty number
            would give a `tel:` link leading nowhere. The account link is
            desktop-only here; the phone menu spells it out below. */}
        <div className="ml-auto flex shrink-0 items-center gap-5 xl:ml-0">
          {telHref && (
            <a
              href={telHref}
              aria-label={phone ? `Zadzwoń: ${phone}` : 'Zadzwoń'}
              title={phone ?? undefined}
              className="-m-1.5 flex items-center rounded-md p-1.5 text-rope hover:bg-rock-100"
            >
              <Phone size={18} />
            </a>
          )}
          <Link
            href={account.href}
            aria-label={account.label}
            title={account.label}
            className="-m-1.5 hidden items-center rounded-md p-1.5 text-rope hover:bg-rock-100 lg:flex"
          >
            <Person size={20} />
          </Link>
        </div>

        <Link
          href="/terminarz"
          className="hidden shrink-0 rounded-lg bg-rope px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-rope-dark lg:block"
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
                        ? 'block origin-left border-l-2 border-rope py-2.5 pl-3 font-semibold text-rock-900'
                        : 'block origin-left border-l-2 border-transparent py-2.5 pl-3 text-rock-600'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
            <li className="mt-2 border-t border-rock-100 pt-3">
              <Link
                href={account.href}
                className="flex origin-left items-center gap-2 py-2 pl-3 font-semibold text-rock-900"
              >
                <Person size={18} className="text-rope" />
                {account.label}
              </Link>
            </li>
            <li>
              <Link
                href={otherLanguage.href}
                hrefLang={otherLanguage.code}
                lang={otherLanguage.code}
                className="block origin-left py-2 pl-3 text-rock-600"
              >
                {otherLanguage.label}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
