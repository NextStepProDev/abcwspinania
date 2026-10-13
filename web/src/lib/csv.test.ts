import test from 'node:test'
import assert from 'node:assert/strict'

import { csvCell, csvPhone, toCsv } from '@/lib/csv'

test('the file opens in Polish Excel: BOM, semicolons, CRLF', () => {
  const csv = toCsv([
    ['Imię', 'Nazwisko'],
    ['Żaneta', 'Łódź'],
  ])
  assert.ok(csv.startsWith('﻿'), 'BOM — otherwise Excel shows "Å»aneta"')
  assert.equal(csv, '﻿Imię;Nazwisko\r\nŻaneta;Łódź\r\n')
})

test('a semicolon, a quote or a line break is kept inside one cell', () => {
  assert.equal(csvCell('a;b'), '"a;b"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('line 1\nline 2'), '"line 1\nline 2"')
  assert.equal(csvCell('plain'), 'plain')
})

test('nothing typed into a form can become an Excel formula', () => {
  for (const evil of [
    '=HYPERLINK("http://x","klik")',
    '+1+1',
    '-2+3',
    '@SUM(A1)',
    '\t=1',
    '\r=1',
  ]) {
    const cell = csvCell(evil)
    assert.ok(/^"?'/.test(cell), `${JSON.stringify(evil)} → ${cell}`)
  }
  // Ordinary text that merely contains these characters is left alone.
  assert.equal(csvCell('Anna-Maria'), 'Anna-Maria')
  assert.equal(csvCell('a@b.pl'), 'a@b.pl')
})

test('a phone keeps its plus and is not turned into a number', () => {
  assert.equal(csvPhone('+48600100200'), '="+48 600 100 200"')
  assert.equal(csvPhone('+1600100200'), '="+1 600 100 200"')
  // Anything not in the stored format is passed as a guarded text cell.
  assert.equal(csvPhone('=1+1'), "'=1+1")
  assert.equal(csvPhone(''), '')
})
