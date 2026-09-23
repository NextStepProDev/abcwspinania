import { ImageResponse } from 'next/og'

import { MARK_FIGURE, MARK_HEAD, MARK_VIEW_BOX } from '@/lib/mark'

// The browser tab icon is generated from code — we keep no binary .ico, which
// cannot be reviewed in a diff or corrected without a graphics editor.
//
// The drawing is a TRACING of the mark from the old site (a diamond with a
// climber's figure) — the same shape as in `components/Logo.tsx`. Duplicating
// the path is deliberate here: `ImageResponse` renders through satori, in a
// separate environment without the site's React, so importing the component
// would drag its dependencies in. When you replace the mark, replace BOTH
// files.
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
        background: '#c8552b',
      }}
    >
      {/* No diamond here: this icon's own background is the accent colour, so
          drawing one would only shave the figure down. Strokes are thicker than
          in the header (3.6 against 3.3) because thin ones vanish at 32 px. */}
      <svg width="32" height="32" viewBox={MARK_VIEW_BOX} fill="none">
        <g stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {MARK_FIGURE.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <circle cx={MARK_HEAD.cx} cy={MARK_HEAD.cy} r="3.6" fill="#fff" />
      </svg>
    </div>,
    size,
  )
}
