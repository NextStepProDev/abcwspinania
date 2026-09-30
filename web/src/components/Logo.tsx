import { FULL_LOGO, FULL_LOGO_VIEW_BOX, MARK_PATH, MARK_VIEW_BOX } from '@/lib/mark'

/**
 * The ABC Wspinania sign — the lozenge with the climber.
 *
 * The shape lives in `lib/mark.ts`, shared with the favicon, the app icons and
 * the social card. This file decides only how it is painted: in `currentColor`,
 * with the climber left as a hole, so the ground shows through it. On the light
 * header that gives a blue sign with a light climber; on a dark panel pass
 * `text-white` and it becomes the real sign — white lozenge, dark climber —
 * without a second variant.
 */
export function Mark({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK_VIEW_BOX}
      className={className}
      aria-hidden="true"
    >
      <path d={MARK_PATH} fill="currentColor" />
    </svg>
  )
}

/** The sign together with the name — what stands in the header. */
export function Logo({
  markSize = 34,
  textSize = 'text-[19px]',
  markColor = 'text-rope',
}: {
  markSize?: number
  textSize?: string
  markColor?: string
}) {
  return (
    <>
      <Mark size={markSize} className={markColor} />
      <span className={`font-display font-extrabold tracking-[-0.025em] ${textSize}`}>
        ABC Wspinania
      </span>
    </>
  )
}

/**
 * The complete logo exactly as the school uses it — panel, sign and the
 * ABCWSPINANIA.INFO plate — in its own colours, whatever the ground.
 *
 * Only where it is large enough to read: the wordmark is about a tenth of the
 * logo's height, so at the header's size it would be a few pixels tall. That
 * is why the header uses `Logo` instead.
 *
 * The panel and wordmark follow the `rope` token rather than a literal, so the
 * logo cannot drift from the accent the rest of the page is drawn in.
 */
export function FullLogo({ className, title }: { className?: string; title?: string }) {
  // With a title it is announced as an image of the name; without one it is
  // decoration and hidden, for places where the name is already said nearby.
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true }
  return (
    <svg viewBox={FULL_LOGO_VIEW_BOX} className={className} {...a11y}>
      <path d={FULL_LOGO.panel} className="fill-rope" />
      <path d={FULL_LOGO.sign} className="fill-white" />
      <path d={FULL_LOGO.plate} className="fill-white" />
      <path d={FULL_LOGO.wordmark} className="fill-rope" />
    </svg>
  )
}

/**
 * The sign as a faint watermark behind a section — large, pale, cut off by the
 * section's edge. The section must be `relative overflow-hidden` and its
 * content must come AFTER this in the markup and be `relative`, so it paints
 * on top. Pure decoration: hidden from assistive technology.
 */
export function SignWatermark({ className = '' }: { className?: string }) {
  return (
    <Mark
      size={520}
      className={`pointer-events-none absolute text-rope opacity-[0.06] ${className}`}
    />
  )
}
