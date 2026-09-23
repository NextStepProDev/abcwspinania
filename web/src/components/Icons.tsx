/**
 * The icon set from the mockup.
 *
 * Inlined as SVG rather than pulled from a library: there are barely a dozen of
 * them, they do not change, and every icon library is one more dependency to
 * watch at upgrade time plus tens of kilobytes for something we use a fraction
 * of.
 *
 * All of them inherit their colour through `currentColor` and carry
 * `aria-hidden` — they are decoration next to text, never the sole carrier of
 * meaning. Where an icon stands alone (the phone button in the mobile header,
 * say), the parent element must have an `aria-label`.
 */
type Props = { size?: number; className?: string }

function Svg({
  size = 16,
  className,
  children,
  fill = 'none',
  strokeWidth = 1.6,
}: Props & { children: React.ReactNode; fill?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const Phone = (p: Props) => (
  <Svg {...p}>
    <path d="M21.8 17v3a2 2 0 0 1-2.2 2A19.5 19.5 0 0 1 2.1 4.4 2 2 0 0 1 4.1 2.2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1l-1.3 1.3a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
  </Svg>
)

export const Arrow = (p: Props) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M4 12h15M12.5 5.5 19 12l-6.5 6.5" />
  </Svg>
)

export const Shield = (p: Props) => (
  <Svg {...p} strokeWidth={1.7}>
    <path d="M12 2l8 3.5v6c0 4.7-3.4 8.9-8 10.5-4.6-1.6-8-5.8-8-10.5v-6L12 2z" />
    <path d="M9 12l2 2 4-4.5" />
  </Svg>
)

export const People = (p: Props) => (
  <Svg {...p} strokeWidth={1.7}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
    <path d="M17 5.5a3 3 0 0 1 0 5.6M19.5 14.6c1.3.9 2 2.2 2 3.9" />
  </Svg>
)

export const Mountains = (p: Props) => (
  <Svg {...p} strokeWidth={1.7}>
    <path d="M2 20L9 7l4 6.5 2.5-3.5L22 20H2z" />
    <circle cx="17.5" cy="5" r="2.2" />
  </Svg>
)

export const House = (p: Props) => (
  <Svg {...p} strokeWidth={1.7}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.8V20h14V9.8" />
    <path d="M9.5 20v-5.5h5V20" />
  </Svg>
)

export const Envelope = (p: Props) => (
  <Svg {...p}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
    <path d="m3 6 9 6.5L21 6" />
  </Svg>
)

export const Pin = (p: Props) => (
  <Svg {...p}>
    <path d="M20 10.5c0 5.3-8 11.5-8 11.5s-8-6.2-8-11.5a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10.2" r="2.8" />
  </Svg>
)

export const Clock = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6.8V12l3.4 2" />
  </Svg>
)

export const Calendar = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
)

export const Check = (p: Props) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </Svg>
)

export const Close = (p: Props) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const Menu = (p: Props) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </Svg>
)

export const Certificate = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="9.5" r="5.5" />
    <path d="M8.5 14.3 7.5 22l4.5-2.4 4.5 2.4-1-7.7" />
  </Svg>
)

/** Icons selectable in the panel (the `icon` field in the homepage global). */
export const SELECTABLE_ICONS = {
  shield: Shield,
  people: People,
  mountains: Mountains,
  house: House,
} as const

export type IconName = keyof typeof SELECTABLE_ICONS
