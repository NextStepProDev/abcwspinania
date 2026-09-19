import path from 'path'

import type { CollectionConfig } from 'payload'

/**
 * Biblioteka mediów — odpowiednik Media Library ze Strapiego.
 *
 * `alt` jest WYMAGANY. Audyt starego serwisu wykazał zdjęcia bez opisu
 * alternatywnego; wymuszenie go tutaj oznacza, że nie da się wgrać zdjęcia
 * bez opisu, zamiast liczyć na to, że ktoś pamięta.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Treść',
  },
  access: {
    // Zdjęcia są publiczne — to jedyny sposób, żeby strona mogła je pokazać.
    // W Strapim to samo ustawienie siedziało w BAZIE i trzeba je było wyklikać
    // osobno w każdym środowisku. Tutaj jedzie z kodem.
    read: () => true,
  },
  upload: {
    // Katalog plików liczony od katalogu roboczego procesu, a NIE od położenia
    // payload.config.ts. Powód: obraz produkcyjny to `output: standalone`, gdzie
    // skompilowany kod leży gdzie indziej niż źródła — ścieżka wyliczona ze
    // źródeł wskazywałaby w pustkę. Tak jest przewidywalnie: `web/uploads`
    // lokalnie, `/app/uploads` w kontenerze, i tam montujemy wolumen.
    staticDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'),
    // Jeden wariant responsywny. Domyślne trzy potrafiły mielić sharpem ponad
    // minutę na zdjęcie przy ograniczonym CPU i wysyłki padały timeoutem —
    // wniosek przeniesiony z anovastudio.
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
