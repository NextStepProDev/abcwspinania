import type { Course } from '@/payload-types'

/**
 * Pure formatting functions — NO runtime imports from Payload.
 *
 * The split is deliberate: `lib/content.ts` drags in the whole Payload engine
 * and a database connection, so unit tests run under bare `node --test` could
 * not import it. Only `import type` enters here, and that disappears at compile
 * time.
 *
 * The output strings are Polish because they are read by visitors; the
 * identifiers around them are not.
 */

/** Price for display. No price means "quoted individually", not "0 zł". */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'wycena indywidualna'
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Price with an optional "od" ("from") prefix.
 *
 * The school's real price list is made of variants (rock course: 6 days in the
 * Jura, 6 days in the Rudawy, a weekend variant, a two-person version), so a
 * single number on a card would be untrue. `priceFrom` turns the prefix on
 * wherever there is more than one variant.
 */
export function formatPriceLabel(
  price: number | null | undefined,
  priceFrom?: boolean | null,
): string {
  const amount = formatPrice(price)
  if (price === null || price === undefined) return amount
  return priceFrom ? `od ${amount}` : amount
}

// Labels follow the mockup. The values stored in the database stay technical,
// so renaming a label never requires an enum migration.
const LEVEL_LABELS: Record<NonNullable<Course['level']>, string> = {
  beginner: 'Od zera',
  intermediate: 'Średniozaawansowany',
  advanced: 'Zaawansowany',
}

export function formatLevel(level: Course['level']): string | null {
  return level ? LEVEL_LABELS[level] : null
}

export const LEVELS = Object.entries(LEVEL_LABELS).map(([value, label]) => ({
  value,
  label,
}))

/**
 * Years elapsed since a given year.
 *
 * Computed rather than typed in — "25 years of experience" written by hand is
 * false from the next January onwards and nobody remembers it is there.
 */
export function yearsSince(year: number | null | undefined, now = new Date()): number | null {
  if (!year) return null
  const years = now.getFullYear() - year
  return years > 0 ? years : null
}

/**
 * Polish noun inflection by count — the language has three forms, not two.
 *
 * Without this we get "2 wolne miejsc" or "5 wolne miejsca" in the schedule
 * table, which is exactly where the text is shortest and most visible.
 */
export function pluralPl(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one
  const lastDigit = count % 10
  const lastTwo = count % 100
  const useFew = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
  return useFew ? few : many
}

/** "brak miejsc" / "1 wolne" / "3 wolne" / "5 wolnych". */
export function formatSpotsLeft(spotsLeft: number | null | undefined): string {
  if (spotsLeft === null || spotsLeft === undefined) return 'zapytaj o miejsca'
  if (spotsLeft <= 0) return 'brak miejsc'
  return `${spotsLeft} ${pluralPl(spotsLeft, 'wolne', 'wolne', 'wolnych')}`
}

// --- Dates and sessions ------------------------------------------------------

const MONTHS_GENITIVE = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
]

const MONTHS_NOMINATIVE = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]

/**
 * ⚠️ Dates are read in UTC (`getUTCDate`, not `getDate`).
 *
 * With a "dayOnly" picker Payload stores a CALENDAR DATE as UTC midnight
 * ("2027-06-26T00:00:00.000Z"). That is not a moment in time but a day in a
 * calendar, so converting it into the server's timezone is a bug: in any zone
 * west of UTC, UTC midnight falls on the previous day locally and the WHOLE
 * site shifts back by one day. Measured under TZ=America/New_York: the session
 * "26 czerwca – 3 lipca" displayed as "25 czerwca – 2 lipca".
 *
 * The production container runs on UTC, so the bug is invisible there — but it
 * is visible to anyone running `npm run dev` in the Americas, and it would hit
 * the live site if someone ever set TZ on the container. With course dates,
 * being off by a day means somebody turns up on the wrong day.
 *
 * Polish date range, shortened wherever the repetition adds nothing:
 *
 *   4–9 maja 2026                (same month — month stated once)
 *   30 maja – 4 czerwca 2026     (different months, same year — year once)
 *   28 grudnia 2026 – 3 stycznia 2027
 *   16 maja 2026                 (no end date)
 *
 * Deliberately hand-rolled rather than `Intl.DateTimeFormat.formatRange()`:
 * that returns "4 maj – 9 maj", because it uses the nominative. Polish dates
 * take the genitive.
 */
