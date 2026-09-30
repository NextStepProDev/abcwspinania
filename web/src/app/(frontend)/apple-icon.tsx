import { signIcon } from '@/lib/sign-icon'

// The iPhone home-screen icon. Without it iOS falls back to a screenshot of
// the page, shrunk to a tile.
//
// iOS rounds the corners itself, so the icon is a plain opaque square. The
// lozenge's tips sit at the middle of each edge, which the rounding never
// reaches; the margin is there so the sign does not look crammed.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return signIcon(size.width, 0.1)
}
