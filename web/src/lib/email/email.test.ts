import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { DEFAULT_LANGUAGE } from '@/lib/email/language'
import { escapeHtml, renderEmail } from '@/lib/email/layout'
import { newMessageNotification } from '@/lib/email/templates'
import { toBrevoAddresses, toBrevoBody } from '@/lib/email/brevo'

// --- language ---------------------------------------------------------------

const SRC = new URL('../../', import.meta.url).pathname

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

// Decided 15.10.2026: a browser set to English is common in Poland and says
// nothing about the person, so it no longer picks the email language. Polish
// unless the participant switches their account to English.
test('no email language comes from the browser — Polish unless the account says otherwise', () => {
  assert.equal(DEFAULT_LANGUAGE, 'pl')
  // The header read as a string (`headers().get('accept-language')`), not
  // a mention of it in a comment.
  const offenders = sourceFiles(SRC).filter((file) =>
    /['"]accept-language['"]/i.test(readFileSync(file, 'utf8')),
  )
  assert.deepEqual(offenders, [])
})

// --- layout -----------------------------------------------------------------

test('everything a visitor typed is escaped in the HTML', () => {
  const { html } = renderEmail({
    lang: 'pl',
    heading: '<b>x</b>',
    paragraphs: ['"quoted" & <script>alert(1)</script>'],
    details: [['Imię', `<img src=x onerror=alert(1)>`]],
  })
  assert.ok(!html.includes('<script>'))
  // The one image is the school's logo in the header.
  assert.equal(html.match(/<img/g)?.length, 1)
  assert.ok(!html.includes('<img src=x'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'))
})

test('the header shows the original logo beside the name, which stays text', () => {
  // Decided 12.10.2026. Outlook blocks images until allowed — the name must
  // not depend on the picture.
  const pl = renderEmail({ lang: 'pl', heading: 'x', paragraphs: [] }).html
  const en = renderEmail({ lang: 'en', heading: 'x', paragraphs: [] }).html
  assert.match(pl, /<img src="https?:\/\/[^"]+\/logo\/email-logo\.png" width="57" alt=""/)
  assert.match(pl, />ABC Wspinania<\/div>/)
  assert.match(pl, /szkoła wspinaczkowa · Jura Krakowsko-Częstochowska/)
  assert.match(en, /climbing school · Kraków-Częstochowa Upland, Poland/)
})

test('an action link cannot break out of its attribute', () => {
  const { html } = renderEmail({
    lang: 'pl',
    heading: 'x',
    paragraphs: [],
    action: { label: 'Go', href: 'https://a.pl/"onmouseover="x' },
  })
  assert.ok(html.includes('href="https://a.pl/&quot;onmouseover=&quot;x"'))
})

test('line breaks typed into a form survive into the HTML', () => {
  const { html } = renderEmail({ lang: 'pl', heading: 'x', paragraphs: ['a\nb'] })
  assert.ok(html.includes('a<br>b'))
})

test('the text part carries the same content as the HTML', () => {
  const { text } = renderEmail({
    lang: 'en',
    heading: 'Hello',
    paragraphs: ['First.'],
    details: [['Date', '12 May']],
    action: { label: 'Open', href: 'https://x.pl' },
  })
  assert.match(text, /Hello/)
  assert.match(text, /First\./)
  assert.match(text, /Date: 12 May/)
  assert.match(text, /Open: https:\/\/x\.pl/)
  assert.match(text, /climbing school/)
})

test('the footer follows the language', () => {
  assert.match(renderEmail({ lang: 'pl', heading: 'x', paragraphs: [] }).html, /szkoła/)
  assert.match(renderEmail({ lang: 'en', heading: 'x', paragraphs: [] }).html, /climbing school/)
  assert.match(renderEmail({ lang: 'en', heading: 'x', paragraphs: [] }).html, /<html lang="en">/)
})

test('escapeHtml covers both quote characters', () => {
  assert.equal(escapeHtml(`'"`), '&#39;&quot;')
})

// --- templates --------------------------------------------------------------

const message = {
  name: 'Anna',
  email: 'anna@example.com',
  message: 'Czy są jeszcze miejsca?',
  adminUrl: 'https://example.pl/admin/collections/messages/7',
}

test('the message notification names the topic in the subject', () => {
  const email = newMessageNotification({ ...message, topic: 'camp' })
  assert.equal(email.subject, 'Nowa wiadomość: Anna — Obóz lub wyjazd')
})

test('an unknown or empty topic leaves the subject bare', () => {
  assert.equal(newMessageNotification(message).subject, 'Nowa wiadomość: Anna')
  assert.equal(
    newMessageNotification({ ...message, topic: 'nope' }).subject,
    'Nowa wiadomość: Anna',
  )
})

test('the school is never told to answer in English — a browser language says nothing', () => {
  // Messages.ts passes the whole saved row, and that row still has `language`.
  const savedRow = { ...message, language: 'en' }
  const email = newMessageNotification(savedRow)
  assert.doesNotMatch(email.text, /angielsk/)
  assert.doesNotMatch(email.html, /angielsk/)
})

test('optional fields appear only when filled in', () => {
  const bare = newMessageNotification(message).text
  assert.doesNotMatch(bare, /Telefon/)
  const full = newMessageNotification({ ...message, phone: '600 100 200', courseTitle: 'Kurs PZA' })
  assert.match(full.text, /Telefon: 600 100 200/)
  assert.match(full.text, /Kurs: Kurs PZA/)
  assert.match(full.text, /admin\/collections\/messages\/7/)
})

// --- Brevo ------------------------------------------------------------------

test('every address form Payload may pass reaches Brevo as an object', () => {
  assert.deepEqual(toBrevoAddresses('a@x.pl'), [{ email: 'a@x.pl' }])
  assert.deepEqual(toBrevoAddresses('Anna Nowak <a@x.pl>'), [
    { email: 'a@x.pl', name: 'Anna Nowak' },
  ])
  assert.deepEqual(toBrevoAddresses('"Nowak, Anna" <a@x.pl>'), [
    { email: 'a@x.pl', name: 'Nowak, Anna' },
  ])
  assert.deepEqual(toBrevoAddresses({ address: 'a@x.pl', name: 'A' }), [
    { email: 'a@x.pl', name: 'A' },
  ])
  assert.deepEqual(toBrevoAddresses(['a@x.pl', { address: 'b@x.pl' }]), [
    { email: 'a@x.pl' },
    { email: 'b@x.pl' },
  ])
  assert.deepEqual(toBrevoAddresses('a@x.pl, b@x.pl'), [{ email: 'a@x.pl' }, { email: 'b@x.pl' }])
  assert.deepEqual(toBrevoAddresses(undefined), [])
})

const sender = { email: 'zapisy@szkolawspinaczkowa.pl', name: 'ABC Wspinania' }

test('the configured sender address always wins', () => {
  const body = toBrevoBody(
    { to: 'a@x.pl', from: 'Payload <info@payloadcms.com>', subject: 's' },
    sender,
  )
  assert.equal(body.sender.email, sender.email)
  assert.equal(body.sender.name, 'Payload')
})

test('the body carries reply-to, html and text', () => {
  const body = toBrevoBody(
    {
      to: 'a@x.pl',
      replyTo: { address: 'r@x.pl', name: 'R' },
      subject: 's',
      html: '<p>h</p>',
      text: 't',
    },
    sender,
  )
  assert.deepEqual(body.replyTo, { email: 'r@x.pl', name: 'R' })
  assert.equal(body.htmlContent, '<p>h</p>')
  assert.equal(body.textContent, 't')
  assert.equal(body.cc, undefined)
})

test('an email without its own unsubscribe header gets ours, not Brevo’s', () => {
  // Brevo adds its own when there is none, and a click on it stops every
  // later email to the address (`withServiceUnsubscribe`).
  const url = 'https://x.pl/o-mailach/wypisz'
  const body = toBrevoBody({ to: 'a@x.pl', subject: 's' }, sender, url)
  assert.deepEqual(body.headers, { 'List-Unsubscribe': `<${url}>` })
})

test('an attachment goes to Brevo as a named base64 file', () => {
  const body = toBrevoBody(
    {
      to: 'a@x.pl',
      subject: 's',
      attachments: [
        { filename: 'umowa.pdf', content: new Uint8Array([37, 80, 68, 70]) },
        { filename: '', content: 'x' },
      ],
    },
    sender,
  )
  assert.deepEqual(body.attachment, [{ name: 'umowa.pdf', content: 'JVBERg==' }])
})

test('the newsletter keeps its own unsubscribe header', () => {
  const own = '<https://x.pl/api/newsletter/unsubscribe?token=t>'
  const body = toBrevoBody(
    {
      to: 'a@x.pl',
      subject: 's',
      headers: { 'List-Unsubscribe': own, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    },
    sender,
    'https://x.pl/o-mailach/wypisz',
  )
  assert.equal(body.headers?.['List-Unsubscribe'], own)
})

test('an email without a recipient is refused before it reaches Brevo', () => {
  assert.throws(() => toBrevoBody({ subject: 's' }, sender), /recipient/)
})

test('a line break typed into the name cannot reach the subject line', () => {
  const email = newMessageNotification({ ...message, name: 'Anna\r\nBcc: x@evil.pl' })
  assert.doesNotMatch(email.subject, /[\r\n]/)
  assert.equal(email.subject, 'Nowa wiadomość: Anna Bcc: x@evil.pl')
})

test('every recipient is sent without consent to open and click tracking', () => {
  const body = toBrevoBody(
    { to: ['a@x.pl', 'b@x.pl'], cc: 'c@x.pl', bcc: 'd@x.pl', subject: 's' },
    sender,
  )
  for (const recipient of [...body.to, ...(body.cc ?? []), ...(body.bcc ?? [])]) {
    assert.equal(recipient.contactPixelTrackingConsent, false, recipient.email)
  }
  // Reply-to and sender are not recipients — the field means nothing there.
  assert.equal(body.sender.contactPixelTrackingConsent, undefined)
})

// --- participant accounts ---------------------------------------------------

import { verifyAccountEmail, resetPasswordEmail } from '@/lib/email/templates'
import { publicUrl, tokenLink } from '@/lib/email/links'

const account = { firstName: 'Ola', url: 'https://x.pl/konto/potwierdz?token=abc', validHours: 2 }

test('account emails exist in both languages and say different things', () => {
  for (const make of [verifyAccountEmail, resetPasswordEmail]) {
    const pl = make('pl', account)
    const en = make('en', account)
    assert.notEqual(pl.subject, en.subject)
    assert.match(pl.html, /<html lang="pl">/)
    assert.match(en.html, /<html lang="en">/)
    assert.match(pl.text, /Cześć Ola!/)
    assert.match(en.text, /Hi Ola!/)
  }
})

test('the link in an account email is the one given, and its lifetime is stated', () => {
  const email = resetPasswordEmail('pl', account)
  assert.ok(email.html.includes('href="https://x.pl/konto/potwierdz?token=abc"'))
  assert.match(email.text, /2 godz\./)
  assert.match(resetPasswordEmail('en', account).text, /2 hours/)
})

test('the confirmation email states how long its link works', () => {
  assert.match(verifyAccountEmail('pl', { ...account, validHours: 48 }).text, /48 godz\./)
  assert.match(verifyAccountEmail('en', { ...account, validHours: 48 }).text, /48 hours/)
})

test('no name, no comma-less greeting gap', () => {
  assert.match(verifyAccountEmail('pl', { ...account, firstName: null }).text, /^Cześć!$/m)
  assert.match(verifyAccountEmail('en', { ...account, firstName: '' }).text, /^Hi!$/m)
})

test('Polish account emails do not assume the reader is a man', () => {
  for (const make of [verifyAccountEmail, resetPasswordEmail]) {
    // Masculine second-person past ("zakładałeś", "prosiłeś"); `\p{L}` because
    // `\b` treats Polish letters as non-word characters and matched "Jeśli".
    assert.doesNotMatch(make('pl', account).text, /łeś(?!\p{L})/u)
  }
})

test('email links use PUBLIC_URL, not the build-time site address', () => {
  const before = process.env.PUBLIC_URL
  process.env.PUBLIC_URL = 'https://szkolawspinaczkowa.pl/'
  try {
    assert.equal(publicUrl(), 'https://szkolawspinaczkowa.pl')
    assert.equal(
      tokenLink('/konto/ustaw-haslo', 'a/b+c'),
      'https://szkolawspinaczkowa.pl/konto/ustaw-haslo?token=a%2Fb%2Bc',
    )
  } finally {
    if (before === undefined) delete process.env.PUBLIC_URL
    else process.env.PUBLIC_URL = before
  }
})

// --- registration on an address that already has an account ------------------

import { accountExistsEmail } from '@/lib/email/templates'

const exists = {
  firstName: 'Ola',
  loginUrl: 'https://x.pl/logowanie',
  resetUrl: 'https://x.pl/konto/ustaw-haslo?token=abc',
  validHours: 2,
}

test('the "you already have an account" email says so, in both languages', () => {
  const pl = accountExistsEmail('pl', exists)
  const en = accountExistsEmail('en', exists)
  assert.match(pl.subject, /Masz już konto/)
  assert.match(en.subject, /already have an account/)
  assert.match(pl.text, /Cześć Ola!/)
  assert.match(en.text, /Hi Ola!/)
})

test('it leads to logging in first and offers a new password second', () => {
  const email = accountExistsEmail('pl', exists)
  // The button is the login; the reset is a secondary link.
  assert.ok(email.html.includes('href="https://x.pl/logowanie"'))
  assert.ok(email.html.includes('href="https://x.pl/konto/ustaw-haslo?token=abc"'))
  assert.ok(email.html.indexOf('/logowanie') < email.html.indexOf('/konto/ustaw-haslo'))
  assert.match(email.text, /https:\/\/x\.pl\/logowanie/)
  assert.match(email.text, /https:\/\/x\.pl\/konto\/ustaw-haslo\?token=abc/)
  assert.match(email.text, /2 godz\./)
})

test('it reassures that nothing changed if it was not them', () => {
  assert.match(accountExistsEmail('pl', exists).text, /nic się nie zmieniło/)
  assert.match(accountExistsEmail('en', exists).text, /nothing has changed/)
  assert.doesNotMatch(accountExistsEmail('pl', exists).text, /łeś(?!\p{L})/u)
})

test('a secondary link cannot break out of its attribute either', () => {
  const { html } = renderEmail({
    lang: 'pl',
    heading: 'x',
    paragraphs: [],
    secondaryAction: { label: 'Reset', href: 'https://a.pl/"onclick="x' },
  })
  assert.ok(html.includes('href="https://a.pl/&quot;onclick=&quot;x"'))
})

// --- course bookings ---------------------------------------------------------

import {
  bookingReceivedEmail,
  bookingStatusEmail,
  newAccountFromBookingEmail,
  newBookingNotification,
} from '@/lib/email/templates'

const course = {
  firstName: 'Ola',
  courseTitle: 'Kurs wspinaczki skalnej PZA',
  dates: '4–9 maja 2027',
  location: 'Rzędkowice',
  accountUrl: 'https://x.pl/konto',
}

test('the booking confirmation names the course, dates and place', () => {
  const email = bookingReceivedEmail('pl', { ...course, waitlist: false })
  assert.match(email.subject, /Kurs wspinaczki skalnej PZA/)
  assert.match(email.text, /4–9 maja 2027/)
  assert.match(email.text, /Rzędkowice/)
  // No money talk yet — the deposit rules are still to be agreed.
  assert.doesNotMatch(email.text, /zł|konto bankowe|numer konta|przelew/i)
})

test('a waiting-list booking is told it is on the waiting list', () => {
  assert.match(
    bookingReceivedEmail('pl', { ...course, waitlist: true }).text,
    /list(a|ę|y) rezerwow/,
  )
  assert.match(bookingReceivedEmail('en', { ...course, waitlist: true }).text, /waiting list/i)
  assert.doesNotMatch(bookingReceivedEmail('pl', { ...course, waitlist: false }).text, /rezerwow/)
})

test('every booking email to the participant exists in both languages', () => {
  for (const lang of ['pl', 'en'] as const) {
    assert.ok(bookingReceivedEmail(lang, { ...course, waitlist: false }).subject)
    for (const status of ['confirmed', 'paid', 'cancelled'] as const) {
      const email = bookingStatusEmail(lang, status, course)
      assert.ok(email.subject && email.text.includes(course.dates), `${lang} ${status}`)
    }
    assert.ok(
      newAccountFromBookingEmail(lang, { firstName: 'Ola', url: 'u', validHours: 2 }).subject,
    )
  }
  assert.notEqual(
    bookingStatusEmail('pl', 'confirmed', course).subject,
    bookingStatusEmail('en', 'confirmed', course).subject,
  )
})

test('booking emails point to the account only when there is one', () => {
  assert.match(bookingReceivedEmail('pl', { ...course, waitlist: false }).text, /x\.pl\/konto/)
  const noAccount = bookingReceivedEmail('pl', { ...course, accountUrl: null, waitlist: false })
  assert.doesNotMatch(noAccount.text, /\/konto/)
})

test('the new-account email is about SETTING a password, not resetting one', () => {
  const email = newAccountFromBookingEmail('pl', {
    firstName: 'Ola',
    url: 'https://x.pl/u',
    validHours: 2,
  })
  assert.match(email.text, /ustaw/i)
  assert.doesNotMatch(email.text, /nowe hasło|poprosił/)
  assert.match(email.text, /2 godz\./)
})

test('the school hears about every booking, with the waiting list flagged', () => {
  const base = {
    name: 'Ola Nowak',
    email: 'ola@example.com',
    phone: '+48600100200',
    courseTitle: 'Kurs PZA',
    dates: '4–9 maja 2027',
    notes: 'Mam własną uprząż.',
    adminUrl: 'https://x.pl/admin/collections/bookings/3',
    hasAccount: true,
  }
  const normal = newBookingNotification({ ...base, waitlist: false })
  assert.match(normal.subject, /Nowy zapis: Ola Nowak — Kurs PZA/)
  assert.match(normal.text, /Mam własną uprząż\./)
  assert.doesNotMatch(normal.text, /angielsk/)
  assert.match(newBookingNotification({ ...base, waitlist: true }).subject, /rezerwow/)
})

test('a line break in the name cannot reach the booking subject either', () => {
  const email = newBookingNotification({
    name: 'Ola\r\nBcc: x@evil.pl',
    email: 'o@x.pl',
    phone: '+48600100200',
    courseTitle: 'K',
    dates: 'd',
    notes: '',
    adminUrl: 'u',
    hasAccount: false,
    waitlist: false,
  })
  assert.doesNotMatch(email.subject, /[\r\n]/)
})

// --- camp bookings -----------------------------------------------------------

import { campBookingReceivedEmail, newCampBookingNotification } from '@/lib/email/templates'

const campSignUp = {
  firstName: 'Anna',
  placed: 'Zosia Nowak i Staś Nowak',
  waiting: '',
  campTitle: 'Obóz wspinaczkowo-przygodowy',
  dates: '26 czerwca – 3 lipca 2027',
  location: 'Rzędkowice',
  registrationUrl: 'https://x.pl/obozy/rejestracja?token=abc',
  accountUrl: null,
}

test('siblings get one confirmation with one link to their one registration form', () => {
  for (const lang of ['pl', 'en'] as const) {
    const email = campBookingReceivedEmail(lang, campSignUp)
    assert.match(email.subject, /Zosia Nowak i Staś Nowak — Obóz wspinaczkowo-przygodowy/)
    assert.match(email.text, /Anna/)
    assert.match(email.text, /26 czerwca – 3 lipca 2027/)
    assert.equal(email.text.match(/obozy\/rejestracja\?token=abc/g)?.length, 1)
  }
})

test('a child left on the waiting list is named apart; with all waiting there is no form yet', () => {
  const split = campBookingReceivedEmail('pl', {
    ...campSignUp,
    placed: 'Zosia Nowak',
    waiting: 'Staś Nowak',
  })
  assert.match(split.text, /Zosia Nowak: miejsce zarezerwowane/)
  assert.match(split.text, /Staś Nowak: na tym turnusie zabrakło miejsca/)
  assert.match(split.text, /rejestracja\?token=abc/)
  const all = campBookingReceivedEmail('pl', {
    ...campSignUp,
    placed: '',
    waiting: 'Zosia Nowak i Staś Nowak',
    registrationUrl: null,
  })
  assert.match(all.subject, /^Lista rezerwowa/)
  assert.doesNotMatch(all.text, /rejestracja/)
})

test('the school hears about a sign-up once, with every child and the waiting list flagged', () => {
  const email = newCampBookingNotification({
    name: 'Anna Nowak',
    email: 'anna@example.com',
    phone: '+48600100200',
    campTitle: 'Obóz wspinaczkowo-przygodowy',
    dates: '26 czerwca – 3 lipca 2027',
    children: [
      { name: 'Zosia Nowak', waitlist: false },
      { name: 'Staś Nowak', waitlist: true },
    ],
    notes: null,
    hasAccount: false,
    adminUrl: 'https://x.pl/admin/collections/bookings?where[session][equals]=7',
  })
  assert.match(email.subject, /Nowy zapis na obóz: Zosia Nowak, Staś Nowak/)
  assert.match(email.text, /Dziecko 1: Zosia Nowak\n/)
  assert.match(email.text, /Dziecko 2: Staś Nowak \(LISTA REZERWOWA\)/)
  assert.match(email.text, /Rodzic: Anna Nowak/)
})

import { placeFreedNotification } from '@/lib/email/templates'

test('the freed-place email names the session and the first person waiting', () => {
  const email = placeFreedNotification({
    courseTitle: 'Kurs PZA',
    dates: '4–9 maja 2027',
    spotsLeft: 1,
    waiting: [
      { name: 'Basia Testowa', phone: '+48600100200', email: 'b@x.pl' },
      { name: 'Celina Druga', phone: '+48600100201', email: 'c@x.pl' },
    ],
    adminUrl: 'https://x.pl/admin/collections/sessions/10',
  })
  assert.match(email.subject, /Zwolniło się miejsce: Kurs PZA/)
  assert.match(email.text, /Basia Testowa/)
  assert.ok(email.text.indexOf('Basia') < email.text.indexOf('Celina'), 'in order of booking')
  assert.match(email.text, /\+48600100200/)
  assert.match(email.text, /4–9 maja 2027/)
})

test('someone waiting without an email address is listed by name and phone', () => {
  // A phone booking may have no address (decided 12.10.2026).
  const email = placeFreedNotification({
    courseTitle: 'Kurs PZA',
    dates: '4–9 maja 2027',
    spotsLeft: 1,
    waiting: [{ name: 'Dorota Telefon', phone: '+48600100202', email: null }],
    adminUrl: 'https://x.pl/admin/collections/sessions/10',
  })
  assert.match(email.text, /Dorota Telefon, \+48600100202/)
  assert.doesNotMatch(email.text, /null|, ,/)
})

test('asked for a confirmation link on a confirmed address, it says the address is confirmed', () => {
  // Reported 10.10.2026: "Wyślij link ponownie" on a confirmed account sent
  // nothing, while the page said a link was on its way.
  const pl = accountExistsEmail('pl', { ...exists, reason: 'resend' })
  const en = accountExistsEmail('en', { ...exists, reason: 'resend' })
  assert.match(pl.text, /już potwierdzony/)
  assert.doesNotMatch(pl.text, /założyć konto/)
  assert.match(en.text, /already confirmed/)
  // The default stays the registration wording.
  assert.match(accountExistsEmail('pl', exists).text, /założyć konto/)
})

test('the "account deleted" email says how long the bookings stay', async () => {
  const { accountDeletedEmail } = await import('@/lib/email/templates')
  const { BOOKING_RETENTION_YEARS } = await import('@/lib/expiry')
  assert.match(accountDeletedEmail('pl', {}).text, new RegExp(`do ${BOOKING_RETENTION_YEARS} lat`))
  assert.match(accountDeletedEmail('en', {}).text, new RegExp(`${BOOKING_RETENTION_YEARS} years`))
})

// --- Panel accounts ----------------------------------------------------------

import { panelAccountChangedEmail } from '@/lib/email/templates'

const panelChange = {
  name: 'Krzysztof Wróbel',
  password: true,
  changedAt: new Date('2026-10-13T10:05:00Z'),
  forgotUrl: 'https://x.pl/admin/forgot',
}

test('a panel password change names what changed and when, in Polish time', () => {
  const email = panelAccountChangedEmail(panelChange)
  assert.match(email.subject, /Zmieniono hasło do panelu/)
  assert.match(email.text, /Cześć Krzysztof!/)
  // 10:05 UTC is 12:05 in Poland in October (summer time).
  assert.match(email.text, /12:05/)
})

test('it tells the owner how to get the account back if it was not them', () => {
  const email = panelAccountChangedEmail(panelChange)
  assert.match(email.text, /Nie pamiętasz hasła\?/)
  assert.ok(email.html.includes('href="https://x.pl/admin/forgot"'))
  assert.match(email.text, /https:\/\/x\.pl\/admin\/forgot/)
})

test('a change made from another account says from which one', () => {
  const own = panelAccountChangedEmail(panelChange)
  const other = panelAccountChangedEmail({ ...panelChange, changedBy: 'mateusz@x.pl' })
  assert.doesNotMatch(own.text, /Zmienione z konta/)
  assert.match(other.text, /Zmienione z konta: mateusz@x\.pl/)
})

test('a changed address is named, with a warning that resets now go there', () => {
  const both = panelAccountChangedEmail({ ...panelChange, newEmail: 'nowy@x.pl' })
  const onlyEmail = panelAccountChangedEmail({
    ...panelChange,
    password: false,
    newEmail: 'nowy@x.pl',
  })
  assert.match(both.subject, /hasło i adres e-mail/)
  assert.match(onlyEmail.subject, /Zmieniono adres e-mail do panelu/)
  assert.match(both.text, /Nowy adres: nowy@x\.pl/)
  assert.match(both.text, /poszedłby na nowy adres/)
  assert.doesNotMatch(panelAccountChangedEmail(panelChange).text, /Nowy adres/)
})

test('after an address change it does not send the owner to "forgot password"', () => {
  // The reset link now goes to the NEW address — after a takeover, the
  // intruder's. Pointing the owner there would hand them the account.
  const email = panelAccountChangedEmail({ ...panelChange, newEmail: 'obcy@x.pl' })
  assert.ok(!email.html.includes('href="https://x.pl/admin/forgot"'))
  assert.doesNotMatch(email.text, /ustaw od razu nowe hasło/)
  assert.match(email.text, /Mateusz/)
})

// --- camp registration form ----------------------------------------------------

import {
  registrationLinkEmail,
  registrationNotification,
  registrationReceivedEmail,
} from '@/lib/email/templates'

const registration = {
  firstName: 'Anna',
  childName: 'Zosia Nowak',
  campTitle: 'Obóz wspinaczkowo-przygodowy',
  dates: '26 czerwca – 3 lipca 2027',
  url: 'https://x.pl/obozy/rejestracja?token=abc',
}

test('the registration link says why it comes: again, a freed place, a reminder', () => {
  for (const lang of ['pl', 'en'] as const) {
    const subjects = (['again', 'place', 'reminder'] as const).map(
      (reason) => registrationLinkEmail(lang, reason, registration).subject,
    )
    assert.equal(new Set(subjects).size, 3, lang)
    assert.match(registrationLinkEmail(lang, 'place', registration).text, /token=abc/)
  }
  assert.match(registrationLinkEmail('pl', 'reminder', registration).subject, /^Przypomnienie/)
})

const payment = {
  deposit: '500 zł',
  dueDate: '8 marca 2027',
  recipient: 'IQ SERVICE Krzysztof Wróbel / ABC WSPINANIA',
  account: 'PL89 1140 2004 0000 3002 7291 9707',
  title: 'Obóz JURA Zosia Nowak',
  remaining: '2000 zł',
  refundDays: 30,
}

test('after the form the parent gets the deposit, its deadline and the bank details', () => {
  const email = registrationReceivedEmail('pl', { ...registration, payment })
  assert.match(email.subject, /dane do przelewu — Zosia Nowak/)
  assert.match(email.text, /Zaliczka: 500 zł/)
  assert.match(email.text, /Termin wpłaty zaliczki: 8 marca 2027/)
  assert.match(email.text, /Pozostała kwota: 2000 zł — najpóźniej w dniu rozpoczęcia obozu/)
  assert.match(email.text, /Numer konta: PL89 1140 2004 0000 3002 7291 9707/)
  assert.match(email.text, /Tytuł przelewu: Obóz JURA Zosia Nowak/)
  assert.match(email.text, /do 30 dni przed obozem/)
  assert.match(email.text, /Popraw formularz: https:\/\/x\.pl\/obozy\/rejestracja\?token=abc/)
  assert.match(
    registrationReceivedEmail('en', { ...registration, payment }).text,
    /Deposit: 500 zł/,
  )
})

test('without a price in the panel the email gives no balance rather than a wrong one', () => {
  const email = registrationReceivedEmail('pl', {
    ...registration,
    payment: { ...payment, remaining: null },
  })
  assert.doesNotMatch(email.text, /Pozostała kwota/)
})

import { campStatusEmail, depositReminderEmail } from '@/lib/email/templates'

test('the deposit email says what is left and where it goes', () => {
  const email = campStatusEmail('pl', 'deposit', { ...registration, payment })
  assert.match(email.subject, /^Zaliczka wpłynęła: Zosia Nowak/)
  assert.match(email.text, /Do zapłaty zostało 2000 zł/)
  assert.match(email.text, /Numer konta: PL89/)
  assert.doesNotMatch(email.text, /Termin wpłaty zaliczki/, 'the deposit is paid')
})

test('camp status emails speak about the camp and the child, not a course', () => {
  for (const lang of ['pl', 'en'] as const) {
    for (const status of ['confirmed', 'deposit', 'paid', 'cancelled'] as const) {
      const email = campStatusEmail(lang, status, { ...registration, payment: null })
      assert.match(email.subject, /Zosia Nowak/, `${lang} ${status}`)
      assert.doesNotMatch(email.text, /\bkurs|course\b/i, `${lang} ${status}`)
    }
  }
})

test('the deposit reminder repeats the bank details', () => {
  const email = depositReminderEmail('pl', { ...registration, payment })
  assert.match(email.subject, /Przypomnienie o zaliczce — Zosia Nowak/)
  assert.match(email.text, /termin minął 8 marca 2027/)
  assert.match(email.text, /Numer konta: PL89/)
})

test('the school hears a form came in or changed — without the health answers', () => {
  const data = {
    childName: 'Zosia Nowak',
    parent: 'Anna Nowak',
    campTitle: 'Obóz',
    dates: 'd',
    adminUrl: 'https://x.pl/admin/collections/bookings/7',
  }
  const first = registrationNotification({ ...data, updated: false })
  const updated = registrationNotification({ ...data, updated: true })
  assert.notEqual(first.subject, updated.subject)
  // The template takes no health data at all; the text says where it is.
  assert.match(first.text, /w panelu/)
  assert.doesNotMatch(first.text + updated.text, /PESEL: |Uczulenia: |Leki: /)
})

test('the payment email says the contract is attached and where it goes back — or that it follows', () => {
  const withContract = registrationReceivedEmail('pl', {
    ...registration,
    payment,
    contractAttached: true,
    contractEmail: 'obozy@abcwspinania.info',
  })
  assert.match(
    withContract.text,
    /W załączniku jest umowa[\s\S]*odeślij[\s\S]*obozy@abcwspinania\.info/,
  )
  assert.match(
    registrationReceivedEmail('pl', { ...registration, payment }).text,
    /prześlemy w osobnym mailu/,
  )
  assert.match(
    registrationReceivedEmail('en', {
      ...registration,
      payment,
      contractAttached: true,
      contractEmail: 'obozy@abcwspinania.info',
    }).text,
    /The contract is attached/,
  )
})
