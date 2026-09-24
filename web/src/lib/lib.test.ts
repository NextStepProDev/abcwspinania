import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatPrice,
  formatPriceLabel,
  formatLevel,
  yearsSince,
  pluralPl,
  formatSpotsLeft,
  formatDateRange,
  formatDateRangeShort,
  monthName,
  groupByMonth,
  formatAgeRange,
  readingTime,
  anchorId,
  tableOfContents,
  formatCategory,
  mapEmbedSrc,
  mapEmbedUrlFrom,
} from '@/lib/format'
import { jsonLd, organizationSchema } from '@/lib/schema'
import type { SiteConfig } from '@/payload-types'
import { validateContact, validateNewsletter, isValid, looksLikeBot } from '@/lib/validation'
import type { ContactFormData } from '@/lib/validation'
import { galleryNeighbours, parseGalleryId, focusTrapTarget } from '@/lib/gallery'
import {
  CONSENT_TEXT,
  CONSENT_VERSION,
  consentForStorage,
  NEWSLETTER_CONSENT_TEXT,
  newsletterConsentForStorage,
} from '@/lib/consent'

// --- formatting -------------------------------------------------------------

test('no price means an individual quote, not zero złoty', () => {
  assert.equal(formatPrice(null), 'wycena indywidualna')
  assert.equal(formatPrice(undefined), 'wycena indywidualna')
})

test('zero złoty is still zero, not a missing price', () => {
  // A distinction that matters: a free course is not the same as a course with
  // no price set.
  assert.notEqual(formatPrice(0), 'wycena indywidualna')
})

test('price is formatted in Polish, without grosze', () => {
  const out = formatPrice(450)
  assert.match(out, /450/)
  assert.match(out, /zł/)
  assert.ok(!out.includes(','), 'course prices do not show grosze')
})

test('a level with no value renders no label', () => {
  assert.equal(formatLevel(null), null)
  assert.equal(formatLevel('intermediate'), 'Średniozaawansowany')
})

test('the "od" prefix appears only where there is something to prefix', () => {
  // The real price list is made of variants (rock course: Jura / Rudawy /
  // weekend / two-person), so a single number without "od" would be untrue.
  assert.match(formatPriceLabel(2400, true), /^od /)
  assert.ok(!formatPriceLabel(2400, false).startsWith('od '))
  // A missing price does not become "od wycena indywidualna".
  assert.equal(formatPriceLabel(null, true), 'wycena indywidualna')
})

test('years are computed from the founding year, not typed in', () => {
  assert.equal(yearsSince(2001, new Date('2026-09-20')), 25)
  assert.equal(yearsSince(null), null)
  // A year in the future is a mistake in the panel — better to show nothing
  // than "-2 lata".
  assert.equal(yearsSince(2030, new Date('2026-09-20')), null)
})

test('Polish pluralisation covers all three forms', () => {
  const spots = (n: number) => pluralPl(n, 'wolne', 'wolne', 'wolnych')
  assert.equal(spots(1), 'wolne')
  assert.equal(spots(2), 'wolne')
  assert.equal(spots(4), 'wolne')
  assert.equal(spots(5), 'wolnych')
  // The teens are the exception: 12–14 behave like 5, despite ending in 2–4.
  assert.equal(spots(12), 'wolnych')
  assert.equal(spots(13), 'wolnych')
  assert.equal(spots(22), 'wolne')
  assert.equal(spots(25), 'wolnych')
})

test('no spots left is a message, not "0 wolnych"', () => {
  assert.equal(formatSpotsLeft(0), 'brak miejsc')
  assert.equal(formatSpotsLeft(2), '2 wolne')
  assert.equal(formatSpotsLeft(5), '5 wolnych')
  // An unset capacity is not the same as an exhausted one.
  assert.equal(formatSpotsLeft(null), 'zapytaj o miejsca')
})

// --- dates and sessions -----------------------------------------------------

test('a date range drops whatever repeats', () => {
  // Same month: month and year stated once.
  assert.equal(formatDateRange('2026-05-04', '2026-05-09'), '4–9 maja 2026')
  // Different months, same year: year stated once.
  assert.equal(formatDateRange('2026-05-30', '2026-06-04'), '30 maja – 4 czerwca 2026')
  // Across a year boundary: both dates in full, because both numbers mean
  // something.
  assert.equal(formatDateRange('2026-12-28', '2027-01-03'), '28 grudnia 2026 – 3 stycznia 2027')
})

