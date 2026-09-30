import { ImageResponse } from 'next/og'
import { BRAND, BRAND_COLORS } from '@/lib/site'
import { MARK_PATH, MARK_VIEW_BOX } from '@/lib/mark'
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
        // The opacity (0.55) is judged by eye, not measured: the glow reads as
        // a shift in HUE against a warm near-black, which a contrast ratio
        // does not capture, and it is decoration, so no threshold applies.
        backgroundImage:
          'radial-gradient(circle at 80% 15%, rgba(0,72,146,0.55), rgba(42,38,32,0) 60%)',
      }}
    >
      {/* Sign plus name. The geometry comes from `lib/mark.ts`, shared with
          the header and the icons — satori renders outside the site's React,
          so this draws the path itself rather than reusing the component.

          Painted white, the climber-shaped hole shows the card's dark ground:
          a white lozenge with a dark climber, the real sign's arrangement. A
          blue sign would measure 1.68 against `ink` and all but vanish — the
          old navy one did exactly that here, unnoticed until someone
          downloaded the generated image and looked at it. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <svg width="80" height="80" viewBox={MARK_VIEW_BOX}>
          <path d={MARK_PATH} fill="#fff" />
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
