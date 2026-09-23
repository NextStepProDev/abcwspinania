import { useId } from 'react'

/**
 * An illustration of a ridge with a climbing route — the hero header backdrop.
 *
 * It repeats on several pages (homepage, courses, camps, article), so the
 * gradient identifier comes from `useId()` rather than being hard-coded. Two
 * identical `id`s in one document make one definition override the other and
 * some instances render unfilled — which only shows once two such sections land
 * on the same page (rule 12 in CLAUDE.md).
 *
 * `preserveAspectRatio="none"` is intentional: this is a decorative background
 * stretched to the size of its section, not a drawing with proportions of its
 * own.
 */
export function MountainBackdrop({ variant = 'full' }: { variant?: 'full' | 'short' }) {
  const id = useId()
  const gradient = `grad-${id}`

  return (
    <svg
      viewBox="0 0 1440 640"
      preserveAspectRatio="none"
      className="absolute inset-0 block h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1713" />
          <stop offset="100%" stopColor="#241f1a" />
        </linearGradient>
      </defs>

      <rect width="1440" height="640" fill={`url(#${gradient})`} />

      {/* Three planes of ridge — progressively lighter, to give depth without a photo. */}
      <path
        d="M0 640V392l74-26 38 44 66-96 58 40 70-118 62 74 84-52 54 86 92-44 66 60 78-84 70 52 88-30 62 66 84-40 66 44 78-26 70 40V640Z"
        fill="#2c2620"
      />
      <path
        d="M0 640V486l96-34 56 52 78-78 74 56 96-46 72 68 88-38 84 58 92-54 70 60 96-34 78 48 90-30 70 42V640Z"
        fill="#3a332a"
      />
      <path
        d="M0 640V566l130-22 108 30 126-38 140 34 134-28 128 38 126-30 140 26 120-18 88 22V640Z"
        fill="#494036"
      />

      {/* The climbing route with its bolts — the only accent of colour. It
          disappears in the short variant (subpages), because at 320 px tall it
          runs outside the frame. */}
      {variant === 'full' && (
        <>
          <path
            d="M1086 628l14-92-16-88 18-80-14-76 16-64"
            stroke="#c8552b"
            strokeWidth="3"
            strokeDasharray="2 13"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="1100" cy="536" r="6" fill="#c8552b" />
          <circle cx="1084" cy="448" r="6" fill="#c8552b" />
          <circle cx="1102" cy="368" r="6" fill="#c8552b" />
          <circle cx="1088" cy="292" r="6" fill="#c8552b" />
          <circle cx="1104" cy="228" r="7" fill="#c8552b" />
        </>
      )}
    </svg>
  )
}