test('a date range uses the genitive, not the nominative', () => {
  // Intl.formatRange() would return "4 maj", which is wrong in Polish — hence
  // the hand-written month table instead of the built-in.
  assert.match(formatDateRange('2026-05-04', '2026-05-09'), /maja/)
  assert.ok(!formatDateRange('2026-05-04', '2026-05-09').includes('maj '))
})

test('a missing end date yields one date, not an empty range', () => {
  assert.equal(formatDateRange('2026-05-16'), '16 maja 2026')
  assert.equal(formatDateRange('2026-05-16', null), '16 maja 2026')
})

test('dates are read in UTC, not in the server timezone', () => {
  // With a "dayOnly" picker Payload stores a calendar date as UTC midnight.
  // Reading it locally shifts the WHOLE site back a day in every zone west of
  // UTC. Measured: under TZ=America/New_York the session "26 czerwca – 3 lipca"
  // displayed as "25 czerwca – 2 lipca".
  //
  // This test passes regardless of the process TZ — check it under
  // `TZ=America/New_York npm test` as well.
  assert.equal(formatDateRange('2026-09-12T00:00:00.000Z'), '12 września 2026')
  assert.equal(
    formatDateRange('2027-06-26T00:00:00.000Z', '2027-07-03T00:00:00.000Z'),
    '26 czerwca – 3 lipca 2027',
  )
  // The year boundary is the most sensitive: an hour of error moves the date by
  // a whole year here.
  assert.equal(formatDateRange('2027-01-01T00:00:00.000Z'), '1 stycznia 2027')
  assert.equal(monthName('2027-01-01T00:00:00.000Z'), 'Styczeń 2027')
})

test('an invalid date does not break rendering', () => {
  assert.equal(formatDateRange('nonsense'), '')
  assert.equal(monthName('nonsense'), '')
})

test('the short form drops the year only when it appears once', () => {
  assert.equal(formatDateRangeShort('2026-05-04', '2026-05-09'), '4–9 maja')
  // A year boundary is left untouched — trimming would change the meaning.
  assert.equal(
    formatDateRangeShort('2026-12-28', '2027-01-03'),
    '28 grudnia 2026 – 3 stycznia 2027',
  )
})

test('grouping by month preserves input order', () => {
  const groups = groupByMonth([
    { startDate: '2026-05-04' },
    { startDate: '2026-05-16' },
    { startDate: '2026-06-06' },
    { startDate: '2026-07-06' },
  ])
  assert.deepEqual(
    groups.map((g) => g.name),
    ['Maj 2026', 'Czerwiec 2026', 'Lipiec 2026'],
  )
  assert.equal(groups[0].items.length, 2)
})

test('grouping skips entries with an invalid date instead of breaking', () => {
  const groups = groupByMonth([{ startDate: 'nonsense' }, { startDate: '2026-05-04' }])
  assert.equal(groups.length, 1)
})

test('the age range covers all three variants', () => {
  assert.equal(formatAgeRange(10, 14), '10–14 lat')
  assert.equal(formatAgeRange(18, null), '18+')
  assert.equal(formatAgeRange(null, null), null)
})

// --- editor content ---------------------------------------------------------

// A minimal fragment of the Lexical tree — as much as our functions read.
const paragraph = (text: string) => ({
  type: 'paragraph',
  children: [{ type: 'text', text }],
})
const heading = (text: string) => ({
  type: 'heading',
  tag: 'h2',
  children: [{ type: 'text', text }],
})

test('reading time is computed from the content, not typed in', () => {
  const hundredWords = Array.from({ length: 100 }, () => 'słowo').join(' ')
  assert.equal(readingTime({ root: { children: [paragraph(hundredWords)] } }), 1)
  const sixHundred = Array.from({ length: 600 }, () => 'słowo').join(' ')
  assert.equal(readingTime({ root: { children: [paragraph(sixHundred)] } }), 3)
})

