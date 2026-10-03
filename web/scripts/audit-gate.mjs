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
  // braces: stack exhaustion on deeply nested glob patterns. Chain:
  // @payloadcms/next → sass 1.77.4 (pinned exactly) → chokidar 3 → braces.
  // Build-time only: none of the three is in `.next/standalone` (checked
  // 03.10.2026), and the app never expands a glob from a visitor. No braces
  // release fixes it. Remove when `npm view @payloadcms/next dependencies.sass`
  // is ≥ 1.79 (chokidar 4+, no braces) or braces ships a fix.
  'GHSA-vfj7-8cjw-p6xm': 'braces — build tooling only, not in the image',
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
