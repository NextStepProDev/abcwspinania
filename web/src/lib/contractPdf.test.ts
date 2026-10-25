import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import fontkit from '@pdf-lib/fontkit'
import { PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef, decodePDFRawStream } from 'pdf-lib'

import { contractBlocks, type ContractData } from '@/lib/campContract'
import { contractPdf } from '@/lib/contractPdf'

/**
 * The contract as a PDF — what `campContract.test.ts` cannot see: the text
 * there is right, but a contract is a legal document only if every letter of
 * it reaches the page. The names fill in the Polish letters, small and
 * capital, that the contract text itself lacks (checked below).
 */
const data: ContractData = {
  concludedOn: new Date('2027-03-01T10:00:00Z'),
  season: 2027,
  parent: {
    name: 'Łucja Żółć-Ćwiękała',
    address: 'ul. Źródlana 5/7, 42-421 Rzędkowice',
    phone: '+48600100200',
    email: 'lucja@example.com',
  },
  children: [
    { name: 'Józef Ślęzak', turnus: '26 czerwca – 3 lipca 2027 · Obóz wspinaczkowo-przygodowy' },
    {
      name: 'Ńina Ąę-Ęlska Óz',
      turnus: '26 czerwca – 3 lipca 2027 · Obóz wspinaczkowo-przygodowy',
    },
  ],
  price: 2500,
  ownSleepingBags: true,
}

/** A 1×1 PNG — the stamp and signature stand-in. */
const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==',
    'base64',
  ),
)

const fontPath = (name: string) => path.join(process.cwd(), 'public/fonts', name)

/** The decoded font programs embedded in the PDF, by font name. */
async function embeddedFonts(bytes: Uint8Array): Promise<Map<string, number>> {
  const doc = await PDFDocument.load(bytes)
  const sizes = new Map<string, number>()
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue
    if (obj.get(PDFName.of('Type'))?.toString() !== '/FontDescriptor') continue
    const file = obj.get(PDFName.of('FontFile2'))
    const stream = file instanceof PDFRef ? doc.context.lookup(file) : file
    assert.ok(stream instanceof PDFRawStream, 'the font program is embedded')
    sizes.set(String(obj.get(PDFName.of('FontName'))), decodePDFRawStream(stream).decode().length)
  }
  return sizes
}

/** How many images the PDF holds — the signature is the only one. */
async function imageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes)
  let count = 0
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype'))?.toString() === '/Image')
      count++
  }
  return count
}

test('both fonts go in whole — a subset showed gaps on the page (22.10.2026)', async () => {
  const sizes = [...(await embeddedFonts(await contractPdf(data, null))).values()].sort()
  const files = await Promise.all(
    ['Inter-Regular.ttf', 'Inter-Bold.ttf'].map(async (f) => (await readFile(fontPath(f))).length),
  )
  assert.deepEqual(sizes, files.sort())
})

test('every character of the contract has a letter in the font — no empty boxes', async () => {
  const fonts = await Promise.all(
    ['Inter-Regular.ttf', 'Inter-Bold.ttf'].map(async (f) =>
      fontkit.create(await readFile(fontPath(f))),
    ),
  )
  const text = contractBlocks(data)
    .map((b) => ('text' in b ? b.text : '') + ('number' in b ? b.number : ''))
    .join('')
  // The fixture keeps its promise: every Polish letter, small and capital.
  const absent = [...'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ'].filter((ch) => !text.includes(ch))
  assert.deepEqual(absent, [], 'the test data lacks these letters')
  // The dash and dotted line drawn by `contractPdf` itself, beside the text.
  const missing = [...new Set(`${text}–.`)].filter(
    // Only the plain space is skipped: a no-break space is a character the
    // font must have like any other (`trim()` would have let it through).
    (ch) => ch !== ' ' && fonts.some((font) => !font.hasGlyphForCodePoint(ch.codePointAt(0)!)),
  )
  assert.deepEqual(missing, [])
})

test('the stamp and signature go in when set; without them the contract still comes out', async () => {
  const signed = await contractPdf(data, { bytes: PNG, type: 'png' })
  const unsigned = await contractPdf(data, null)
  assert.equal(await imageCount(signed), 1)
  assert.equal(await imageCount(unsigned), 0)
  const doc = await PDFDocument.load(unsigned)
  assert.ok(doc.getPageCount() >= 2, `${doc.getPageCount()} pages`)
  assert.equal(doc.getTitle(), 'Umowa imprezy turystycznej — Jura Lato 2027')
})
