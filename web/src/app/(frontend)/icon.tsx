import { signIcon } from '@/lib/sign-icon'

// The browser tab icon — generated from code, see `lib/sign-icon.tsx`.
//
// A thin margin only: at 32 px every pixel of the lozenge counts, and the blue
// frame around it is part of the original's look, not wasted space.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return signIcon(size.width, 0.04)
}
