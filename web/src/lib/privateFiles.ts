import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Where `private-files` keeps its uploads — a folder of the uploads volume
 * (`/app/uploads` in the container, `web/uploads` locally), resolved from the
 * working directory like every upload (CLAUDE.md, rule 15). One function for
 * the collection that writes there and the code that reads its files (the
 * contract's signature, the blank qualification card).
 */
export function privateFilesDir(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'), 'private')
}

/**
 * A file of `private-files` as bytes — by its stored name only (never a path
 * from elsewhere), null when the record has no file or the disk does not.
 */
export async function readPrivateFile(
  file: { filename?: string | null } | number | null | undefined,
): Promise<Uint8Array | null> {
  if (!file || typeof file !== 'object' || !file.filename) return null
  return readFile(path.join(privateFilesDir(), path.basename(file.filename))).catch(() => null)
}
