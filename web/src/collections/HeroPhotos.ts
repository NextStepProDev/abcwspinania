import path from 'path'

import type { CollectionConfig } from 'payload'

import { anyone, isAdmin } from '../lib/access'
import { WEB_IMAGE_HINT, WEB_IMAGE_TYPES } from './Media'

/**
 * Photos for the home page hero slideshow — two collections, one per shape.
 *
 * Separate from Media for the same reason as the gallery (rule 22): uploading
 * into the collection IS the whole job, with no "show in the hero" tick to set
 * on each file. Separate from EACH OTHER because the client asked for two
 * places to upload to — wide photos for a computer, upright ones for a phone —
 * and a single collection with a "shape" switch would mean setting it on every
 * file of a bulk upload, the step rule 22 removed from the gallery.
 *
 * `orderable` gives the list drag-and-drop ordering: the first photo is the
 * one loaded with the page (and the only one without JavaScript), so the
 * client picks it rather than the upload date. Payload marks the option
 * experimental — re-check the ordering in the panel on every Payload upgrade.
 *
 * The focal point stays on: the hero crops every photo (`object-cover`), and
 * the slow zoom is anchored on the point too (`HeroSlideshow`).
 */
function heroPhotos(options: {
  slug: 'hero-wide-photos' | 'hero-tall-photos'
  singular: string
  plural: string
  description: string
}): CollectionConfig {
  return {
    slug: options.slug,
    labels: { singular: options.singular, plural: options.plural },
    orderable: true,
    admin: {
      group: 'Treść',
      description: `${options.description} ${WEB_IMAGE_HINT}`,
      defaultColumns: ['filename', 'alt', 'createdAt'],
    },
    access: {
      // Public, like Media — the only way the site can show them.
      read: anyone,
      create: isAdmin,
      update: isAdmin,
      delete: isAdmin,
    },
    upload: {
      // A subdirectory of UPLOAD_DIR, not a variable of its own — the reason
      // is in `GalleryPhotos.ts`.
      staticDir: path.resolve(
        process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'),
        options.slug,
      ),
      // One variant, as in Media (sharp's cost on a small CPU). The site shows
      // the ORIGINAL through Next's optimiser (rule 24); `medium` is only the
      // panel's thumbnail, so the list does not load 4000 px originals.
      imageSizes: [{ name: 'medium', width: 750, position: 'centre' }],
      adminThumbnail: 'medium',
      mimeTypes: WEB_IMAGE_TYPES,
      // A saved crop replaces the file (rule 26); framing is the focal point.
      crop: false,
    },
    fields: [
      {
        name: 'alt',
        type: 'text',
        label: 'Opis alternatywny',
        admin: {
          description:
            'Co widać na zdjęciu — czyta to Google i czytniki ekranu. Zdjęcie ' +
            'w nagłówku jest zwykle tłem, więc pole można zostawić puste.',
        },
      },
    ],
  }
}

export const HeroWidePhotos = heroPhotos({
  slug: 'hero-wide-photos',
  singular: 'Zdjęcie w nagłówku (komputer)',
  plural: 'Nagłówek — komputer',
  description:
    'Zdjęcia zmieniające się w nagłówku strony głównej na komputerze i tablecie. ' +
    'Poziome, najlepiej co najmniej 2400 px szerokości. Lewa strona jest ' +
    'przyciemniana pod tekst, więc to, co najciekawsze, powinno być po prawej. ' +
    'Kolejność ustawiasz, przeciągając wiersze — pierwsze zdjęcie pokazuje się od ' +
    'razu po wejściu na stronę.',
})

export const HeroTallPhotos = heroPhotos({
  slug: 'hero-tall-photos',
  singular: 'Zdjęcie w nagłówku (telefon)',
  plural: 'Nagłówek — telefon',
  description:
    'Zdjęcia zmieniające się w nagłówku strony głównej na telefonie. Pionowe, ' +
    'najlepiej co najmniej 1200 px szerokości. Na zdjęciu leży tekst i logo na ' +
    'dole, więc ważne rzeczy nie powinny być przy samej dolnej krawędzi. Gdy ta ' +
    'lista jest pusta, telefon pokazuje zdjęcia z „Nagłówek — komputer”. ' +
    'Kolejność ustawiasz, przeciągając wiersze.',
})
