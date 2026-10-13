'use client'

import { useEffect, useRef } from 'react'

/**
 * Brings a confirmation into view when it appears in place of a form.
 *
 * A sent form is replaced by a short confirmation, the page gets shorter, and
 * the browser keeps the scroll position — the visitor who clicked "Zapisz się"
 * at the bottom of a long form landed on the footer, the confirmation above
 * the screen (reported 10.10.2026). Scrolls only when the confirmation is out
 * of view, so a short page or a confirmation already on screen does not jump.
 * An instant jump, not a smooth scroll: a smooth one does not run in a tab in
 * the background and is unwelcome to people who turned motion off.
 */
export function RevealOnMount({
  className,
  role,
  children,
}: {
  className?: string
  role?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { top, bottom } = el.getBoundingClientRect()
    if (top >= 0 && bottom <= window.innerHeight) return
    el.scrollIntoView({ block: 'center' })
  }, [])
  return (
    <div ref={ref} role={role} className={className}>
      {children}
    </div>
  )
}
