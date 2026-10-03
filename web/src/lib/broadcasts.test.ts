import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifySendError,
  emailFailureReason,
  dedupeRecipients,
  hasEnglishVersion,
  versionFor,
} from '@/lib/broadcasts'
import { toBrevoBody } from '@/lib/email/brevo'
import { hasText, renderRichText, type LexicalNode } from '@/lib/email/richText'
import { broadcastEmail, newsletterConfirmEmail } from '@/lib/email/templates'
import { stalePendingNewsletterWhere } from '@/lib/expiry'

// --- rich text ------------------------------------------------------------------

const text = (value: string, format = 0): LexicalNode => ({ type: 'text', text: value, format })
const paragraph = (...children: LexicalNode[]): LexicalNode => ({ type: 'paragraph', children })
const doc = (...children: LexicalNode[]) => ({ root: { type: 'root', children } })

test('paragraphs, formatting and a heading come out as email HTML and as text', () => {
  const out = renderRichText(
    doc(
      { type: 'heading', tag: 'h2', children: [text('Zmiana planu')] },
      paragraph(text('Zbiórka o '), text('9:00', 1), text(' pod skałą.')),
    ),
  )
  assert.match(out.html, /Zmiana planu<\/p>/)
  assert.match(out.html, /<strong>9:00<\/strong>/)
  assert.match(out.html, /<p style="margin:0 0 14px">Zbiórka o <strong>/)
  assert.equal(out.text, 'ZMIANA PLANU\n\nZbiórka o 9:00 pod skałą.')
})

test('every piece of text is escaped — nothing typed in the panel becomes markup', () => {
  const out = renderRichText(doc(paragraph(text('<script>alert(1)</script> & "x"'))))
  assert.doesNotMatch(out.html, /<script>/)
  assert.match(out.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;x&quot;/)
})

test('links: http, mailto and tel stay links; anything else becomes plain text', () => {
  const link = (url: string): LexicalNode => ({
    type: 'link',
    fields: { url, linkType: 'custom' },
    children: [text('tutaj')],
  })
  const ok = renderRichText(doc(paragraph(link('https://abcwspinania.info/kursy'))))
  assert.match(ok.html, /<a href="https:\/\/abcwspinania\.info\/kursy"/)
  assert.equal(ok.text, 'tutaj (https://abcwspinania.info/kursy)')

  const bad = renderRichText(doc(paragraph(link('javascript:alert(1)'))))
  assert.doesNotMatch(bad.html, /<a /)
  assert.doesNotMatch(bad.html, /javascript/)
  assert.equal(bad.text, 'tutaj')

  const internal = renderRichText(
    doc(paragraph({ type: 'link', fields: { linkType: 'internal' }, children: [text('kurs')] })),
  )
  assert.doesNotMatch(internal.html, /<a /)
})

test('lists, nested lists included, in HTML and in text', () => {
  const item = (...children: LexicalNode[]): LexicalNode => ({ type: 'listitem', children })
  const out = renderRichText(
    doc({
      type: 'list',
      listType: 'number',
      children: [
        item(text('Uprząż')),
        item(text('Buty'), { type: 'list', listType: 'bullet', children: [item(text('ciasne'))] }),
      ],
    }),
  )
  assert.match(out.html, /^<ol [^>]*><li [^>]*>Uprząż<\/li><li [^>]*>Buty<ul /)
  assert.equal(out.text, '1. Uprząż\n2. Buty\n  - ciasne')
})

test('an empty editor counts as no text; empty paragraphs leave no gaps', () => {
  assert.equal(hasText(doc(paragraph())), false)
  assert.equal(hasText(null), false)
  assert.equal(hasText(doc(paragraph(text('  ')))), false)
  assert.equal(hasText(doc(paragraph(text('Hej')))), true)
  const out = renderRichText(doc(paragraph(text('A')), paragraph(), paragraph(text('B'))))
  assert.equal(out.text, 'A\n\nB')
  assert.equal((out.html.match(/<p /g) ?? []).length, 2)
})

test('an unknown node keeps its text instead of disappearing', () => {
  const out = renderRichText(doc({ type: 'quote', children: [text('Cytat')] }))
  assert.match(out.html, /Cytat/)
  assert.equal(out.text, 'Cytat')
})

// --- recipients and versions --------------------------------------------------------

test('one email per address, first entry wins, case and spaces ignored', () => {
  const list = dedupeRecipients([
    { email: 'Anna@X.pl ', firstName: 'Anna', language: 'en' },
    { email: 'anna@x.pl', firstName: 'Ania', language: 'pl' },
    { email: 'jan@x.pl', language: 'pl' },
    { email: '  ', language: 'pl' },
  ])
  assert.deepEqual(
    list.map((r) => [r.email, r.firstName, r.language]),
    [
      ['anna@x.pl', 'Anna', 'en'],
      ['jan@x.pl', undefined, 'pl'],
    ],
  )
})

