import { MARK_DIAMOND, MARK_FIGURE, MARK_HEAD, MARK_VIEW_BOX } from '@/lib/mark'

/**
 * The ABC Wspinania graphic mark.
 *
 * The shape itself lives in `lib/mark.ts`, because it is drawn in three places:
 * here, in the favicon and on the social card. This file decides how it is
 * PAINTED — the diamond in `currentColor`, strokes at 3.3 — not what it looks
 * like.
 *
 * Swapping the tracing for the real mark is therefore an edit to `lib/mark.ts`,
 * PROVIDED the new one is built the same way: a diamond, a stroked figure, a
 * round head. If it is not — no diamond, or a wordmark beside the symbol — then
 * all three painting sites need revisiting as well. What is shared is the
 * geometry, not the composition, and saying otherwise is how the last comment
 * here ended up untrue.
 *
 * The colour is inherited via `currentColor`, so the same component works on the
 * light header and the dark footer without a second variant.
 */
export function Mark({
  className,
  size = 26,
  figureColor = '#fff',
}: {
  className?: string
  size?: number
  /**
   * Colour of the climber inside the lozenge.
   *
   * The mark exists in two arrangements. On a light ground the lozenge is navy
   * and the figure white; on a dark one the lozenge is light and the figure
   * takes the panel's colour, because navy on `rock-900` measures 1.18 contrast
   * and disappears. Both come out at 12.76.
   *
   * Worth knowing which is which: the REAL sign is the second one — a white
   * lozenge with a navy climber. The light-ground version used in the header is
   * the departure from it, not the other way round.
   */
  figureColor?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK_VIEW_BOX}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d={MARK_DIAMOND} fill="currentColor" />
      <g
        stroke={figureColor}
        strokeWidth="3.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {MARK_FIGURE.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle cx={MARK_HEAD.cx} cy={MARK_HEAD.cy} r="3.4" fill={figureColor} />
    </svg>
  )
}

/** The mark together with the name — what stands in the header and the footer. */
export function Logo({
  markSize = 26,
  textSize = 'text-[19px]',
  markColor = 'text-rope',
  figureColor,
}: {
  markSize?: number
  textSize?: string
  markColor?: string
  /** Passed through to `Mark` — see there. Needed on dark panels. */
  figureColor?: string
}) {
  return (
    <>
      <Mark size={markSize} className={markColor} figureColor={figureColor} />
      <span className={`font-display font-extrabold tracking-[-0.025em] ${textSize}`}>
        ABC Wspinania
      </span>
    </>
  )
}
