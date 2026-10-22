import type { CollectionConfig } from 'payload'

import { isAdmin } from '../lib/access'
import { privateFilesDir } from '../lib/privateFiles'

/**
 * Files for the school's eyes only — today the organiser's stamp and
 * signature that the system puts into every camp contract ("Ustawienia
 * obozów"). Not in `Media`: Media is public (the site shows it), and a
 * signature anyone could download would be one anyone could paste.
 *
 * Read only by a school account — Payload checks this rule when it serves
 * `/api/private-files/file/…`, so the file is not reachable from outside.
 * Deliberately WITHOUT the two entries an upload collection usually needs
 * (CLAUDE.md, rule 23): no `next/image` pattern and no nginx cache block —
 * nothing here is shown on the site, and caching it would be the opposite of
 * the point. Stored in its own folder of the uploads volume, so the nightly
 * backup takes it with the rest.
 */
export const PrivateFiles: CollectionConfig = {
  slug: 'private-files',
  labels: { singular: 'Plik prywatny', plural: 'Pliki prywatne' },
  admin: {
    group: 'Ustawienia',
    description:
      'Pliki widoczne tylko w panelu, np. pieczątka z podpisem do umów obozowych. Strona ich nie pokazuje.',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    staticDir: privateFilesDir(),
    mimeTypes: ['image/png', 'image/jpeg'],
    crop: false,
    focalPoint: false,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Opis',
      admin: { description: 'Np. „Pieczątka z podpisem — umowy obozowe”.' },
    },
  ],
}
