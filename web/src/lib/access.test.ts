import test from 'node:test'
import assert from 'node:assert/strict'

import type { CollectionConfig, GlobalConfig } from 'payload'

import { collections } from '@/collections/index'
import { globals } from '@/globals/index'
import { Users } from '@/collections/Users'
import {
  ADMIN_COLLECTION,
  adminOrOwner,
  adminOrSelf,
  isAdmin,
  publishedFlagOrAdmin,
  publishedOrAdmin,
} from '@/lib/access'

// Hand-made requests. A participant account is any `auth` collection other
// than the panel's — `customers` is the one planned for the booking stage.
const anonymous = { req: { user: null } }
const participant = { req: { user: { collection: 'customers', id: 7 } } }
const admin = { req: { user: { collection: ADMIN_COLLECTION } } }

type Rule = (args: unknown) => unknown
const rule = (r: unknown) => r as Rule

/** Collections a visitor may legitimately create entries in: public forms. */
const PUBLIC_FORMS = new Set(['messages', 'newsletter'])

/** Collections whose entries are personal data — nobody but the school reads them. */
const PRIVATE = new Set(['messages', 'newsletter', 'users'])

/**
 * Public forms the school does not fill in from the panel (no "Stwórz nowy").
 * The only exception to "the school keeps full access" — named, so another
 * one cannot slip in unnoticed.
 */
const NO_PANEL_CREATE = new Set(['messages'])

/** Participant accounts: the school reads all, a participant only their own. */
const SELF_READABLE = new Set(['customers'])

// --- the rules themselves -----------------------------------------------------

test('only a panel account counts as the school', () => {
  assert.equal(isAdmin(admin), true)
  assert.equal(isAdmin(participant), false)
  assert.equal(isAdmin(anonymous), false)
  assert.equal(isAdmin({ req: {} }), false)
})

test('the admin collection named in access rules is the panel one', () => {
  assert.equal(Users.slug, ADMIN_COLLECTION)
})

test('a participant reads their own account and nobody else does', () => {
  const ownAccount = adminOrSelf('customers')
  assert.equal(ownAccount(admin), true)
  assert.deepEqual(ownAccount(participant), { id: { equals: 7 } })
  assert.equal(ownAccount(anonymous), false)
  // A school account is not "self" in another collection — it is the school.
  assert.equal(adminOrSelf('customers')({ req: { user: { collection: 'other', id: 7 } } }), false)
})

test('a participant reads only the entries they own', () => {
  const ownBookings = adminOrOwner('customer')
  assert.equal(ownBookings(admin), true)
  assert.deepEqual(ownBookings(participant), { customer: { equals: 7 } })
  assert.equal(ownBookings(anonymous), false)
  // Only a participant account owns entries — not some other auth collection.
  assert.equal(ownBookings({ req: { user: { collection: 'other', id: 7 } } }), false)
})

test('bookings: participants read their own, change nothing, and visitors see none', () => {
  const bookings = collections.find((c) => c.slug === 'bookings')
  assert.ok(bookings, 'the bookings collection is registered')
  assert.equal(rule(bookings.access?.read)(anonymous), false)
  assert.deepEqual(rule(bookings.access?.read)(participant), { customer: { equals: 7 } })
  for (const op of ['create', 'update', 'delete'] as const) {
    assert.ok(!rule(bookings.access?.[op])(participant), `participant may ${op} bookings`)
    assert.ok(!rule(bookings.access?.[op])(anonymous), `anyone may ${op} bookings`)
  }
})

test('drafts are visible to the school and only published entries to others', () => {
  assert.equal(publishedOrAdmin(admin), true)
  assert.deepEqual(publishedOrAdmin(participant), { _status: { equals: 'published' } })
  assert.deepEqual(publishedOrAdmin(anonymous), { _status: { equals: 'published' } })
})

test('unpublished testimonials are visible to the school only', () => {
  assert.equal(publishedFlagOrAdmin(admin), true)
  assert.deepEqual(publishedFlagOrAdmin(participant), { published: { equals: true } })
  assert.deepEqual(publishedFlagOrAdmin(anonymous), { published: { equals: true } })
})

// --- every collection and global ---------------------------------------------

