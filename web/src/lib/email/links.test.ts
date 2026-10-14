import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const SRC = new URL('../../', import.meta.url).pathname

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

// Found 14.10.2026: the contact-form email's "Otwórz w panelu" pointed at
// SITE_URL — the TARGET domain, where the client's old site still runs —
// and Krzysiek's click ended on its 404. Panel links follow `publicUrl()`.
test('no panel link is built from SITE_URL — it is the target domain, not where the panel runs', () => {
  const offenders = sourceFiles(SRC).filter((file) =>
    /\$\{SITE_URL\}\/admin/.test(readFileSync(file, 'utf8')),
  )
  assert.deepEqual(offenders, [])
})
