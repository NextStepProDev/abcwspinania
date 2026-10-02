import test from 'node:test'
import assert from 'node:assert/strict'

import type { CollectionConfig, GlobalConfig } from 'payload'

import { collections } from '@/collections/index'
import { globals } from '@/globals/index'
import { Users } from '@/collections/Users'
import { ADMIN_COLLECTION, isAdmin, publishedFlagOrAdmin, publishedOrAdmin } from '@/lib/access'

// Hand-made requests. A participant account is any `auth` collection other
// than the panel's — `customers` is the one planned for the booking stage.
const anonymous = { req: { user: null } }
const participant = { req: { user: { collection: 'customers' } } }
const admin = { req: { user: { collection: ADMIN_COLLECTION } } }

type Rule = (args: unknown) => unknown
const rule = (r: unknown) => r as Rule

/** Collections a visitor may legitimately create entries in: public forms. */
const PUBLIC_FORMS = new Set(['messages', 'newsletter'])

/** Collections whose entries are personal data — nobody but the school reads them. */
const PRIVATE = new Set(['messages', 'newsletter', 'users'])

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
      assert.equal(rule(c.access?.[op])(admin), true, `admin denied ${op} on ${name(c)}`)
    }
  }
  for (const g of globals) {
    assert.equal(rule(g.access?.update)(admin), true, `admin denied update on ${name(g)}`)
  }
})
