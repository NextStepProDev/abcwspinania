import path from 'path'

import type { CollectionConfig } from 'payload'

/**
 * Media library — the equivalent of Strapi's Media Library.
 *
 * `alt` is OPTIONAL. It used to be required, on the reasoning that trusting
 * people to remember does not work — but the requirement bought worse
 * accessibility, not better. Bulk upload puts one blocking form in front of
 * every file, so by the twentieth photo the field gets filled with "photo" or
 * "IMG_4471". A screen reader reads that junk aloud, whereas an empty alt makes
 * it skip a decorative image entirely, which is what the spec actually asks for.
 *
 * Every render site already writes `alt={media.alt ?? ''}`, so a missing
 * description yields `alt=""` — correct markup for a decorative image — rather
 * than a missing attribute.
 *
 * Gallery photos do NOT live here. They had a `showInGallery` tick for a
 * while; it meant opening every photo to set it, so they moved to a
 * collection of their own (`GalleryPhotos`). This one holds what the rest of
 * the site points at: course and camp covers, instructor portraits, images in
 * articles.
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
    // Without an explicit column list the gallery tick is invisible on the list
    // view, and the whole point of it is being set on many rows at once.
    defaultColumns: ['filename', 'alt', 'createdAt'],
  },
  // Newest first — the gallery page shows them in this order and the client
  // asked for exactly that, so the list in the panel matches what he sees.
  defaultSort: '-createdAt',
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
    // No crop tool: saving a crop REPLACES the stored file, so the cut-off
    // part is gone for every other place the photo appears in a different
    // shape. Framing is done with the focal point instead (left on — it still
    // opens from the same "edit image" button), which the site reads through
    // `focalPosition()` and which works for every shape at once.
    crop: false,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Opis alternatywny',
      admin: {
        description:
          'Co widać na zdjęciu — czyta to Google i czytniki ekranu. Wypełnij, ' +
          'gdy zdjęcie coś pokazuje: instruktora, skałę, sprzęt. Zostaw puste, ' +
          'gdy jest tylko ozdobą, np. tłem sekcji.',
      },
    },
  ],
}
