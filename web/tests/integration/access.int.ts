import assert from 'node:assert/strict'

import {
  email,
  http,
  makeAdmin,
  makeBooking,
  makeCourse,
  makeCustomer,
  makeSession,
  test,
} from './harness'

/**
 * Who reads what over the REST API — the promise of ZAKRES pkt 8: a
 * participant must not read other people's data through `/api/*`. The
 * site reads through the Local API and skips these rules; they guard the
 * API only (CLAUDE.md, rule 28).
 */

const PRIVATE = [
  'bookings',
  'messages',
  'newsletter',
  'customers',
  'users',
  'broadcasts',
  'broadcast-deliveries',
]

test('anonymous: every collection with personal data is closed', async () => {
  for (const collection of PRIVATE) {
    const response = await http(`/api/${collection}?limit=1`)
    assert.equal(response.status, 403, `${collection} answered ${response.status}`)
  }
})

test('anonymous: the newsletter cannot be written over REST (double opt-in)', async () => {
  const response = await http('/api/newsletter', {
    method: 'POST',
    body: JSON.stringify({
      email: email('rest-nl'),
      status: 'subscribed',
      consentText: 'x',
      consentDate: new Date().toISOString(),
    }),
  })
  assert.equal(response.status, 403)
})

test('participant: sees own bookings only, never another participant’s', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id)
  const ola = await makeCustomer('ola')
  const jan = await makeCustomer('jan')
  const own = await makeBooking(session.id, 'ola', { customer: ola.id, email: ola.email })
  const other = await makeBooking(session.id, 'jan', { customer: jan.id, email: jan.email })

  const list = await (await http('/api/bookings?limit=100&depth=0', { token: ola.token })).json()
  const ids = list.docs.map((d: { id: number }) => d.id)
  assert.ok(ids.includes(own.id), 'own booking missing')
  assert.ok(!ids.includes(other.id), 'another participant’s booking visible')

  const direct = await http(`/api/bookings/${other.id}`, { token: ola.token })
  assert.ok([403, 404].includes(direct.status), `direct read answered ${direct.status}`)

  // The school's notes never reach the participant, even on their own booking.
  const mine = await (await http(`/api/bookings/${own.id}?depth=0`, { token: ola.token })).json()
  assert.equal('adminNotes' in mine, false)
  assert.equal('emailIssue' in mine, false)
})

test('participant: the session API does not leak who else is booked', async () => {
  const course = await makeCourse()
  const session = await makeSession(course.id)
  const ola = await makeCustomer('ola2')
  await makeBooking(session.id, 'someone-else')
  const body = await (await http(`/api/sessions/${session.id}`, { token: ola.token })).text()
  assert.ok(!body.includes(email('someone-else')), 'another participant’s email in the session')
})

test('participant: no school data and no writes to content', async () => {
  const ola = await makeCustomer('ola3')
  for (const collection of ['messages', 'newsletter', 'users', 'broadcasts']) {
    const response = await http(`/api/${collection}?limit=1`, { token: ola.token })
    assert.equal(response.status, 403, `${collection} answered ${response.status}`)
  }
  const write = await http('/api/courses', {
    method: 'POST',
    token: ola.token,
    body: JSON.stringify({ title: 'x', slug: email('x') }),
  })
  assert.equal(write.status, 403)
  const others = await (await http('/api/customers?limit=100', { token: ola.token })).json()
  assert.deepEqual(
    others.docs.map((d: { id: number }) => d.id),
    [ola.id],
  )
})

test('school: the dashboard tile links open the filtered list', async () => {
  const admin = await makeAdmin()
  const page = await (
    await http('/admin', { headers: { Cookie: `payload-token=${admin.token}` } })
  ).text()
  assert.match(page, /Maile, które nie doszły/)
  // Filters with several conditions are encoded by index, not as "[object Object]",
  // one field each (`adminListUrl.ts`) so the "Filtry" panel shows them all — and
  // not as `where[or]…`, on which Payload opens that panel every time.
  assert.match(page, /where%5Band%5D%5B0%5D%5BemailIssueAt%5D%5Bexists%5D=true/)
  assert.doesNotMatch(page, /where%5Bor%5D/)
  assert.doesNotMatch(page, /object%20Object|\[object Object\]/)
})
