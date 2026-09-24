import { ImageResponse } from 'next/og'

import { MARK_CENTRE, MARK_DIAMOND, MARK_FIGURE, MARK_HEAD, MARK_VIEW_BOX } from '@/lib/mark'
import { BRAND_COLORS } from '@/lib/site'

/** How much the figure shrinks to sit inside the diamond rather than over it. */
const FIGURE_SCALE = 0.72

/**
 * Visual weight of the figure, in grid units: stroke width and head radius
 * alike. One constant because they are one decision — a favicon legible at
 * 32 px — and two literals sitting next to each other are two chances to
 * change only one.
 */
const FIGURE_WEIGHT = 3.6

// The browser tab icon is generated from code — we keep no binary .ico, which
// cannot be reviewed in a diff or corrected without a graphics editor.
//
// The drawing is a TRACING of the mark from the old site (a diamond with a
// climber's figure). Its geometry comes from `lib/mark.ts`, shared with the
// header and the social card; replacing the mark is an edit there, not here.
//
// This paragraph used to say the opposite — that the path was deliberately
// duplicated and that a replacement had to be made in both files. That was
// true until the geometry moved out, and it survived the move because it sits
// outside the lines the change touched, where reading the diff does not reach
// it. Worth remembering: a comment can be made false by an edit somewhere
// else in the same file.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND_COLORS.surface,
      }}
    >
      {/* The diamond IS drawn here, unlike before. The icon used to be a plain
          accent-coloured square with the figure on it, which reads as a
          pictogram rather than as the school's mark.

          The figure is scaled about the centre by `FIGURE_SCALE` so it sits
          inside the lozenge rather than crossing it; at full size the arms and
          one leg poke out past the edges.

          Stroke width and head radius are DIVIDED by that scale, so both keep
          the absolute size they had before shrinking — `FIGURE_WEIGHT`, thicker
          than the header's 3.3, because thin strokes disappear at 32 px. The side
          effect is deliberate: the skeleton shrinks while its weight does not,
          which leaves the figure stockier and the head proportionally larger
          than in the header. That reads better at icon size than a faithfully
          scaled figure would. */}
      <svg width="32" height="32" viewBox={MARK_VIEW_BOX} fill="none">
        <path d={MARK_DIAMOND} fill={BRAND_COLORS.accent} />
        <g
          transform={`translate(${MARK_CENTRE * (1 - FIGURE_SCALE)} ${MARK_CENTRE * (1 - FIGURE_SCALE)}) scale(${FIGURE_SCALE})`}
        >
          <g
            stroke="#fff"
            strokeWidth={FIGURE_WEIGHT / FIGURE_SCALE}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {MARK_FIGURE.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <circle
            cx={MARK_HEAD.cx}
            cy={MARK_HEAD.cy}
            r={FIGURE_WEIGHT / FIGURE_SCALE}
            fill="#fff"
          />
        </g>
      </svg>
    </div>,
    size,
  )
}
