/**
 * Gallery navigation — pure functions, NO runtime imports from Payload.
 *
 * Same split as `lib/format.ts` and for the same reason (rule 4): `lib/content.ts`
 * drags in the whole Payload engine, so anything it touches cannot be imported
 * by unit tests running under bare `node --test`.
 *
 * The gallery keeps its state in the URL (`/galeria?zdjecie=<id>`), so what
 * lives here is the whole of its logic: which photo the address asks for, which
 * photos sit either side of it, where Tab may go while the overlay is open, and
 * every string that the server-rendered grid and the client-side behaviour both
 * have to agree on — addresses and the tile ids used to hand focus back.
 *
 * No counting things in this comment. It has twice been written as "these two",
 * and twice been made wrong by the next function added below it.
 */

export interface GalleryNeighbours {
  previousId: number | null
  nextId: number | null
}

/**
 * Neighbours of `currentId` within `ids`, wrapping around at both ends.
 *
 * Both the miss (`indexOf` returning -1) and the single-photo case are handled
 * explicitly. Without the first, `ids[-2]` is `undefined` while `ids[0]` is a
 * real photo, so an id no longer in the gallery would render one dead arrow and
 * one working one. Without the second, both arrows on a one-photo gallery would
 * point back at the photo already on screen.
 */
export function galleryNeighbours(ids: number[], currentId: number): GalleryNeighbours {
  const index = ids.indexOf(currentId)
  if (index === -1 || ids.length < 2) return { previousId: null, nextId: null }

  return {
    previousId: ids[(index - 1 + ids.length) % ids.length]!,
    nextId: ids[(index + 1) % ids.length]!,
  }
}

/**
 * The `zdjecie` query parameter as an id that actually exists in the gallery.
 *
 * Checked against the real list rather than merely parsed: the address outlives
 * the tick in the panel, so a bookmark saved today can name a photo the client
 * unticks tomorrow. Anything unrecognised means "no photo open" — the grid
 * alone, not an empty overlay on top of it.
 */
export function parseGalleryId(raw: string | undefined, ids: number[]): number | null {
  if (!raw) return null

  const id = Number(raw)
  if (!Number.isInteger(id)) return null

  return ids.includes(id) ? id : null
}

/**
 * Where focus sits among the overlay's own links when Tab is pressed.
 *
 * `only` is its own case rather than "first and last at once": a gallery
 * holding a single photo shows no arrows, so the close button is the whole of
 * the overlay's tab order and both directions have to come back to it.
 */
export type FocusPosition = 'container' | 'only' | 'first' | 'middle' | 'last'

/**
 * Which end of the overlay Tab has to jump to, or null to let the browser move.
 *
 * `container` is the state focus is in immediately after opening: on the dialog
 * element itself, ahead of all its links. Forward from there the browser walks
 * into the first link unaided — but BACKWARDS it would leave the overlay and
 * land on a gallery tile underneath it, focused and invisible. That case is the
 * reason this is a function rather than two conditions inline.
 */
export function focusTrapTarget(
  shiftKey: boolean,
  position: FocusPosition,
): 'first' | 'last' | null {
  if (position === 'only') return 'first'
  if (!shiftKey) return position === 'last' ? 'first' : null
  return position === 'first' || position === 'container' ? 'last' : null
}

/**
 * The id a tile carries, so the overlay can hand focus back to it on close.
 *
 * Lives here rather than beside the grid it is written into: the client-side
 * behaviour needs it too, and importing it from a server component's module
 * would drag that whole module — grid, overlay, icons — into the browser
 * bundle for the sake of one string.
 */
export function tileDomId(id: number): string {
  return `foto-${id}`
}

/**
 * The gallery's own address. Polish, like every public URL here.
 *
 * A constant because closing the overlay means "go back to this page with no
 * photo open", and that is written in two places — the close link on the server
 * and the Escape key in the browser. Spelled out by hand, a rename of the route
 * would leave one of them pointing at a page that no longer exists, and nothing
 * would fail loudly.
 */
export const GALLERY_PATH = '/galeria'

/** Address of the page with one photo open. */
export function photoHref(id: number): string {
  return `${GALLERY_PATH}?zdjecie=${id}`
}
