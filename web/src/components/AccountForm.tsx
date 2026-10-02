import Link from 'next/link'

import { Container } from '@/components/Ui'

/**
 * Building blocks of the account pages (login, registration, password).
 *
 * Page frame and messages only — plain markup, usable from server and client
 * components alike. The fields, which keep state (live validation), are in
 * `AccountFields.tsx`.
 */

/** Page frame: heading, one sentence of explanation, a narrow white card. */
export function AccountPage({
  title,
  intro,
  children,
  footer,
}: {
  title: string
  intro?: React.ReactNode
  children: React.ReactNode
  /** Links under the card, e.g. "Nie masz konta? Załóż je". */
  footer?: React.ReactNode
}) {
  return (
    <main>
      {/* The narrow column sits INSIDE Container: a second max-width class on
          Container itself would fight its own, decided silently by CSS order. */}
      <Container className="pb-16 pt-10 lg:pb-24 lg:pt-14">
        <div className="mx-auto max-w-[560px]">
          <h1 className="text-balance text-[32px] leading-[1.1] lg:text-[40px]">{title}</h1>
          {intro && <p className="mt-3 text-[17px] leading-7 text-rock-600">{intro}</p>}
          <div className="mt-8 rounded-2xl border border-rock-200 bg-white p-6 lg:p-8">
            {children}
          </div>
          {footer && <div className="mt-6 flex flex-col gap-2 text-rock-600">{footer}</div>}
        </div>
      </Container>
    </main>
  )
}

/** A form-level message. `role="alert"` makes a screen reader announce it. */
export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-rope bg-rope-soft px-4 py-3 text-rope-dark">
      {children}
    </p>
  )
}

/** A confirmation in place of the form — `role="status"` is announced too. */
export function FormDone({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div role="status">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="mt-2 text-rock-600">{children}</div>}
    </div>
  )
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-rope underline-offset-4 hover:underline">
      {children}
    </Link>
  )
}
