import { Inter, Bricolage_Grotesque } from 'next/font/google'

/**
 * The site's two typefaces, declared once for every document that renders the
 * site: the `(frontend)` layout and `app/global-not-found.tsx`, which bypasses
 * that layout. `next/font` needs its calls at module level; a shared module
 * satisfies that and keeps the two from drifting apart.
 */

// The `latin-ext` subset is MANDATORY in BOTH typefaces. Without it Polish
// diacritics (ą, ę, ś, ż, ź, ć, ń, ó, ł) fall back to a substitute face and the
// text breaks apart mid-word — visible only on the finished page, not in
// devtools. With the display face it hurts twice as much, because it runs at
// 72 px.
export const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
})

// The display typeface from the mockup. Narrowed to the weights we actually
// use — Bricolage is variable, so without this we would pull the full axis
// range.
export const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['600', '800'],
  variable: '--font-bricolage',
})
