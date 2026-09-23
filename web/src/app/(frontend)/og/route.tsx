import { ImageResponse } from 'next/og'
import { BRAND, BRAND_COLORS } from '@/lib/site'
import { MARK_DIAMOND, MARK_FIGURE, MARK_HEAD, MARK_VIEW_BOX } from '@/lib/mark'
import { OG_IMAGE_SIZE } from '@/lib/seo'

// The card image shown when a link is shared (Facebook, Messenger, WhatsApp,
// X). The old site had NO Open Graph tags at all — a link posted to Facebook
// showed up with no image and no title.
//
// Deliberately a PLAIN `/og` route rather than the `opengraph-image.tsx` file
// convention: with that one, on pages carrying their own `openGraph` block (and
// ours all do — each has its own title and description), Next dropped og:image
// from the finished HTML of some pages. An explicit URL from `ogImage()` is
// predictable.
//
// force-static = the image is produced once, at build time, rather than on every
// crawler request.
export const dynamic = 'force-static'

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: 80,
        backgroundColor: BRAND_COLORS.ink,
        backgroundImage:
          'radial-gradient(circle at 80% 15%, rgba(200,85,43,0.45), rgba(42,38,32,0) 60%)',
      }}
    >
      {/* Mark plus name. The path traces the same shape as
          `components/Logo.tsx` — satori renders outside the site's React, so
          importing the component would drag its dependencies in. Change the
          mark, change both files. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <svg width="72" height="72" viewBox={MARK_VIEW_BOX} fill="none">
          <path d={MARK_DIAMOND} fill={BRAND_COLORS.accent} />
          <g
            stroke="#fff"
            strokeWidth="3.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {MARK_FIGURE.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <circle cx={MARK_HEAD.cx} cy={MARK_HEAD.cy} r="3.4" fill="#fff" />
        </svg>
        <div
          style={{ display: 'flex', fontSize: 76, color: BRAND_COLORS.surface, fontWeight: 600 }}
        >
          {BRAND}
        </div>
      </div>
      <div style={{ display: 'flex', marginTop: 16, fontSize: 34, color: '#c4b8a6' }}>
        Kursy wspinaczki skalnej z licencją PZA · Jura Krakowsko-Częstochowska
      </div>
    </div>,
    OG_IMAGE_SIZE,
  )
}
