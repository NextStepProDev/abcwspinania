import test from 'node:test'
import assert from 'node:assert/strict'

import { plnInWords } from '@/lib/plnInWords'

test('camp prices read the way a contract writes them', () => {
  assert.equal(plnInWords(2500), 'dwa tysiące pięćset złotych')
  assert.equal(plnInWords(2800), 'dwa tysiące osiemset złotych')
  assert.equal(plnInWords(500), 'pięćset złotych')
  assert.equal(plnInWords(1000), 'tysiąc złotych')
})

test('the noun follows the Polish number forms', () => {
  assert.equal(plnInWords(1), 'jeden złoty')
  assert.equal(plnInWords(2), 'dwa złote')
  assert.equal(plnInWords(5), 'pięć złotych')
  assert.equal(plnInWords(12), 'dwanaście złotych')
  assert.equal(plnInWords(22), 'dwadzieścia dwa złote')
  assert.equal(plnInWords(112), 'sto dwanaście złotych')
  assert.equal(plnInWords(5000), 'pięć tysięcy złotych')
  assert.equal(plnInWords(22_000), 'dwadzieścia dwa tysiące złotych')
  assert.equal(plnInWords(1999), 'tysiąc dziewięćset dziewięćdziesiąt dziewięć złotych')
})

test('only whole złoty in a camp’s range', () => {
  assert.throws(() => plnInWords(2500.5), RangeError)
  assert.throws(() => plnInWords(-1), RangeError)
})
