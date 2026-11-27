'use client'

import Image, { getImageProps } from 'next/image'
import { useEffect, useState, useSyncExternalStore } from 'react'

import type { HeroSlide } from '@/lib/format'

/** How long one photo stays before the next fades in, and how long the fade lasts. */
const HOLD_MS = 7000
const FADE_MS = 1600

/** Tailwind's `sm` — the hero's own phone/computer split (`max-sm:` there). */
const PHONE = '(width < 40rem)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * `null` on the server and during hydration, the real answer after it — so
 * the first client render matches the server's HTML exactly.
 */
function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => null,
  )
}

/**
 * The home page hero: photos that fade one into the next, each drifting in a
 * slow zoom anchored on its focal point (`.hero-drift` in globals.css).
 *
 * Two lists — `wide` for a computer, `tall` for a phone — come from the two
 * panel collections (`collections/HeroPhotos.ts`); the page has already filled
 * a missing list from the other one.
 *
 * The FIRST photo is rendered on the server as a `<picture>` with a source per
 * shape, so the browser fetches only the one it will show, at page load and
 * without JavaScript. The rest exist only on the client, which by then knows
 * the screen: each is mounted one step before its turn (loading while the
 * current one is on), never all at once — twelve full-width photos fetched at
 * the start would compete with the page itself.
 *
 * With "reduce motion" set in the system there is no drift and no rotation:
 * the first photo stays.
 */
export function HeroSlideshow({ wide, tall }: { wide: HeroSlide[]; tall: HeroSlide[] }) {
  const phone = useMediaQuery(PHONE)
  const reducedMotion = useMediaQuery(REDUCED_MOTION)
  const slides = phone === null ? null : phone ? tall : wide
  const rotate = slides !== null && slides.length > 1 && reducedMotion === false

  return (
    // `isolate`: the slides' own z-index stays inside, under the tint and the text.
    <div className="absolute inset-0 isolate" aria-hidden="true">
      <FirstPhoto wide={wide[0]} tall={tall[0]} />
      {rotate && (
        // Keyed by the list, so turning a tablet between the two shapes
        // starts the other list from its beginning instead of mid-way.
        <Rotation key={phone ? 'tall' : 'wide'} slides={slides} />
      )}
    </div>
  )
}

/**
 * The photo in the HTML. Its focal point is per shape, but a `<picture>` has
 * one `<img>` — so both points go in as CSS variables and `.hero-photo`
 * picks one with the same media query as the `<source>`.
 */
function FirstPhoto({ wide, tall }: { wide: HeroSlide; tall: HeroSlide }) {
  const common = { fill: true, sizes: '100vw', alt: wide.alt } as const
  const {
    props: { srcSet: tallSrcSet },
  } = getImageProps({ ...common, src: tall.url })
  const {
    props: { srcSet: wideSrcSet, style, ...rest },
  } = getImageProps({ ...common, src: wide.url, loading: 'eager', fetchPriority: 'high' })
  const vars = {
    '--hero-pos': wide.position,
    '--hero-pos-phone': tall.position,
  } as React.CSSProperties

  return (
    <picture>
      {tall.url !== wide.url && <source media={PHONE} srcSet={tallSrcSet} />}
      {/* Props from `getImageProps` — the alt is in `rest`. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img
        {...rest}
        srcSet={wideSrcSet}
        style={{ ...style, ...vars }}
        className="hero-photo hero-drift object-cover"
      />
    </picture>
  )
}

/**
 * The whole list, stacked over the server's photo. The one coming in fades in
 * ON TOP of the one going out, which stays fully opaque under it until the
 * fade ends — fading both at once would dip the hero towards its dark
 * background halfway.
 *
 * The first photo is not mounted again until just before its turn comes
 * back: the server's copy is on screen and drifting, and a second copy on top
 * would restart its zoom with a visible jump. When its turn comes, it fades in
 * like any other (the browser has the file), with its zoom from the start.
 */
function Rotation({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0)
  const [previous, setPrevious] = useState<number | null>(null)
  const [lapped, setLapped] = useState(false)
  const count = slides.length

  useEffect(() => {
    const next = setTimeout(() => {
      setPrevious(index)
      setIndex((index + 1) % count)
      if (index + 1 === count) setLapped(true)
    }, HOLD_MS)
    return () => clearTimeout(next)
  }, [index, count])

  // Once the fade is over, the photo that went out is let go: hidden, and its
  // zoom reset, so that when its turn comes again it starts from the beginning.
  useEffect(() => {
    if (previous === null) return
    const done = setTimeout(() => setPrevious(null), FADE_MS)
    return () => clearTimeout(done)
  }, [previous])

  const upcoming = (index + 1) % count

  return slides.map((slide, i) => {
    const active = i === index
    const leaving = i === previous
    // The next photo is mounted once the last fade is over: still seconds
    // before its turn, and never as a second copy of the one going out (with
    // two photos, the one leaving IS the next one).
    const preparing = previous === null && i === upcoming
    if (!active && !leaving && !preparing) return null
    if (i === 0 && !lapped && !preparing) return null
    return (
      <div
        key={i}
        className="absolute inset-0"
        style={{
          zIndex: active ? 2 : 1,
          opacity: active || leaving ? 1 : 0,
          transition: active ? `opacity ${FADE_MS}ms ease-in-out` : 'none',
        }}
      >
        <Image
          src={slide.url}
          alt={slide.alt}
          fill
          sizes="100vw"
          loading="eager"
          className={`hero-photo object-cover ${active || leaving ? 'hero-drift' : ''} ${i % 2 ? 'hero-drift-out' : ''}`}
          style={{ '--hero-pos': slide.position } as React.CSSProperties}
        />
      </div>
    )
  })
}
