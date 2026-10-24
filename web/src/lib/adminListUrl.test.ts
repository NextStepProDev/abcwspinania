import assert from 'node:assert/strict'
import test from 'node:test'

import { bookingsListUrl, listUrl, whereParams } from '@/lib/adminListUrl'
import { kindFromListQuery } from '@/lib/bookingsList'
import { dashboardConditions, sessionBookingsConditions } from '@/lib/dashboardConditions'

const keys = (url: string) => Array.from(new URL(url, 'http://x').searchParams.keys())

test('each condition is its own entry of one `and`', () => {
  const params = whereParams([
    { kind: { equals: 'camp' } },
    { status: { in: ['new', 'confirmed'] } },
  ])
  assert.deepEqual(Array.from(params.entries()), [
    ['where[and][0][kind][equals]', 'camp'],
    ['where[and][1][status][in][0]', 'new'],
    ['where[and][1][status][in][1]', 'confirmed'],
  ])
})

test('a condition with two fields is refused — the filters would show one', () => {
  assert.throws(() => whereParams([{ kind: { equals: 'camp' }, status: { equals: 'new' } }]))
})

test('every dashboard tile and session link is drawable by the filters', () => {
  const sets = [
    ...Object.values(dashboardConditions(new Date('2026-10-24T08:00:00Z'))),
    sessionBookingsConditions(7, 'camp'),
  ]
  for (const conditions of sets) {
    for (const c of conditions) assert.equal(Object.keys(c).length, 1, JSON.stringify(c))
    // No relationship path: the builder would not show it at all.
    for (const c of conditions) assert.doesNotMatch(Object.keys(c)[0], /\./)
    assert.doesNotThrow(() => bookingsListUrl(conditions))
  }
})

test('a tile’s list says which half it is, and opens in the menu’s view', () => {
  const url = bookingsListUrl(dashboardConditions(new Date()).campWithoutForm)
  const search = new URL(url, 'http://x').searchParams
  assert.equal(kindFromListQuery(search.entries()), 'camp')
  assert.equal(search.get('sort'), 'sessionStart')
  assert.equal(search.get('limit'), '100')
  // Not the builder's `where[or]…`: Payload would open "Filtry" on it.
  assert.ok(keys(url).every((k) => !k.startsWith('where[or]')))
})

test('another collection’s list is filtered only', () => {
  const url = listUrl('messages', [{ status: { equals: 'new' } }])
  assert.equal(url, '/admin/collections/messages?where%5Band%5D%5B0%5D%5Bstatus%5D%5Bequals%5D=new')
})
