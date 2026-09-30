import Image from 'next/image'

import { FULL_LOGO } from '@/lib/mark'

import { FullLogo } from './Logo'

/**
 * The full logo standing BEHIND the rock in the home page photo, like a sign
 * at the crag: the plate with the name clears the rock, the plain blue part
 * below it is hidden by the rock and the trees.
 *
 * How: an SVG laid over the photo on the photo's own grid (2560 × 1152) with
 * `preserveAspectRatio="xMidYMid slice"` — the SVG equivalent of the photo's
 * `object-cover` at a 50% / 50% focal point — so the logo stays pinned to the
 * rock at every screen width. It is masked by a sky map of that photo
 * (`public/images/hero/`, opaque = sky), so it shows only where there is sky.
 *
 * ⚠️ The mask belongs to ONE photo. It is made from the pixels of
 * `20240828_134954(1).jpg`; over any other photo it would cut the logo along
 * the outline of a rock that is not there. So the scene is used only when the
 * hero photo is one of the files in `photos` with its focal point in the
 * middle (`heroSceneFits`) — otherwise the page falls back to the plain logo.
 * A new photo needs a new mask (the sky is picked by colour: blue, and well
 * bluer than red and green) and new coordinates below.
 *
 * Two files, one picture: `20240828_134954-retusz.jpg` is the same photo with
 * a dark blur (something in front of the lens) painted out of the bottom-right
 * corner, 30.09.2026. The retouch touched only bushes, so the mask fits both
 * — measured, 0.14% of its pixels differ, scattered along edges by the JPEG
 * re-encode. The original stays listed so the scene keeps working until the
 * retouched file replaces it in the panel, on each server separately.
 *
 * ⚠️ The ORIGINAL is stored rotated 180° with an EXIF flag (orientation 3).
 * Browsers and Next's optimizer apply it; a script reading raw pixels does
 * not, and the mask comes out upside down. Rotate first (Pillow:
 * `ImageOps.exif_transpose`). The retouched file is saved already upright,
 * with no flag.
 */
export const SCENE = {
  photos: ['20240828_134954(1).jpg', '20240828_134954-retusz.jpg'] as string[],
  mask: '/images/hero/sky-mask-20240828_134954.png',
  width: 2560,
  height: 1152,
  /**
   * Where the logo stands, in photo pixels. The rock's flat top runs at about
   * y 606 between x 1980 and 2180; the logo's panel sits over that stretch,
   * with the bottom of the plate at y 600, so the plate stays whole and only
   * the panel below it goes behind the rock.
   */
  logo: { x: 1889, y: 313.4, scale: 0.75 },
  /**
   * The PZA instructor badge, in photo pixels, standing BEHIND everything:
   * the rock takes its bottom rim and the logo's plate (drawn after it)
   * covers its right edge, so it peers out from behind both. Over the low
   * line of rock and bushes at y ≈ 690–710; its centre at y 608 keeps the
   * word "PZA" (at 80% of its height, y ≈ 673) above the rock — lower, and
   * the rock covered the word that matters. Its label ("INSTRUKTOR", 55–68%
   * of its height) sits below the plate's bottom edge (y 600), so the plate
   * hides only rope pattern. Kept clear of the heading: at every width from
   * 1280 to 2560 px there are at least 80 px between the heading's right end
   * and the badge.
   */
  badge: { x: 1742, y: 500, size: 216 },
} as const

/** The PZA instructor badge — a static file, see `design/logo/README.md`. */
export const PZA_BADGE = '/images/pza/instruktor-pza.png'

/**
 * The same badge, 440 px WebP, for the SVG scene only. An SVG `<image>` does
 * not go through Next's image optimizer, so it would fetch the 800 px PNG
 * (~430 KB) for a badge shown at most 216 px wide (at 2560 px); 440 covers
 * that on a 2× screen. Regenerate it whenever the PNG changes.
 */
const PZA_BADGE_SCENE = '/images/pza/instruktor-pza-440.webp'

/** Whether the scene's mask matches the hero photo actually on the page. */
export function heroSceneFits(photo: {
  filename?: string | null
  focalX?: number | null
  focalY?: number | null
}) {
  return (
    SCENE.photos.includes(photo.filename ?? '') &&
    (photo.focalX ?? 50) === 50 &&
    (photo.focalY ?? 50) === 50
  )
}

export function HeroSignScene({ className = '' }: { className?: string }) {
  const { x, y, scale } = SCENE.logo
  return (
    <svg
      viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* The one id in this SVG; the scene is rendered once per page (rule 12). */}
        <mask id="hero-sky-mask" maskUnits="userSpaceOnUse">
          <image
            href={SCENE.mask}
            width={SCENE.width}
            height={SCENE.height}
            preserveAspectRatio="none"
          />
        </mask>
      </defs>
      <g mask="url(#hero-sky-mask)">
        <image
          href={PZA_BADGE_SCENE}
          x={SCENE.badge.x}
          y={SCENE.badge.y}
          width={SCENE.badge.size}
          height={SCENE.badge.size}
        />
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
          <path d={FULL_LOGO.panel} className="fill-rope" />
          <path d={FULL_LOGO.sign} className="fill-white" />
          <path d={FULL_LOGO.plate} className="fill-white" />
          <path d={FULL_LOGO.wordmark} className="fill-rope" />
        </g>
      </g>
    </svg>
  )
}

/**
 * On narrow screens the photo is cropped to its middle and the rock is out of
 * frame, so the logo stands near the bottom of the section instead, with the
 * plain panel below the plate fading into the photo — as if the sign stood in
 * the bushes — and the PZA badge beside it. A strip of photo stays visible
 * under them, so the section does not end flush with the plate.
 *
 * The fade starts at the plate's bottom edge: 382.08 / 461.94 = 83% of the
 * logo's height, in `FULL_LOGO_VIEW_BOX` units. The badge ends exactly there
 * (`mb` = the remaining 17%), so the fade never reaches it: 26 px of the
 * 150 px logo, 31 px of the 180 px one.
 */
export function HeroSignAtEdge({ className = '' }: { className?: string }) {
  const fade = 'linear-gradient(to bottom, #000 83%, transparent 100%)'
  return (
    <div
      className={`flex items-end gap-3 ${className}`}
      style={{ maskImage: fade, WebkitMaskImage: fade }}
    >
      <Image
        src={PZA_BADGE}
        alt=""
        width={120}
        height={120}
        className="mb-[26px] size-[96px] sm:mb-[31px] sm:size-[116px]"
      />
      <FullLogo className="h-[150px] w-auto sm:h-[180px]" />
    </div>
  )
}

/**
 * The plain logo and the badge side by side, for the hero at `xl` when the
 * rock mask does not fit the photo (see `heroSceneFits`).
 */
export function HeroSignPlain({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-end gap-4 ${className}`}>
      <Image src={PZA_BADGE} alt="" width={140} height={140} className="mb-[52px] size-[140px]" />
      <FullLogo className="h-[300px] w-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]" />
    </div>
  )
}
