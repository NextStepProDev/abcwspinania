import path from 'path'

import type { CollectionConfig } from 'payload'

/**
 * Media library — the equivalent of Strapi's Media Library.
 *
 * `alt` is REQUIRED, enforced at the model level, so no image can be uploaded
 * without a description. Trusting people to remember does not work.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  // The plural deliberately stays "Media" — that is what the menu says and it
  // is the shortest wording. The SINGULAR is the point: without it Payload
  // derives one from the slug and anything referring to a single file reads
  // "Media".
  labels: {
    singular: 'Zdjęcie',
    plural: 'Media',
  },
  admin: {
    group: 'Treść',
  },
  access: {
    // Images are public — the only way the site can display them. In Strapi
    // this same setting lived in the DATABASE and had to be clicked through
    // separately in every environment. Here it ships with the code.
    read: () => true,
  },
  upload: {
    // Upload directory resolved from the process working directory, NOT from
    // the location of payload.config.ts. Reason: the production image uses
    // `output: standalone`, where compiled code sits elsewhere than the
    // sources — a path derived from the sources would point at nothing. This
    // way it is predictable: `web/uploads` locally, `/app/uploads` in the
    // container, which is where the volume is mounted.
    staticDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'),
    // A single responsive variant. The default three could grind through sharp
    // for over a minute per image on constrained CPU and uploads timed out —
    // a lesson carried over from anovastudio.
    imageSizes: [
      {
        name: 'medium',
        width: 750,
        position: 'centre',
      },
    ],
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Opis alternatywny',
      admin: {
        description: 'Co widać na zdjęciu. Czyta to Google i czytniki ekranu.',
      },
    },
  ],
}
