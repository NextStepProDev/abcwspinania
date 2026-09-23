'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { focusTrapTarget, GALLERY_PATH, tileDomId, type FocusPosition } from '@/lib/gallery'

/**
 * The only interactive part of the gallery.
 *
 * Everything the overlay does with a mouse is plain links rendered on the
 * server; this adds what HTML has no way of expressing — the keyboard, the
 * focus trap and the scroll lock. Without JavaScript the overlay still opens,
 * pages and closes, which is why this component carries no markup of its own
 * beyond the dialog wrapper.
 *
 * Paging does NOT unmount this component: only the photo inside changes, while
 * the address keeps a `zdjecie` parameter. That is why the state below is split
 * the way it is.
 */
export function GalleryLightboxBehavior({
  children,
  currentId,
  previousHref,
  nextHref,
}: {
  children: React.ReactNode
  currentId: number
  previousHref: string | null
  nextHref: string | null
}) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Read during cleanup, so it has to be the CURRENT photo, not the one this
  // component opened with. Someone who pages 17 → 18 → 19 and closes must land
  // back on tile 19; a value captured in the effect below would return them to
  // 17 and scroll the page somewhere else entirely.
  //
  // Synced from an effect rather than during render: React forbids writing to a
  // ref while rendering, and `react-hooks/refs` enforces it.
  const currentIdRef = useRef(currentId)
  useEffect(() => {
    currentIdRef.current = currentId
  }, [currentId])

  // Runs once per viewing session, NOT per photo — hence the empty dependency
  // list. Moving focus on every arrow press would interrupt a screen reader
  // mid-sentence.
  useEffect(() => {
    dialogRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      document.getElementById(tileDomId(currentIdRef.current))?.focus()
    }
  }, [])

  // Separate effect: these addresses change with every photo, so the listener
  // has to be rebound or the arrows would keep navigating to the first pair.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // `router.push`, never `router.back()`: someone may have arrived
        // straight from a saved link, with no gallery page behind them in this
        // tab's history.
        router.push(GALLERY_PATH, { scroll: false })
        return
      }

      if (event.key === 'ArrowLeft' && previousHref) {
        router.push(previousHref, { scroll: false })
        return
      }

      if (event.key === 'ArrowRight' && nextHref) {
        router.push(nextHref, { scroll: false })
        return
      }

      if (event.key === 'Tab') {
        const dialog = dialogRef.current
        const focusable = dialog?.querySelectorAll<HTMLElement>('a[href]')
        if (!dialog || !focusable || focusable.length === 0) return

        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        const active = document.activeElement

        const position: FocusPosition =
          active === dialog
            ? 'container'
            : first === last
              ? 'only'
              : active === first
                ? 'first'
                : active === last
                  ? 'last'
                  : 'middle'

        const target = focusTrapTarget(event.shiftKey, position)
        if (!target) return

        event.preventDefault()
        ;(target === 'first' ? first : last).focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [router, previousHref, nextHref])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Powiększone zdjęcie"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-rock-950/95 p-4 outline-none sm:p-6"
    >
      {children}
    </div>
  )
}
