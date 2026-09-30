import { ImageResponse } from 'next/og'

import { MARK_PATH, MARK_VIEW_BOX } from '@/lib/mark'
import { BRAND_COLORS } from '@/lib/site'

/** Home-screen icon sizes, served by `app-icon/[size]` and listed in the manifest. */
export const APP_ICON_SIZES = [192, 512] as const

/**
 * The sign as a square app icon: a white lozenge with the climber on the
 * accent blue — the arrangement of the original logo, where the sign sits on
 * the blue panel and the climber is that panel showing through.
 *
 * One drawing for every icon the site hands out (browser tab, iPhone home
 * screen, Android home screen), differing only in size and margin. They are
 * generated from `lib/mark.ts` rather than kept as PNG files, which could not
 * be reviewed in a diff and would silently keep the old mark after a change.
 *
 * `inset` is the margin on each side as a fraction of the icon. The lozenge
 * touches all four edges of its grid, so this is the only thing keeping its
 * tips off the edge of the icon.
 */
export function signIcon(px: number, inset: number) {
  const sign = Math.round(px * (1 - 2 * inset))
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND_COLORS.accent,
      }}
    >
      <svg width={sign} height={sign} viewBox={MARK_VIEW_BOX}>
        <path d={MARK_PATH} fill="#fff" />
      </svg>
    </div>,
    { width: px, height: px },
  )
}
