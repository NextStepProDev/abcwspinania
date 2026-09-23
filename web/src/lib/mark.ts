/**
 * The geometry of the ABC Wspinania mark — the ONE place its shape is written.
 *
 * ⚠️ THIS IS A TRACING, NOT THE ORIGINAL. The old site carries the mark only
 * baked into the banner `images/modules/ABC_logo.png`, where the diamond with
 * the figure occupies roughly 90×84 px and is eaten by compression — too little
 * for a 2× header, a favicon and a social card, so the shape was redrawn as a
 * vector. To be replaced once the client supplies the original (AI/EPS/SVG) —
 * `ZAKRES.md`, item 4.
 *
 * Keep that banner path in this comment. It is the only record anywhere in the
 * repository of where the source image lives, and it is what a replacement gets
 * compared against.
 *
 * It lives here because the mark is drawn in three places, through two
 * different renderers: the header and footer go through React in the browser,
 * while the favicon and the social card are turned into images on the server by
 * Satori, which supports only a subset of what React does. A shared component
 * is not impossible — it would need a prop for every difference below — but it
 * would tie three genuinely different renderings to one shape of API. Sharing
 * the data instead costs nothing and cannot drift.
 *
 * Before this file, the path data was copied into all three, and `Logo.tsx`
 * carried a comment promising that replacing the mark "only changes this file".
 * That was untrue: the favicon and the social card would have kept the tracing,
 * and nobody would have noticed until a link was shared somewhere.
 *
 * What is NOT here, deliberately: stroke width, radius and fill. Those
 * legitimately differ per context — the favicon draws the figure thicker (3.6
 * against 3.3) because thin strokes disappear at 32 px, and it omits the
 * diamond entirely, since its own background is the accent colour. Sharing the
 * geometry is the point; sharing the rendering would force three different
 * needs through one set of values.
 */

/** Every copy of the mark is drawn on this grid. */
export const MARK_VIEW_BOX = '0 0 48 48'

/** The diamond — a rotated square, as in the original. */
export const MARK_DIAMOND = 'M24 3 45 24 24 45 3 24Z'

/**
 * The climber: torso, arms raised in a "V", one leg bent and one straight,
 * reaching outside the diamond. Strokes rather than a filled outline — easier
 * to correct when the original arrives, and it holds up at small sizes.
 */
/** ⚠️ Keep these distinct — each is used as its own React key where drawn. */
export const MARK_FIGURE = [
  'M24 19.5V28',
  'M24 21.5 17.5 14.5M24 21.5 30.5 14.5',
  'M24 28l-5.5 3.5 1 6.5M24 28l4.5 5 .5 7',
] as const

/** The head. Its radius is a per-context choice, so it is not fixed here. */
export const MARK_HEAD = { cx: 24, cy: 14.2 } as const
