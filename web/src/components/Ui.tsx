import Link from 'next/link'

import { Arrow } from './Icons'

/**
 * Repeated elements from the mockup: buttons, badges, section headings.
 *
 * Gathered in one file because each is a handful of classes and appears on most
 * pages. Scattered across views they drift apart at the first spacing
 * correction — exactly the kind of duplication that only becomes visible once
 * two buttons side by side have different heights.
 */

type Variant = 'primary' | 'outline' | 'light' | 'outlineLight'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-rope text-white hover:bg-rope-dark',
  outline: 'border border-rock-300 text-rock-900 hover:border-rock-600',
  light: 'bg-white text-rope-dark hover:bg-rock-50',
  outlineLight: 'border-[1.5px] border-white/60 text-white hover:border-white',
}

export function Button({
  href,
  children,
  variant = 'primary',
  large,
  withArrow,
  className = '',
  ...rest
}: {
  href: string
  children: React.ReactNode
  variant?: Variant
  large?: boolean
  withArrow?: boolean
  className?: string
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'children' | 'className'>) {
  const size = large ? 'px-7 py-4 text-[17px]' : 'px-5 py-2.5 text-[15px]'
  // `whitespace-nowrap`: button labels are short, and one broken in half
  // ("Zapisz\nsię") looks like a layout bug rather than an intentional wrap.
  const classes = `inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-lg font-semibold transition-colors ${size} ${VARIANTS[variant]} ${className}`

  // External and `tel:` links do not go through the Next router — <Link> on
  // those only produces console noise and breaks behaviour on a phone.
  if (href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('http')) {
    return (
      <a href={href} className={classes}>
        {children}
        {withArrow && <Arrow size={17} />}
      </a>
    )
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
      {withArrow && <Arrow size={17} />}
    </Link>
  )
}

type BadgeTone = 'accent' | 'neutral' | 'available' | 'dark' | 'onDark'

const TONES: Record<BadgeTone, string> = {
  accent: 'bg-rope-soft text-rope-dark',
  neutral: 'bg-rock-75 text-rock-600',
  available: 'bg-available-bg text-available-text',
  dark: 'bg-rope text-white',
  onDark: 'bg-rope/20 text-rope-light',
}

export function Badge({
  children,
  tone = 'neutral',
  uppercase,
  pill,
}: {
  children: React.ReactNode
  tone?: BadgeTone
  uppercase?: boolean
  pill?: boolean
}) {
  return (
    <span
      className={[
        'inline-block text-xs font-semibold',
        pill ? 'rounded-full px-2.5 py-1 text-[13px]' : 'rounded px-2.5 py-1',
        uppercase ? 'uppercase tracking-[0.08em]' : '',
        TONES[tone],
      ].join(' ')}
    >
      {children}
    </span>
  )
}

/**
 * A section heading with an optional "see all" link on the right.
 *
 * The heading level is a PARAMETER, not a hard-coded `<h2>`. On the homepage
 * sections are level two, but the same layout appears on subpages underneath an
 * existing h2 — there it has to be an h3, otherwise the hierarchy breaks (rule
 * 11 is not only about the number of h1s).
 */
export function SectionHeading({
  title,
  description,
  link,
  linkLabel,
  level: Heading = 'h2',
  id,
}: {
  title: string
  description?: string | null
  link?: string
  linkLabel?: string
  level?: 'h2' | 'h3'
  id?: string
}) {
  return (
    <div className="mb-9 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end sm:gap-10">
      <div className="max-w-[620px]">
        <Heading id={id} className="text-[32px] leading-[1.05] lg:text-[44px]">
          {title}
        </Heading>
        {description && <p className="mt-3 text-[17px] leading-7 text-rock-600">{description}</p>}
      </div>
      {link && linkLabel && (
        <Link
          href={link}
          className="flex shrink-0 items-center gap-2 text-base font-semibold text-rope hover:text-rope-dark"
        >
          {linkLabel}
          <Arrow size={16} />
        </Link>
      )}
    </div>
  )
}

/** Container at the mockup's width (1440 px with an 80 px desktop margin). */
export function Container({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 ${className}`}>
      {children}
    </div>
  )
}

/** A stand-in for a photo we do not have yet. It disappears once one lands in the CMS. */
export function ImagePlaceholder({
  caption,
  height = 'h-40',
  dark,
}: {
  caption: string
  height?: string
  dark?: boolean
}) {
  return (
    <div
      className={[
        'flex items-center justify-center border-b text-center',
        height,
        dark ? 'border-rock-line bg-rock-800' : 'border-rock-200 bg-rock-75',
      ].join(' ')}
    >
      <span
        className={`px-4 text-[11px] font-semibold uppercase tracking-[0.06em] ${dark ? 'text-rock-500' : 'text-rock-400'}`}
      >
        {caption}
      </span>
    </div>
  )
}
