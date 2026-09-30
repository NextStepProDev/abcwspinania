import { signIcon } from '@/lib/sign-icon'

// `/favicon.ico` — the address browsers and other clients (bookmarks, feed
// readers, search engines) ask for ON THEIR OWN when a page gives them no
// <link rel="icon">, or without looking at the page at all. It matters here
// for Next's built-in 404 for unknown addresses, which has no <head> of ours,
// and for the admin panel, which points here (`payload.config.ts`) instead of
// showing Payload's logo. Until 30.09.2026 it answered 404.
//
// A PNG served under the .ico name: every current browser reads it by content,
// not by extension, and it keeps the icon generated from `lib/mark.ts` rather
// than a binary file that would silently keep an old drawing.
//
// At the root of `app/`, next to robots.ts and manifest.ts, because it serves
// the whole application — the admin panel as much as the site. That is order,
// not necessity: a route group does not change the address, so the same file
// inside `(frontend)` would answer at `/favicon.ico` just the same.
export const dynamic = 'force-static'

export function GET() {
  return signIcon(48, 0.04)
}
