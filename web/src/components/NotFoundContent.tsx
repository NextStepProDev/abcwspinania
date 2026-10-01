import Link from 'next/link'

import { Mark } from './Logo'
import { MountainBackdrop } from './MountainBackdrop'
import { Calendar, Certificate, Envelope, Mountains } from './Icons'
import { MAIN_NAV } from './navigation'
import { Button, Container } from './Ui'

/**
 * The "no such page" content, shared by both ways a visitor gets there:
 * `(frontend)/not-found.tsx` (a page called `notFound()`, e.g. a course that
 * does not exist) and `app/global-not-found.tsx` (an address no route matches
 * at all). One component, so the two cannot drift apart.
 *
 * Carries the page's single <h1> (rule 11).
 */

/** Where people most often meant to go, each with one line of why. */
const SHORTCUTS = [
  { href: '/kursy', Icon: Certificate, text: 'Od pierwszego wejścia w skałę po kurs PZA.' },
  { href: '/obozy', Icon: Mountains, text: 'Obozy dla dzieci i młodzieży, wycieczki, jaskinie.' },
  { href: '/terminarz', Icon: Calendar, text: 'Najbliższe terminy i wolne miejsca.' },
  { href: '/kontakt', Icon: Envelope, text: 'Zapytaj o termin albo kurs indywidualny.' },
] as const

/**
 * The label comes from the main navigation, so a renamed menu entry renames
 * the tile too. A shortcut whose address left the menu is dropped rather than
 * shown under a stale name.
 */
const shortcuts = SHORTCUTS.flatMap((s) => {
  const item = MAIN_NAV.find((n) => n.href === s.href)
  return item ? [{ ...s, label: item.label }] : []
})

export function NotFoundContent() {
  return (
    <main>
      <section className="relative isolate overflow-hidden bg-rock-950">
        <MountainBackdrop variant="short" />
        <div className="absolute inset-0 bg-rock-950/65" />
        <Container className="relative flex flex-col items-start gap-5 py-14 lg:py-20">
          {/* The real sign's arrangement: white lozenge, the dark ground
              showing through the climber. */}
          <Mark size={88} className="text-white" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-rope-light">
            404 · zejście ze szlaku
          </p>
          <h1 className="max-w-[760px] text-balance text-[36px] leading-[1.03] text-white lg:text-[56px]">
            Tej drogi nie ma w przewodniku
          </h1>
          <p className="max-w-[600px] text-[17px] leading-7 text-rock-fg-strong">
            {/* A non-breaking space before the dash: in Polish typesetting a dash
                must not start a line. */}
            Adres mógł się zmienić albo w linku wkradła się literówka. Wróć na szlak{'\u00a0'}—
            tędy:
          </p>
          <div className="mt-2 flex flex-wrap gap-3.5">
            <Button href="/" large withArrow>
              Strona główna
            </Button>
            <Button href="/kursy" variant="outlineLight" large>
              Zobacz kursy
            </Button>
          </div>
        </Container>
      </section>

      <Container className="py-12 lg:py-16">
        <h2 className="text-[24px] leading-tight lg:text-[28px]">Najczęściej szukane</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {shortcuts.map(({ href, label, text, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full flex-col gap-2.5 rounded-xl border border-rock-200 bg-white p-5 transition-colors hover:border-rope focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rope"
              >
                <Icon size={24} className="text-rope" />
                <span className="font-semibold text-rock-900">{label}</span>
                <span className="text-[14px] leading-5 text-rock-600">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  )
}
