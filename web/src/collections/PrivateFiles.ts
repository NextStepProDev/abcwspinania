import type { CollectionConfig } from 'payload'

import { isAdmin } from '../lib/access'
import { privateFilesDir } from '../lib/privateFiles'

/**
 * Files for the school's eyes only — the organiser's stamp and signature
 * that the system puts into every camp contract, and the blank qualification
 * card attached to the email before a camp ("Ustawienia obozów"). Not in
 * `Media`: Media is public (the site shows it), and a signature anyone could
 * download would be one anyone could paste.
 *
 * Read only by a school account — Payload checks this rule when it serves
 * `/api/private-files/file/…`, so the file is not reachable from outside.
 * Deliberately WITHOUT the two entries an upload collection usually needs
 * (CLAUDE.md, rule 23): no `next/image` pattern and no nginx cache block —
 * nothing here is shown on the site, and caching it would be the opposite of
 * the point (the response says so itself: `private, no-store`). Stored in
 * its own folder of the uploads volume, so the nightly backup takes it with
 * the rest.
 */
export const PrivateFiles: CollectionConfig = {
  slug: 'private-files',
  labels: { singular: 'Plik prywatny', plural: 'Pliki prywatne' },
  admin: {
    group: 'Ustawienia',
    description:
      'Pliki widoczne tylko w panelu: pieczątka z podpisem do umów obozowych, pusta karta kwalifikacyjna do maila przed obozem. Strona ich nie pokazuje.',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    staticDir: privateFilesDir(),
    // The stamp for contracts; the blank qualification card (PDF) for the email before a camp.
    mimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    crop: false,
    focalPoint: false,
    // Payload sends a file with no Cache-Control, and Cloudflare keeps a .png
    // without one at its edge — the school's own download would then be
    // served to anyone asking for the same address. Never cached, anywhere.
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, no-store')
      return headers
    },
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
