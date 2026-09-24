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
        // A decorative glow in the top corner. The channels are `accent` and
        // `ink` written out in decimal, where a search for the hex will not
        // find them — `lib/site.ts` records that.
        //
        // Opacity went 0.45 → 0.55 when the accent changed from orange to
        // navy, on the assumption that a darker colour needed more of it.
        // Measured afterwards, that assumption was wrong: against `ink` the
        // glow moves from 1.05 to 1.07 luminance contrast, which is nothing.
        // It was left at 0.55 anyway, because luminance is the wrong measure
        // here — the glow reads as a shift in HUE against a warm near-black,
        // which a contrast ratio does not capture, and it is decoration, so no
        // threshold applies to it. Judged by looking at the rendered card.
        backgroundImage:
          'radial-gradient(circle at 80% 15%, rgba(27,44,113,0.55), rgba(42,38,32,0) 60%)',
      }}
    >
      {/* Mark plus name. The geometry comes from `lib/mark.ts`, shared with the
          header and the favicon — satori renders outside the site's React, so
          this draws the shape itself rather than reusing the component, but the
          path data is no longer copied. Replacing the mark is an edit there.

          This comment used to end "change both files", left over from when the
          path WAS duplicated. It stayed wrong through the move because it sits
          outside the lines that changed. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <svg width="72" height="72" viewBox={MARK_VIEW_BOX} fill="none">
          {/* White lozenge, navy climber — the real sign's arrangement, same as
              the footer. Forced here anyway: this card's ground is `ink`, where
              a navy lozenge measures 1.18 contrast. The lozenge WAS navy,
              present and all but invisible, until someone downloaded the
              generated image and looked at it. Nothing failed — the route
              answered 200 and the build passed. */}
          <path d={MARK_DIAMOND} fill="#fff" />
          <g
            stroke={BRAND_COLORS.accent}
            strokeWidth="3.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {MARK_FIGURE.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <circle cx={MARK_HEAD.cx} cy={MARK_HEAD.cy} r="3.4" fill={BRAND_COLORS.accent} />
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
