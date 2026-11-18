/**
 * The blocking `npm audit` gate (CI, and `npm run audit` locally):
 * production dependencies, high and critical — minus the advisories listed
 * below.
 *
 * `npm audit` has no way to accept a single advisory: it is the whole gate
 * or nothing. Every entry here must say why it cannot be reached in the
 * running app and WHEN to remove it. An entry that no longer matches any
 * finding fails the gate too, so a fixed advisory cannot stay excused.
 */
import { execFileSync } from 'node:child_process'

const ACCEPTED = {
  // happy-dom: code execution through an import alias in a page's script.
  // Chain: @payloadcms/richtext-lexical → @lexical/headless 0.50 → happy-dom
  // 20 (fixed only in 21.0.4, a major `^20` does not take). happy-dom is
  // loaded by `@lexical/headless/dom` (`withDOM`) alone, which Payload never
  // imports — its converters take the DOM from the caller, and we call none
  // of them — so it is not in `.next/standalone` (checked 25.10.2026) and
  // nothing here parses anyone's HTML. Remove when `npm ls happy-dom` shows
  // ≥ 21.0.4 (a Payload with a newer @lexical/headless).
  'GHSA-834v-8h66-3h79': 'happy-dom — never imported by the app, not in the image',
  // happy-dom: server-side requests to any URL when parsing HTML with an
  // <iframe> or <link rel="stylesheet"> (published 28.10.2026). The same
  // chain and the same reason as the entry above: nothing here hands HTML to
  // happy-dom, because nothing loads it. Fixed in 21.0.0; remove together
  // with the entry above, when `npm ls happy-dom` shows ≥ 21.0.4.
  'GHSA-c8p4-j97h-3vg8': 'happy-dom — never imported by the app, not in the image',
}

const BLOCKING = new Set(['high', 'critical'])

let report
try {
  report = execFileSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
} catch (error) {
  // npm audit exits 1 whenever it finds anything; the JSON is still on stdout.
  report = error.stdout
}
const parsed = JSON.parse(report)
// Registry unreachable: npm prints `{ "error": … }` and no findings. Without
// this check every accepted entry would show as STALE — a red gate that
// tells you to delete the exception instead of to retry.
if (parsed.error || !parsed.vulnerabilities) {
  console.error('npm audit did not run:', parsed.message || parsed.error?.summary || report)
  process.exit(1)
}
const { vulnerabilities } = parsed

const advisories = new Map()
for (const entry of Object.values(vulnerabilities)) {
  for (const via of entry.via) {
    if (typeof via !== 'object') continue // "vulnerable through another package"
    // An advisory without a URL keeps its own key, so it cannot collapse
    // into another one and lose its severity.
    const id = via.url?.split('/').pop() ?? `${via.name}#${via.source}`
    advisories.set(id, { name: via.name, severity: via.severity, title: via.title, url: via.url })
  }
}

const blocking = [...advisories].filter(([id, a]) => BLOCKING.has(a.severity) && !ACCEPTED[id])
const stale = Object.keys(ACCEPTED).filter((id) => !advisories.has(id))

for (const [id, reason] of Object.entries(ACCEPTED)) {
  if (advisories.has(id)) console.log(`accepted  ${id}  ${reason}`)
}
for (const [, a] of blocking)
  console.error(`BLOCKING  ${a.severity}  ${a.name}: ${a.title}\n          ${a.url}`)
for (const id of stale) {
  console.error(
    `STALE     ${id} is no longer reported — remove it from ACCEPTED in scripts/audit-gate.mjs`,
  )
}

if (blocking.length || stale.length) process.exit(1)
console.log(`npm audit gate passed (${advisories.size} advisories, none blocking)`)