test('empty content yields one minute, not zero', () => {
  // "0 min czytania" looks like a bug even when it is true.
  assert.equal(readingTime(null), 1)
  assert.equal(readingTime({ root: { children: [] } }), 1)
})

test('the anchor decomposes Polish characters instead of passing them through', () => {
  assert.equal(anchorId('Rejon pod presją'), 'rejon-pod-presja')
  assert.equal(anchorId('Co się zmieniło w sprzęcie'), 'co-sie-zmienilo-w-sprzecie')
  // "ł" has no decomposable form in NFD, so it needs a rule of its own.
  assert.equal(anchorId('Ludzie, którzy przyjeżdżają'), 'ludzie-ktorzy-przyjezdzaja')
})

test('the table of contents takes level-two headings only', () => {
  const content = {
    root: {
      children: [
        paragraph('wstęp'),
        heading('Pierwszy kurs'),
        paragraph('treść'),
        { type: 'heading', tag: 'h3', children: [{ type: 'text', text: 'Podrozdział' }] },
        heading('Co dalej'),
      ],
    },
  }
  assert.deepEqual(tableOfContents(content), [
    { id: 'pierwszy-kurs', label: 'Pierwszy kurs' },
    { id: 'co-dalej', label: 'Co dalej' },
  ])
})

test('repeated headings get distinct anchors', () => {
  // Two identical anchors would make both lead to the first one.
  const content = { root: { children: [heading('Sprzęt'), heading('Sprzęt')] } }
  const toc = tableOfContents(content)
  assert.equal(toc[0].id, 'sprzet')
  assert.equal(toc[1].id, 'sprzet-2')
})

test('an unknown category is returned raw rather than dropped', () => {
  assert.equal(formatCategory('guides'), 'Poradniki')
  assert.equal(formatCategory('something-new'), 'something-new')
  assert.equal(formatCategory(null), null)
})

// --- structured data --------------------------------------------------------

const CONFIG: SiteConfig = {
  id: 1,
  phone: '609 465 237',
  phoneE164: '+48609465237',
  email: 'biuro@abcwspinania.info',
  street: 'Jurajska 47',
  postalCode: '42-421',
  city: 'Rzędkowice',
  legalName: 'ABC Wspinania',
  updatedAt: null,
  createdAt: null,
}

test('structured data carries a postal address', () => {
  const schema = organizationSchema(CONFIG) as Record<string, unknown>
  assert.equal(schema['@type'], 'SportsActivityLocation')
  assert.ok(schema.address, 'the address is what the old site lacked')
})

test('empty contact fields do not reach the schema', () => {
  // Google prefers a missing field to an empty one — an empty phone number
  // breaks the business listing.
  const schema = organizationSchema({ id: 1, updatedAt: null, createdAt: null }) as Record<
    string,
    unknown
  >
  assert.ok(!('telephone' in schema))
  assert.ok(!('email' in schema))
  assert.ok(!('address' in schema))
})

test('an incomplete address does not reach the schema at all', () => {
  // A town without a street looks complete in the data and nobody would notice
  // something is missing — better to supply nothing.
  const schema = organizationSchema({
    id: 1,
    city: 'Rzędkowice',
    updatedAt: null,
    createdAt: null,
  }) as Record<string, unknown>
  assert.ok(!('address' in schema))
})

test('the phone number in the schema is in international format', () => {
  const schema = organizationSchema(CONFIG) as Record<string, unknown>
  assert.equal(schema.telephone, '+48609465237')
})

test('ld+json serialisation cannot close the script tag', () => {
  const out = jsonLd({ name: '</script><script>alert(1)</script>' })
  assert.ok(!out.includes('</script>'))
  assert.ok(out.includes('\\u003c'))
})

// --- form validation --------------------------------------------------------

const VALID: ContactFormData = {
  name: 'Krzysiek',
  email: 'krzysiek@example.com',
  phone: '600 100 200',
  topic: 'rock-course',
  preferredDate: 'pierwsza połowa czerwca',
  message: 'Chciałbym zapisać syna na kurs skalny.',
  consent: true,
}

test('a valid form passes', () => {
  assert.ok(isValid(validateContact(VALID)))
})

test('the phone number is optional', () => {
  assert.ok(isValid(validateContact({ ...VALID, phone: '' })))
})