const name = (c: CollectionConfig | GlobalConfig) => c.slug

test('every collection declares all four operations — no Payload default', () => {
  for (const c of collections) {
    for (const op of ['create', 'read', 'update', 'delete'] as const) {
      assert.equal(typeof c.access?.[op], 'function', `${name(c)}.access.${op} is not declared`)
    }
    if (c.versions) {
      assert.equal(
        typeof c.access?.readVersions,
        'function',
        `${name(c)} has versions but no access.readVersions`,
      )
    }
  }
})

test('every global declares read and update — no Payload default', () => {
  for (const g of globals) {
    assert.equal(typeof g.access?.read, 'function', `${name(g)}.access.read is not declared`)
    assert.equal(typeof g.access?.update, 'function', `${name(g)}.access.update is not declared`)
    if (g.versions) {
      assert.equal(typeof g.access?.readVersions, 'function', `${name(g)}.access.readVersions`)
    }
  }
})

test('a logged-in participant can change nothing the school publishes', () => {
  for (const c of collections) {
    for (const op of ['update', 'delete'] as const) {
      assert.ok(!rule(c.access?.[op])(participant), `participant may ${op} ${name(c)}`)
    }
    if (!PUBLIC_FORMS.has(c.slug)) {
      assert.ok(!rule(c.access?.create)(participant), `participant may create ${name(c)}`)
    }
    if (c.versions) {
      assert.ok(
        !rule(c.access?.readVersions)(participant),
        `participant may read ${name(c)} versions`,
      )
    }
  }
  for (const g of globals) {
    assert.ok(!rule(g.access?.update)(participant), `participant may update ${name(g)}`)
  }
})

test('personal data is readable by the school only', () => {
  for (const c of collections.filter((c) => PRIVATE.has(c.slug))) {
    assert.ok(!rule(c.access?.read)(participant), `participant may read ${name(c)}`)
    assert.ok(!rule(c.access?.read)(anonymous), `anyone may read ${name(c)}`)
  }
})

test('participant accounts are readable only by the school and their owner', () => {
  const accounts = collections.filter((c) => SELF_READABLE.has(c.slug))
  assert.equal(accounts.length, SELF_READABLE.size, 'a self-readable collection is missing')
  for (const c of accounts) {
    assert.equal(rule(c.access?.read)(anonymous), false, `anyone may read ${name(c)}`)
    assert.deepEqual(rule(c.access?.read)(participant), { id: { equals: 7 } })
    // Writes go through the site's own server actions, never straight to REST.
    for (const op of ['create', 'update', 'delete'] as const) {
      assert.ok(!rule(c.access?.[op])(anonymous), `anyone may ${op} ${name(c)}`)
    }
    assert.equal(rule(c.access?.admin)(participant), false, `participant may enter the panel`)
  }
})

test('nothing public hands drafts to visitors', () => {
  for (const c of collections) {
    const versioned = typeof c.versions === 'object' && c.versions?.drafts
    if (!versioned) continue
    assert.notEqual(rule(c.access?.read)(anonymous), true, `anyone may read ${name(c)} drafts`)
  }
})

test('the school keeps full access everywhere', () => {
  for (const c of collections) {
    for (const op of ['create', 'read', 'update', 'delete'] as const) {
      if (op === 'create' && NO_PANEL_CREATE.has(c.slug)) continue
      assert.equal(rule(c.access?.[op])(admin), true, `admin denied ${op} on ${name(c)}`)
    }
  }
  for (const g of globals) {
    assert.equal(rule(g.access?.update)(admin), true, `admin denied update on ${name(g)}`)
  }
})

test('messages: everyone writes through the form, the school does not add any in the panel', () => {
  // Decided 10.10.2026: the panel's "Stwórz nowy" in Wiadomości was Payload's
  // default, not a feature — an entry made there emailed the school itself
  // and asked for a consent nobody gave.
  const messages = collections.find((c) => c.slug === 'messages')
  assert.ok(messages, 'the messages collection is registered')
  const create = rule(messages.access?.create)
  assert.ok(create(anonymous), 'a visitor sends the contact form')
  assert.ok(create(participant), 'a logged-in participant sends it too')
  assert.ok(!create(admin), 'the panel offers no "create" for messages')
})
