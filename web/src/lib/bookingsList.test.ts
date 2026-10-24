import assert from 'node:assert/strict'
import test from 'node:test'

import { bookingsListDescription, kindFromListQuery } from '@/lib/bookingsList'

test('the menu link’s filter says which half the list is', () => {
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

test('each half is named and speaks only of itself', () => {
  const camp = bookingsListDescription('camp')
  const course = bookingsListDescription('course')
  assert.equal(camp.title, 'Zapisy na obozy')
  assert.equal(course.title, 'Zapisy na kursy')
  assert.match(camp.text, /rodzica/)
  assert.doesNotMatch(course.text, /obóz|obozie|rodzic/)
  assert.doesNotMatch(camp.text, /kurs/)
  assert.equal(bookingsListDescription(null).title, undefined)
})