test('missing consent blocks submission', () => {
  const errors = validateContact({ ...VALID, consent: false })
  assert.ok(errors.consent, 'without consent the data may not be processed')
})

test('whitespace alone is not a filled-in field', () => {
  const errors = validateContact({ ...VALID, name: '   ', message: '  \n ' })
  assert.ok(errors.name)
  assert.ok(errors.message)
})

test('an address without a dot in the domain is rejected', () => {
  assert.ok(validateContact({ ...VALID, email: 'krzysiek@localhost' }).email)
})

test('an address with a plus and a longer domain passes', () => {
  // A common false positive of over-strict patterns — such addresses are valid.
  assert.ok(isValid(validateContact({ ...VALID, email: 'k.nowak+kurs@moja-firma.com.pl' })))
})

test('an over-long message is rejected', () => {
  assert.ok(validateContact({ ...VALID, message: 'a'.repeat(4001) }).message)
})

test('the bot honeypot detects a filled-in field', () => {
  assert.equal(looksLikeBot(''), false)
  assert.equal(looksLikeBot('   '), false)
  assert.equal(looksLikeBot('https://spam.example'), true)
})

test('a topic outside the list is rejected, an empty one passes', () => {
  // A browser `<select>` is not a safeguard — a request sent without the form
  // can carry any value, and Payload would reject an unknown one with a
  // database error, i.e. a 500 instead of a message.
  assert.ok(isValid(validateContact({ ...VALID, topic: '' })))
  assert.ok(!isValid(validateContact({ ...VALID, topic: 'made-up' })))
  assert.ok(isValid(validateContact({ ...VALID, topic: 'camp' })))
})

test('the preferred date is optional but length-limited', () => {
  assert.ok(isValid(validateContact({ ...VALID, preferredDate: '' })))
  assert.ok(!isValid(validateContact({ ...VALID, preferredDate: 'x'.repeat(201) })))
})

test('the newsletter requires an address and a separate consent', () => {
  assert.ok(isValid(validateNewsletter({ email: 'a@b.pl', consent: true })))
  assert.ok(!isValid(validateNewsletter({ email: 'a@b.pl', consent: false })))
  assert.ok(!isValid(validateNewsletter({ email: 'invalid', consent: true })))
  assert.ok(!isValid(validateNewsletter({ email: '   ', consent: true })))
})

// --- GDPR consent -----------------------------------------------------------

test('marketing consent is a DIFFERENT clause from the contact form one', () => {
  // A shared clause would mean everyone who ever asked a question gets the
  // newsletter — which nobody promised them.
  assert.notEqual(CONSENT_TEXT, NEWSLETTER_CONSENT_TEXT)
  assert.match(newsletterConsentForStorage(), /^\[\d{4}-\d{2}-\d{2}\]/)
  assert.ok(newsletterConsentForStorage().includes(NEWSLETTER_CONSENT_TEXT))
})

test('the stored consent carries the version and the full clause', () => {
  const stored = consentForStorage()
  assert.ok(stored.includes(CONSENT_VERSION), 'without a version the clauses cannot be told apart')
  assert.ok(stored.includes(CONSENT_TEXT), 'we store the text, not a bare "yes"')
})

// --- gallery ----------------------------------------------------------------

test('the gallery wraps around, so an arrow never dead-ends', () => {
  const ids = [10, 20, 30]
  assert.deepEqual(galleryNeighbours(ids, 10), { previousId: 30, nextId: 20 })
  assert.deepEqual(galleryNeighbours(ids, 30), { previousId: 20, nextId: 10 })
})

test('a single photo has no neighbours — an arrow back to itself is a dead button', () => {
  assert.deepEqual(galleryNeighbours([7], 7), { previousId: null, nextId: null })
})

test('an empty gallery yields no neighbours instead of throwing', () => {
  assert.deepEqual(galleryNeighbours([], 7), { previousId: null, nextId: null })
})

test('a photo unticked since the link was saved has no neighbours', () => {
  // The address can outlive the flag: someone bookmarks ?zdjecie=99, the client
  // unticks that photo. Position -1 must not be read as "the last one".
  assert.deepEqual(galleryNeighbours([10, 20], 99), { previousId: null, nextId: null })
})

