import { ImageResponse } from 'next/og'

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
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <g stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M24 19.5V28" />
          <path d="M24 21.5 17.5 14.5M24 21.5 30.5 14.5" />
          <path d="M24 28l-5.5 3.5 1 6.5M24 28l4.5 5 .5 7" />
        </g>
        <circle cx="24" cy="14.2" r="3.6" fill="#fff" />
      </svg>
    </div>,
    size,
  )
}
