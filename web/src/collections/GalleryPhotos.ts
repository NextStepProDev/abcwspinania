import path from 'path'

import type { CollectionConfig } from 'payload'

/**
 * Photos for the /galeria page — a collection of its own, not a flag on Media.
 *
 * This started life as a `showInGallery` tick in the media library and was
 * moved here after the client used it: every photo had to be opened and ticked
 * separately, so filling a gallery meant fifty round trips through a form.
 * Uploading straight into this collection is the whole of the work.
 *
 * It is the same call the project already made for camps against courses: one
 * shared collection with a switch gives a form where half the fields are
 * always irrelevant, and a list where you cannot see at a glance what belongs
 * to what.
 *
 * The cost we accept: a photo wanted BOTH as a course cover and in the gallery
 * has to be uploaded twice. For a showcase gallery that is rare, and cheaper
 * than the alternative — picking from a shared library is one more step on
 * every single upload, paid by the person doing it fifty times.
 *
 * `alt` is optional here for the same reason as in Media: a forced description
 * on a bulk upload becomes "IMG_4471", which a screen reader then reads aloud,
 * while an empty one makes it skip a decorative image as the spec intends.
 */
export const GalleryPhotos: CollectionConfig = {
  slug: 'gallery-photos',
  labels: {
    singular: 'Zdjęcie w galerii',
    plural: 'Galeria',
  },
  admin: {
    group: 'Treść',
    description: 'Zdjęcia pokazywane na podstronie „Galeria”. Najnowsze są u góry.',
    defaultColumns: ['filename', 'alt', 'createdAt'],
  },
  // Newest first, matching the order the gallery page renders them in, so the
  // list in the panel is not a different sequence from the public one.
  defaultSort: '-createdAt',
  access: {
    // Public, like the media library — the only way the site can show them.
    read: () => true,
  },
  upload: {
    // A subdirectory of whatever UPLOAD_DIR points at — NOT a second variable
    // of its own. Production sets UPLOAD_DIR=/app/uploads (Dockerfile) and
    // mounts the volume there; a separate variable with its own default would
    // keep working today by coincidence (the container's cwd is /app) and
    // break silently the day anyone moved UPLOAD_DIR elsewhere: Media would
    // follow it, gallery photos would keep landing outside the volume, and the
    // files would disappear on the next container restart with nothing in the
    // logs. One variable, so the two cannot drift apart.
    staticDir: path.resolve(
      process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'),
      'gallery-photos',
    ),
    // One variant, as in Media. The reason is unchanged: the default three
    // could grind through sharp for over a minute per image on constrained
    // CPU, and this is the collection that will see fifty files at once.
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
      label: 'Opis alternatywny',
      admin: {
        description:
          'Co widać na zdjęciu — czyta to Google i czytniki ekranu. Wypełnij, ' +
          'gdy zdjęcie coś pokazuje: instruktora, skałę, sprzęt. Zostaw puste, ' +
          'gdy jest tylko ozdobą.',
      },
    },
  ],
}