test('a missing or non-numeric parameter opens no photo', () => {
  const ids = [10, 20]
  assert.equal(parseGalleryId(undefined, ids), null)
  assert.equal(parseGalleryId('', ids), null)
  assert.equal(parseGalleryId('abc', ids), null, 'NaN must not leak into the lookup')
  assert.equal(parseGalleryId('2.5', ids), null, 'ids are whole numbers')
})

test('a parameter pointing outside the gallery opens no photo', () => {
  // Otherwise an old bookmark renders an empty overlay over the grid.
  assert.equal(parseGalleryId('99', [10, 20]), null)
  assert.equal(parseGalleryId('10', []), null)
  assert.equal(parseGalleryId('20', [10, 20]), 20)
})

test('Tab wraps at both ends of the enlarged photo', () => {
  assert.equal(focusTrapTarget(false, 'last'), 'first')
  assert.equal(focusTrapTarget(true, 'first'), 'last')
})

test('Tab in the middle of the overlay is left to the browser', () => {
  assert.equal(focusTrapTarget(false, 'middle'), null)
  assert.equal(focusTrapTarget(true, 'middle'), null)
  assert.equal(focusTrapTarget(false, 'first'), null)
  assert.equal(focusTrapTarget(true, 'last'), null)
})

test('shift+Tab straight after opening must not escape behind the overlay', () => {
  // Focus starts on the dialog itself, before any of its links. Going forward
  // the browser walks into the first link on its own; going BACKWARDS it would
  // land on a gallery tile hidden underneath, with nothing to show for it.
  assert.equal(focusTrapTarget(true, 'container'), 'last')
  assert.equal(focusTrapTarget(false, 'container'), null)
})

test('an overlay with a single control traps Tab in both directions', () => {
  // A one-photo gallery has no arrows, so "close" is the only link there is:
  // the same element is both the first and the last, and Tab either way has
  // nowhere to go but back to it.
  assert.equal(focusTrapTarget(false, 'only'), 'first')
  assert.equal(focusTrapTarget(true, 'only'), 'first')
})

test('the contact map is built from the address when the panel field is empty', () => {
  assert.equal(
    mapEmbedSrc(null, 'Jurajska 47, 42-421 Rzędkowice'),
    'https://www.google.com/maps?q=Jurajska%2047%2C%2042-421%20Rz%C4%99dkowice&output=embed',
  )
})

test('a share link in the panel is ignored instead of leaving an empty frame', () => {
  assert.equal(mapEmbedUrlFrom('https://maps.app.goo.gl/bhFe76gETGJB5cnV6'), null)
  assert.match(
    mapEmbedSrc('https://maps.app.goo.gl/bhFe76gETGJB5cnV6', 'Rzędkowice')!,
    /output=embed$/,
  )
})

test('a real embed address from the panel wins over the address', () => {
  const embed = 'https://www.google.com/maps/embed?pb=!1m18'
  assert.equal(mapEmbedSrc(embed, 'Rzędkowice'), embed)
})

test('no address and no embed means no map', () => {
  assert.equal(mapEmbedSrc('', ''), null)
})

test('the whole iframe code pasted from Google Maps is accepted', () => {
  // "Umieść mapę" in Google Maps offers only "Kopiuj HTML", not the bare address.
  const html =
    '<iframe src="https://www.google.com/maps/embed?pb=!1m18!2s" width="600" ' +
    'height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
  assert.equal(mapEmbedUrlFrom(html), 'https://www.google.com/maps/embed?pb=!1m18!2s')
  assert.equal(mapEmbedSrc(html, 'Rzędkowice'), 'https://www.google.com/maps/embed?pb=!1m18!2s')
})

test('stray spaces around a pasted embed address do not reject it', () => {
  assert.equal(
    mapEmbedUrlFrom('  https://www.google.com/maps/embed?pb=!1m18\n'),
    'https://www.google.com/maps/embed?pb=!1m18',
  )
})

test('iframe code pointing anywhere but Google Maps is rejected', () => {
  assert.equal(mapEmbedUrlFrom('<iframe src="https://example.com/maps/embed?x"></iframe>'), null)
})
