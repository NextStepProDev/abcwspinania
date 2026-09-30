import { APP_ICON_SIZES, signIcon } from '@/lib/sign-icon'

// The Android home-screen icons, listed in `app/manifest.ts`. A plain route
// rather than the `icon.tsx` convention with `generateImageMetadata`: that one
// serves its variants under generated addresses, and the manifest needs fixed
// ones.
//
// The 10% margin makes every size usable as a MASKABLE icon too. Android crops
// those to a circle (or its own shape) that keeps only the middle 80% for
// certain; the lozenge's tips, at the middle of each edge, land exactly on that
// line at this margin and not past it.
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return APP_ICON_SIZES.map((size) => ({ size: String(size) }))
}

export async function GET(_request: Request, { params }: RouteContext<'/app-icon/[size]'>) {
  const { size } = await params
  return signIcon(Number(size), 0.1)
}
