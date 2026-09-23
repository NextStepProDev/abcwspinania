import { ImageResponse } from 'next/og'
import { BRAND } from '@/lib/site'
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
        backgroundColor: '#2a2620',
        backgroundImage:
          'radial-gradient(circle at 80% 15%, rgba(200,85,43,0.45), rgba(42,38,32,0) 60%)',
      }}
    >
      {/* Mark plus name. The path traces the same shape as
          `components/Logo.tsx` — satori renders outside the site's React, so
          importing the component would drag its dependencies in. Change the
          mark, change both files. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <svg width="72" height="72" viewBox="0 0 48 48" fill="none">
          <path d="M24 3 45 24 24 45 3 24Z" fill="#c8552b" />
          <g
            stroke="#fff"
            strokeWidth="3.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <path d="M24 19.5V28" />
            <path d="M24 21.5 17.5 14.5M24 21.5 30.5 14.5" />
            <path d="M24 28l-5.5 3.5 1 6.5M24 28l4.5 5 .5 7" />
          </g>
          <circle cx="24" cy="14.2" r="3.4" fill="#fff" />
        </svg>
        <div style={{ display: 'flex', fontSize: 76, color: '#f7f5f1', fontWeight: 600 }}>
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