export function formatDateRange(from: string, to?: string | null): string {
  const a = new Date(from)
  if (Number.isNaN(a.getTime())) return ''
  const dayA = a.getUTCDate()
  const monthA = MONTHS_GENITIVE[a.getUTCMonth()]
  const yearA = a.getUTCFullYear()

  if (!to) return `${dayA} ${monthA} ${yearA}`

  const b = new Date(to)
  if (Number.isNaN(b.getTime())) return `${dayA} ${monthA} ${yearA}`
  const dayB = b.getUTCDate()
  const monthB = MONTHS_GENITIVE[b.getUTCMonth()]
  const yearB = b.getUTCFullYear()

  if (yearA !== yearB) return `${dayA} ${monthA} ${yearA} – ${dayB} ${monthB} ${yearB}`
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${dayA} ${monthA} – ${dayB} ${monthB} ${yearB}`
  // An en dash without spaces between bare days, as in "4–9 maja".
  return `${dayA}–${dayB} ${monthA} ${yearA}`
}

/** Short form for narrow table columns: "4–9 maja", no year. */
export function formatDateRangeShort(from: string, to?: string | null): string {
  const full = formatDateRange(from, to)
  // The year is dropped only when it appears once — across a year boundary both
  // numbers carry information and shortening would change the meaning.
  const years = full.match(/\d{4}/g)
  return years && years.length === 1 ? full.replace(/\s*\d{4}/, '') : full
}

/** Group heading in the schedule: "Maj 2026". In UTC — see `formatDateRange`. */
export function monthName(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_NOMINATIVE[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** Grouping key by month, lexically sortable. In UTC. */
export function monthKey(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Groups sessions by month, preserving input order.
 *
 * `Map` rather than a plain object matters here: a JS object orders keys that
 * look like integers ascending, regardless of insertion order. Keys like
 * "2026-05" are not integers, so it would happen to work — but that is a
 * coincidence of the format, not a guarantee, and the first change to the key
 * format would silently reorder the months.
 */
export function groupByMonth<T extends { startDate: string }>(
  items: T[],
): { key: string; name: string; items: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const k = monthKey(item.startDate)
    if (!k) continue
    const existing = groups.get(k)
    if (existing) existing.push(item)
    else groups.set(k, [item])
  }
  return [...groups.entries()].map(([key, list]) => ({
    key,
    name: monthName(list[0].startDate),
    items: list,
  }))
}

/** Age range on a camp badge: "10–14 lat", "od 12 lat", "18+". */
export function formatAgeRange(from?: number | null, to?: number | null): string | null {
  if (from && to) return `${from}–${to} lat`
  if (from) return `${from}+`
  if (to) return `do ${to} lat`
  return null
}

// --- Editor content ----------------------------------------------------------

/**
 * A node of the Lexical tree, in the scope we care about.
 *
 * Deliberately a loose structural type rather than an import from
 * `@payloadcms/*`: this file is to stay free of runtime dependencies so the
 * tests run under bare `node --test`.
 */
interface LexicalNode {
  type?: string
  tag?: string
  text?: string
  children?: LexicalNode[]
}

type RichText = { root?: LexicalNode } | null | undefined

/** Collects all text from the tree, ignoring markup. */
function collectText(node: LexicalNode | undefined): string {
  if (!node) return ''
  const own = typeof node.text === 'string' ? node.text : ''
  const children = node.children?.map(collectText).join(' ') ?? ''
  return `${own} ${children}`
}

/**
 * Reading time in minutes.
 *
 * COMPUTED, not typed into the panel: a hand-entered value drifts with the
 * first correction to the text, and nobody checks it, because nobody measures.
 *
 * 200 words per minute is the figure for running Polish prose. We round up and
 * never go below one minute — "0 min czytania" looks like a bug even when it is
 * true.
 */
export function readingTime(content: RichText): number {
  const text = collectText(content?.root).trim()
  if (!text) return 1
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export function formatReadingTime(content: RichText): string {
  return `${readingTime(content)} min czytania`
}

/**
 * Anchor id derived from a heading's text.
 *
 * Polish diacritics are decomposed to their base form (NFD) and the combining
 * marks stripped — otherwise "Rejon pod presją" would produce an anchor with
 * "ą" in the address, which turns into a string of percent signs once copied
 * out of the browser's address bar.
 */
export function anchorId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface TocEntry {
  id: string
  label: string
}

/**
 * Table of contents built from level-two headings.
 *
 * We take h2 ONLY. A contents list that includes h3 grows longer than the
 * section it describes on any long text, and stops helping with navigation.
 */
export function tableOfContents(content: RichText): TocEntry[] {
  const entries: TocEntry[] = []
  const used = new Set<string>()

  const walk = (node: LexicalNode | undefined) => {
    if (!node) return
    if (node.type === 'heading' && node.tag === 'h2') {
      const label = collectText(node).replace(/\s+/g, ' ').trim()
      if (label) {
        // Two headings with identical text would yield two identical anchors,
        // and then both lead to the first one.
        let id = anchorId(label)
        let n = 2
        while (used.has(id)) id = `${anchorId(label)}-${n++}`
        used.add(id)
        entries.push({ id, label })
      }
    }
    node.children?.forEach(walk)
  }

  walk(content?.root)
  return entries
}

const CATEGORY_LABELS: Record<string, string> = {
  'school-life': 'Z życia szkoły',
  'jura-history': 'Historia Jury',
  guides: 'Poradniki',
  reports: 'Relacje',
}

export function formatCategory(category: string | null | undefined): string | null {
  return category ? (CATEGORY_LABELS[category] ?? category) : null
}

export const POST_CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const SUBJECT_LABELS: Record<string, string> = {
  'rock-course': 'Kurs skałkowy PZA',
  'bolted-routes': 'Drogi ubezpieczone',
  trad: 'Asekuracja tradycyjna',
  camp: 'Obóz',
  training: 'Szkolenie',
}

export function formatSubject(subject: string | null | undefined): string | null {
  return subject ? (SUBJECT_LABELS[subject] ?? subject) : null
}

export const TESTIMONIAL_SUBJECTS = Object.entries(SUBJECT_LABELS).map(([value, label]) => ({
  value,
  label,
}))

/** Post publication date: "12 września 2026". */
export function formatDate(date: string): string {
  return formatDateRange(date)
}

const MAP_EMBED_PREFIX = 'https://www.google.com/maps/embed?'

/**
 * The embed address out of whatever was pasted into the panel, or null.
 *
 * Google Maps ("Udostępnij → Umieść mapę") offers only "Kopiuj HTML", so the
 * whole `<iframe …>` code is the usual paste — we take its `src`. Only Google's
 * embed address can sit in a frame: a share link (maps.app.goo.gl,
 * google.com/maps/place/…) refuses to be framed and the CSP blocks it anyway,
 * so accepting one would leave an empty box on the page.
 */
export function mapEmbedUrlFrom(input: string | null | undefined): string | null {
  const text = input?.trim() ?? ''
  const url = text.startsWith('<') ? (/\bsrc="([^"]*)"/.exec(text)?.[1] ?? '') : text
  return url.startsWith(MAP_EMBED_PREFIX) ? url : null
}

/** The contact page map: the panel override if valid, otherwise built from the address. */
export function mapEmbedSrc(override: string | null | undefined, address: string): string | null {
  const embed = mapEmbedUrlFrom(override)
  if (embed) return embed
  return address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null
}

/**
 * Where a cropped photo is anchored — the focal point set in the panel.
 *
 * Every `object-cover` photo on the site gets cut to a shape of its own (a
 * wide strip on a phone, almost a square on a desktop course card, 3:4 on the
 * homepage). A fixed crop saved into the file would be wrong in at least one of
 * them, so the panel's focal point is the only framing tool: the crop moves to
 * keep it in view, whatever the shape.
 *
 * `undefined` when the point is missing — React then leaves `object-position`
 * out and the browser falls back to the centre, the behaviour from before.
 */
export function focalPosition(
  media: { focalX?: number | null; focalY?: number | null } | null | undefined,
): string | undefined {
  const x = media?.focalX
  const y = media?.focalY
  if (typeof x !== 'number' || typeof y !== 'number') return undefined
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined
  const clamp = (value: number) => Math.min(100, Math.max(0, value))
  return `${clamp(x)}% ${clamp(y)}%`
}

type Variant = { url?: string | null; width?: number | null; height?: number | null }
type Uploaded = Variant & { sizes?: { medium?: Variant | null } | null }

const isPortrait = (v: Variant) =>
  typeof v.width === 'number' && typeof v.height === 'number' && v.height > v.width

/**
 * The original file, with the dimensions it is actually SHOWN at.
 *
 * Measured 26.09.2026: a phone photo held upright is stored 4000x1800 with an
 * EXIF rotation tag, and Payload records those raw numbers for the original.
 * sharp rotates before making `medium` (750x1667), so `medium` is the one that
 * knows the real shape. When the two disagree, the original's numbers are
 * swapped — otherwise `next/image` reserves a landscape box for a portrait
 * photo and the page jumps when it loads.
 */
export function originalSource(media: Uploaded): { url: string; width: number; height: number } {
  const width = media.width ?? 1200
  const height = media.height ?? 800
  const medium = media.sizes?.medium
  const rotated = medium?.url && isPortrait(medium) !== isPortrait({ width, height })
  return rotated
    ? { url: media.url ?? '', width: height, height: width }
    : { url: media.url ?? '', width, height }
}

/**
 * Which file a large, CROPPED photo is resized from.
 *
 * The optimiser resizes by WIDTH only. A portrait photo in a landscape frame
 * therefore arrives whole, cropped-away top and bottom included: measured
 * 26.09.2026, an upright 4000px phone photo came to 1.8 MB at 1920px wide,
 * against 415 KB from `medium`. So:
 *  • landscape (or square) → the original, sharp on retina;
 *  • portrait → `medium`, which caps what a cropped-away height can cost;
 *  • shape unknown → `medium` as well, because the cap is the safe side.
 *
 * Only for photos shown LARGE. Cards stay on `medium` whatever the shape —
 * see rule 24 in CLAUDE.md.
 */
export function croppedSource(media: Uploaded): { url: string; width: number; height: number } {
  const medium = media.sizes?.medium
  if (!medium?.url) return originalSource(media)
  const known = typeof media.width === 'number' && typeof media.height === 'number'
  if (known && !isPortrait(originalSource(media))) return originalSource(media)
  return { url: medium.url, width: medium.width ?? 750, height: medium.height ?? 500 }
}
