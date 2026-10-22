import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_PRE_CAMP_TEMPLATE,
  PRE_CAMP_REMINDER_DAYS,
  fillPreCampTemplate,
  preCampDueWhere,
  templateToRichText,
} from '@/lib/campPreCamp'
import { renderRichText } from '@/lib/email/richText'

test('the template becomes paragraphs and a bulleted list the email renders', () => {
  const value = templateToRichText(
    'Dzień dobry,\n\nPamiętajcie:\n- plecak,\n- bidon.\n\nPozdrawiam',
  )
  const kinds = value.root?.children?.map((n) => n.type)
  assert.deepEqual(kinds, ['paragraph', 'paragraph', 'list', 'paragraph'])
  const { html, text } = renderRichText(value)
  assert.match(html, /<ul[^>]*>[\s\S]*<li[^>]*>plecak,<\/li>[\s\S]*<\/ul>/)
  assert.match(text, /Pozdrawiam/)
})

test('the default text is Krzysiek’s, with the per-turnus parts left to fill in', () => {
  assert.match(DEFAULT_PRE_CAMP_TEMPLATE, /\[miejsce zbiórki\]/)
  assert.match(DEFAULT_PRE_CAMP_TEMPLATE, /karty kwalifikacyjne/)
  assert.match(DEFAULT_PRE_CAMP_TEMPLATE, /- bidon na wodę/)
  assert.equal(PRE_CAMP_REMINDER_DAYS, 16)
})

test('a turnus is due for the reminder within the days before it, once', () => {
  const where = JSON.stringify(preCampDueWhere(new Date('2027-06-10T12:00:00Z'), 16))
  assert.match(where, /"less_than_equal":"2027-06-26T12:00:00.000Z"/)
  assert.match(where, /"greater_than":"2027-06-10T12:00:00.000Z"/)
  assert.match(where, /"preCampDraftAt":\{"exists":false\}/)
  assert.match(where, /"camp":\{"exists":true\}/)
})

test('the camp name is filled in, the sleeping bag only where the camp asks for it', () => {
  const own = fillPreCampTemplate(DEFAULT_PRE_CAMP_TEMPLATE, {
    title: 'Jura Lato',
    ownSleepingBags: true,
  })
  assert.match(own, /nasz obóz: Jura Lato\./)
  assert.match(own, /^- śpiwór,$/m)
  assert.match(own, /\[miejsce zbiórki\]/)
  const bedding = fillPreCampTemplate(DEFAULT_PRE_CAMP_TEMPLATE, {
    title: 'Jura Lato',
    ownSleepingBags: false,
  })
  assert.doesNotMatch(bedding, /śpiwór/)
  assert.match(bedding, /- gry planszowe/)
})
