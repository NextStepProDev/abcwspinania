import assert from 'node:assert/strict'
import test from 'node:test'

import { heroLists } from '@/lib/format'

const photo = (url: string, focal?: [number, number]) => ({
  url,
  alt: null,
  focalX: focal?.[0] ?? null,
  focalY: focal?.[1] ?? null,
})
const urls = (slides: { url: string }[]) => slides.map((s) => s.url)

test('hero: each shape shows its own list when it has one', () => {
  const hero = heroLists([photo('w1'), photo('w2')], [photo('t1')], photo('single'))
  assert.deepEqual(urls(hero.wide), ['w1', 'w2'])
  assert.deepEqual(urls(hero.tall), ['t1'])
})

test('hero: nothing uploaded yet looks as before — the single photo on both', () => {
  const hero = heroLists([], [], photo('single'))
  assert.deepEqual(urls(hero.wide), ['single'])
  assert.deepEqual(urls(hero.tall), ['single'])
})

test('hero: an empty phone list uses the computer one, not the single photo', () => {
  const hero = heroLists([photo('w1'), photo('w2')], [], photo('single'))
  assert.deepEqual(urls(hero.tall), ['w1', 'w2'])
})

test('hero: only phone photos — the computer takes the single photo first, then them', () => {
  assert.deepEqual(urls(heroLists([], [photo('t1')], photo('single')).wide), ['single'])
  assert.deepEqual(urls(heroLists([], [photo('t1')], null).wide), ['t1'])
})

test('hero: nothing anywhere → both empty, the page draws the illustration', () => {
  assert.deepEqual(heroLists([], [], null), { wide: [], tall: [] })
})

test('hero: an entry without a file is skipped, the alt is never missing', () => {
  const hero = heroLists([photo('w1', [80, 20]), { url: null }], [], null)
  assert.deepEqual(hero.wide, [{ url: 'w1', alt: '', position: '80% 20%' }])
})
