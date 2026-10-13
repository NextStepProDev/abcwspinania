import { FullLogo } from './Logo'

/**
 * The full logo in the home page hero, below `xl` only. The photo is cropped
 * to its middle there, so the logo stands near the bottom of the section,
 * with the plain panel below the plate fading into the photo — as if the sign
 * stood in the bushes. A strip of photo stays visible under it, so the section
 * does not end flush with the plate.
 *
 * The fade starts at the plate's bottom edge: 382.08 / 461.94 = 83% of the
 * logo's height, in `FULL_LOGO_VIEW_BOX` units.
 *
 * From `xl` up the hero has no logo at all (decision 13.10.2026): the header
 * already carries it, and the logo behind the rock with the PZA badge beside
 * it read as two extra logos competing with the heading.
 */
export function HeroSignAtEdge({ className = '' }: { className?: string }) {
  const fade = 'linear-gradient(to bottom, #000 83%, transparent 100%)'
  return (
    <div className={className} style={{ maskImage: fade, WebkitMaskImage: fade }}>
      <FullLogo className="h-[150px] w-auto sm:h-[180px]" />
    </div>
  )
}
