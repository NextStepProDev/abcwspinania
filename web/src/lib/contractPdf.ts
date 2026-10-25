import { readFile } from 'node:fs/promises'
import path from 'node:path'

import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

import { contractBlocks, type ContractData } from '@/lib/campContract'

/**
 * The camp contract as a PDF (A4) — the text from `campContract.ts`, laid out
 * with the site's own typeface (Inter, OFL, in `public/fonts/` — Polish
 * letters need an embedded font; PDF's standard fonts have none of them).
 *
 * Fonts are read from `process.cwd()`, not from the source tree: in the
 * standalone image the compiled code lives elsewhere (CLAUDE.md, rule 15).
 * The organiser's stamp and signature come from the panel ("Ustawienia
 * obozów") — never from the repository, which is public.
 */

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 56
const SIZE = 10
const LEADING = 14
const INK = rgb(0.12, 0.12, 0.12)

let fonts: Promise<[Uint8Array, Uint8Array]> | null = null

function fontFiles() {
  fonts ??= Promise.all([
    readFile(path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf')),
    readFile(path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf')),
  ]).catch((error) => {
    fonts = null
    throw error
  })
  return fonts
}

/** Lines of `text` that fit in `width` at `size`, broken at spaces. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= width || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function contractPdf(
  data: ContractData,
  signature: { bytes: Uint8Array; type: 'png' | 'jpg' } | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(`Umowa imprezy turystycznej — Jura Lato ${data.season}`)
  doc.setAuthor('ABC Wspinania')
  const [regularBytes, boldBytes] = await fontFiles()
  // Whole fonts, not subsets: fontkit's subsetting drops most of Inter's glyphs
  // (the text extracts fine, the page shows gaps — seen 22.10.2026).
  const regular = await doc.embedFont(regularBytes)
  const bold = await doc.embedFont(boldBytes)

  let page: PDFPage = doc.addPage(A4)
  let y = A4[1] - MARGIN
  const width = A4[0] - 2 * MARGIN

  const room = (needed: number) => {
    if (y - needed >= MARGIN) return
    page = doc.addPage(A4)
    y = A4[1] - MARGIN
  }
  const lines = (text: string, font: PDFFont, x: number, maxWidth: number, size = SIZE) => {
    for (const line of wrap(text, font, size, maxWidth)) {
      room(LEADING)
      page.drawText(line, { x, y: y - size, size, font, color: INK })
      y -= LEADING
    }
  }

  for (const block of contractBlocks(data)) {
    switch (block.kind) {
      case 'title': {
        const size = 14
        room(20)
        const w = bold.widthOfTextAtSize(block.text, size)
        page.drawText(block.text, { x: (A4[0] - w) / 2, y: y - size, size, font: bold, color: INK })
        y -= 20
        break
      }
      case 'section': {
        y -= 6
        // A heading never ends a page: it takes its lead-in and first point along.
        room(LEADING * 6)
        const w = bold.widthOfTextAtSize(block.text, 11)
        page.drawText(block.text, {
          x: (A4[0] - w) / 2,
          y: y - 11,
          size: 11,
          font: bold,
          color: INK,
        })
        y -= LEADING + 2
        break
      }
      case 'paragraph':
        y -= 2
        lines(block.text, block.bold ? bold : regular, MARGIN, width)
        break
      case 'item': {
        room(LEADING)
        page.drawText(block.number, {
          x: MARGIN,
          y: y - SIZE,
          size: SIZE,
          font: regular,
          color: INK,
        })
        lines(block.text, regular, MARGIN + 18, width - 18)
        break
      }
      case 'bullet': {
        room(LEADING)
        page.drawText('–', { x: MARGIN + 18, y: y - SIZE, size: SIZE, font: regular, color: INK })
        lines(block.text, regular, MARGIN + 30, width - 30)
        break
      }
      case 'signatures': {
        const boxHeight = 90
        y -= 24
        room(boxHeight + LEADING * 2)
        const left = MARGIN
        const right = A4[0] / 2 + 20
        page.drawText('Organizator', { x: left, y: y - SIZE, size: SIZE, font: bold, color: INK })
        page.drawText('Rodzic lub opiekun prawny', {
          x: right,
          y: y - SIZE,
          size: SIZE,
          font: bold,
          color: INK,
        })
        y -= LEADING + 4
        if (signature) {
          const image =
            signature.type === 'png'
              ? await doc.embedPng(signature.bytes)
              : await doc.embedJpg(signature.bytes)
          const scale = Math.min(200 / image.width, boxHeight / image.height)
          page.drawImage(image, {
            x: left,
            y: y - image.height * scale,
            width: image.width * scale,
            height: image.height * scale,
          })
        }
        const line = '. '.repeat(30).trim()
        page.drawText(line, {
          x: right,
          y: y - boxHeight + 10,
          size: SIZE,
          font: regular,
          color: INK,
        })
        y -= boxHeight
        break
      }
    }
  }
  return doc.save()
}
