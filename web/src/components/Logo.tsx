/**
 * The ABC Wspinania graphic mark.
 *
 * ⚠️ THIS IS A TRACING, NOT THE ORIGINAL. The old site carries the mark only
 * baked into the banner `images/modules/ABC_logo.png`; the diamond with the
 * figure occupies roughly 90×84 px there and is eaten by compression. Too
 * little for a 2× header, a favicon and an OG card, so the shape (a diamond
 * plus a climber with raised arms) was redrawn as a vector — recognisability
 * stays, sharpness holds at every scale.
 *
 * TO BE REPLACED once the client supplies the original as a vector (AI/EPS/SVG).
 * Only this file changes then — nothing else knows the shape of the mark.
 *
 * The colour is inherited via `currentColor`, so the same component works on the
 * light header and the dark footer without a second variant.
 */
export function Mark({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* The diamond — a rotated square, as in the original. */}
      <path d="M24 3 45 24 24 45 3 24Z" fill="currentColor" />
      {/* The figure: head, arms raised in a "V", one leg bent, the other
          straight and reaching outside the diamond — as in the original. Drawn
          as strokes rather than a filled outline: easier to correct once the
          original arrives, and it holds up better at small sizes. */}
      <g stroke="#fff" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M24 19.5V28" />
        <path d="M24 21.5 17.5 14.5M24 21.5 30.5 14.5" />
        <path d="M24 28l-5.5 3.5 1 6.5M24 28l4.5 5 .5 7" />
      </g>
      <circle cx="24" cy="14.2" r="3.4" fill="#fff" />
    </svg>
  )
}

/** The mark together with the name — what stands in the header and the footer. */
export function Logo({
  markSize = 26,
  textSize = 'text-[19px]',
  markColor = 'text-rope',
}: {
  markSize?: number
  textSize?: string
  markColor?: string
}) {
  return (
    <>
      <Mark size={markSize} className={markColor} />
      <span className={`font-display font-extrabold tracking-[-0.025em] ${textSize}`}>
        ABC Wspinania
      </span>
    </>
  )
}
