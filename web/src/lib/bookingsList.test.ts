import assert from 'node:assert/strict'
import test from 'node:test'

import { bookingsListUrl } from '@/lib/adminListUrl'
import { describeBookingsList, kindFromListQuery } from '@/lib/bookingsList'
import {
  bookingsMenuConditions,
  dashboardConditions,
  sessionBookingsConditions,
} from '@/lib/dashboardConditions'

test('the menu link’s filter says which half the list is', () => {
  assert.equal(kindFromListQuery([['where[and][0][kind][equals]', 'camp']]), 'camp')
  assert.equal(kindFromListQuery([['where[kind][equals]', 'camp']]), 'camp')
  assert.equal(kindFromListQuery([['where[kind][equals]', 'course']]), 'course')
})

test('the same filter nested by the panel’s filter builder still counts', () => {
  const params: [string, string][] = [
    ['where[or][0][and][0][kind][equals]', 'camp'],
    ['where[or][0][and][1][status][equals]', 'new'],
    ['page', '2'],
  ]
  assert.equal(kindFromListQuery(params), 'camp')
})

test('no filter, both kinds or an unknown one: the whole list', () => {
  assert.equal(kindFromListQuery([]), null)
  assert.equal(kindFromListQuery([['search', 'Zosia']]), null)
  assert.equal(
    kindFromListQuery([
      ['where[or][0][and][0][kind][equals]', 'camp'],
      ['where[or][1][and][0][kind][equals]', 'course'],
    ]),
    null,
  )
  assert.equal(kindFromListQuery([['where[kind][equals]', 'trip']]), null)
})

test('each half’s rules speak only of itself', () => {
  const rules = (q: string) => describeBookingsList(new URLSearchParams(q).entries()).rules
  assert.match(rules('where[kind][equals]=camp'), /rodzica/)
  assert.doesNotMatch(rules('where[kind][equals]=course'), /obóz|obozie|rodzic/)
  assert.doesNotMatch(rules('where[kind][equals]=camp'), /kurs/)
})

// --- what the list is: from the menu or from a dashboard tile ---------------

const describe = (url: string) =>
  describeBookingsList(new URL(url, 'http://x').searchParams.entries())

test('each dashboard tile’s list says which tile it is', () => {
  const c = dashboardConditions(new Date('2026-10-24T08:00:00Z'))
  const titles = {
    newCourse: 'Zapisy na kursy · Nowe zgłoszenia',
    confirmedCourse: 'Zapisy na kursy · Potwierdzone',
    waitingCourse: 'Zapisy na kursy · Lista rezerwowa',
    newCamp: 'Zapisy na obozy · Nowe zgłoszenia',
    campWithoutForm: 'Zapisy na obozy · Bez formularza',
    campLateDeposit: 'Zapisy na obozy · Zaliczka po terminie',
    waitingCamp: 'Zapisy na obozy · Lista rezerwowa',
    lostEmails: 'Zapisy · Maile, które nie doszły',
  } satisfies Record<keyof typeof c, string>
  for (const [tile, title] of Object.entries(titles)) {
    const d = describe(bookingsListUrl(c[tile as keyof typeof c]))
    assert.equal(d.title, title, tile)
    assert.ok(d.about.length > 20, tile)
  }
  assert.equal(
    describe(bookingsListUrl(sessionBookingsConditions(7, 'camp'))).title,
    'Zapisy na obozy · Jeden turnus',
  )
})

test('the menu’s list is the whole half, by date', () => {
  const d = describe(bookingsListUrl(bookingsMenuConditions('camp', new Date())))
  assert.equal(d.title, 'Zapisy na obozy')
  assert.match(d.about, /od miesiąca wstecz/)
})

test('the whole half without the date condition does not claim one', () => {
  const d = describe('/admin/collections/bookings?where[and][0][kind][equals]=course')
  assert.equal(d.title, 'Zapisy na kursy')
  assert.doesNotMatch(d.about, /miesiąca/)
})

test('a list filtered by hand says so; the mail rules stay per half', () => {
  const d = describe(
    '/admin/collections/bookings?where[and][0][kind][equals]=camp&where[and][1][phone][like]=600',
  )
  assert.equal(d.title, 'Zapisy na obozy')
  assert.match(d.about, /filtr/i)
  assert.match(d.rules, /rodzicowi/)
  assert.doesNotMatch(
    describe('/admin/collections/bookings?where[kind][equals]=course').rules,
    /rodzic/,
  )
})
