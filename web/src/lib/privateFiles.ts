import path from 'node:path'

/**
 * Where `private-files` keeps its uploads — a folder of the uploads volume
 * (`/app/uploads` in the container, `web/uploads` locally), resolved from the
 * working directory like every upload (CLAUDE.md, rule 15). One function for
 * the collection that writes there and the code that reads the signature.
 */
export function privateFilesDir(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'), 'private')
}
