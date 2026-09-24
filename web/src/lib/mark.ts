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

/**
 * The middle of that grid. Named because anything scaling the figure has to
 * scale it ABOUT this point, and writing `24` at the call site would be a
 * literal that silently stops matching if the grid above ever changes.
 */
export const MARK_CENTRE = 24

/**
 * The diamond. Its corners are ROUNDED, as on the original: the school's mark
 * is a road-sign lozenge, not a sharp rotated square. The first tracing had
 * sharp corners because the only reference was a 90×84 px crop where the
 * rounding was lost to compression. A larger banner supplied on 24.09.2026
 * (`ABCWSPINANIA.jpg`, the mark photographed on a signpost) showed it clearly.
 *
 * Quadratic curves rather than a stroke with round joins: this shape is FILLED,
 * and a fill does not round its own corners. The control points come from
 * offsetting 4 units along each edge from every corner — rendered at 2.5, 4.0
 * and 5.5 and compared against the banner before settling here.
 */
export const MARK_DIAMOND =
  'M21.17 6.43Q24 3.6 26.83 6.43L41.57 21.17Q44.4 24 41.57 26.83L26.83 41.57Q24 44.4 21.17 41.57L6.43 26.83Q3.6 24 6.43 21.17Z'

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