test('English goes out only when both its subject and its text are written', () => {
  const pl = { subject: 'Temat', content: doc(paragraph(text('Treść'))) }
  const full = { ...pl, subjectEn: 'Subject', contentEn: doc(paragraph(text('Body'))) }
  assert.equal(hasEnglishVersion(full), true)
  assert.equal(hasEnglishVersion({ ...full, subjectEn: ' ' }), false)
  assert.equal(hasEnglishVersion({ ...full, contentEn: doc(paragraph()) }), false)

  assert.equal(versionFor('en', full).subject, 'Subject')
  assert.equal(versionFor('en', full).lang, 'en')
  assert.equal(versionFor('pl', full).subject, 'Temat')
  // No English version: the English reader gets Polish — in a Polish frame.
  assert.deepEqual([versionFor('en', pl).lang, versionFor('en', pl).subject], ['pl', 'Temat'])
})

// --- send failures ------------------------------------------------------------------

test('the daily limit and a refused key pause the whole broadcast', () => {
  for (const message of [
    'Brevo refused the email: 402 {"code":"not_enough_credits"}',
    'Brevo refused the email: 429 Too many requests',
    'Brevo refused the email: 401 {"code":"unauthorized"}',
    'Brevo refused the email: 403 {"message":"permission denied"}',
    'Brevo refused the email: 400 {"message":"You have exceeded your daily sending limit"}',
  ]) {
    assert.equal(classifySendError(new Error(message)), 'pause', message)
  }
})

test('a refused address fails alone; network and server errors are retried', () => {
  assert.equal(
    classifySendError(new Error('Brevo refused the email: 400 {"message":"email is not valid"}')),
    'recipient',
  )
  assert.equal(classifySendError(new Error('Brevo refused the email: 502 Bad gateway')), 'retry')
  assert.equal(classifySendError(new Error('fetch failed')), 'retry')
  assert.equal(
    classifySendError(new DOMException('The operation timed out', 'TimeoutError')),
    'retry',
  )
})

// --- emails -------------------------------------------------------------------------

test('a newsletter broadcast carries the unsubscribe link; a booking one does not', () => {
  const body = renderRichText(doc(paragraph(text('Nowe terminy!'))))
  const news = broadcastEmail('pl', {
    subject: 'Nowe terminy',
    body,
    reason: { kind: 'newsletter', unsubscribeUrl: 'https://x.pl/newsletter/wypisz?token=abc' },
  })
  assert.match(news.html, /https:\/\/x\.pl\/newsletter\/wypisz\?token=abc/)
  assert.match(
    news.text,
    /Wypisz się z newslettera: https:\/\/x\.pl\/newsletter\/wypisz\?token=abc/,
  )
  assert.match(news.html, /Nowe terminy!/)

  const course = broadcastEmail('en', {
    subject: 'Change\r\nBcc: x@y.z',
    body,
    reason: { kind: 'session', label: 'Kurs skałkowy, 12–14 May' },
  })
  assert.doesNotMatch(course.html, /wypisz|unsubscribe/i)
  assert.match(course.text, /booked on: Kurs skałkowy, 12–14 May/)
  assert.equal(course.subject, 'Change Bcc: x@y.z')
})

test('the newsletter confirmation exists in both languages, with the link', () => {
  for (const lang of ['pl', 'en'] as const) {
    const email = newsletterConfirmEmail(lang, { url: 'https://x.pl/newsletter/potwierdz?token=t' })
    assert.ok(email.subject)
    assert.match(email.html, /newsletter\/potwierdz\?token=t/)
    assert.match(email.text, /newsletter\/potwierdz\?token=t/)
  }
})

test('string headers reach Brevo (List-Unsubscribe); anything else is dropped', () => {
  const body = toBrevoBody(
    {
      to: 'a@x.pl',
      subject: 's',
      headers: {
        'List-Unsubscribe': '<https://x.pl/api/newsletter/unsubscribe?token=t>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Weird': ['a', 'b'],
      },
    } as never,
    { email: 'zapisy@x.pl', name: 'ABC' },
  )
  assert.deepEqual(body.headers, {
    'List-Unsubscribe': '<https://x.pl/api/newsletter/unsubscribe?token=t>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  })
  assert.equal(
    toBrevoBody({ to: 'a@x.pl', subject: 's' }, { email: 'z@x.pl', name: 'A' }).headers,
    undefined,
  )
})

// --- newsletter cleanup ---------------------------------------------------------------

test('unconfirmed newsletter sign-ups are swept a week after the last link', () => {
  const where = stalePendingNewsletterWhere(new Date('2026-10-10T12:00:00Z'))
  const json = JSON.stringify(where)
  assert.match(json, /"status":\{"equals":"pending"\}/)
  assert.match(json, /"consentDate":\{"less_than":"2026-10-03T12:00:00.000Z"\}/)
  assert.match(json, /"confirmationSentAt":\{"less_than":"2026-10-03T12:00:00.000Z"\}/)
  assert.match(json, /"confirmationSentAt":\{"exists":false\}/)
})

test('a failed booking email is explained in words, not in Brevo JSON', () => {
  assert.match(
    emailFailureReason(new Error('Brevo refused the email: 402 {"code":"not_enough_credits"}')),
    /dzienny limit/,
  )
  assert.match(
    emailFailureReason(new Error('Brevo refused the email: 400 {"message":"email is not valid"}')),
    /odrzucił ten adres/,
  )
  assert.match(emailFailureReason(new Error('fetch failed')), /brak połączenia/)
  assert.doesNotMatch(emailFailureReason(new Error('Brevo refused the email: 402 {"x":1}')), /\{/)
})
