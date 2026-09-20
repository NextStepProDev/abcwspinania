import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { pl } from '@payloadcms/translations/languages/pl'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Kursy } from './collections/Kursy'
import { Wiadomosci } from './collections/Wiadomosci'
import { Ustawienia } from './globals/Ustawienia'
import { StronaGlowna } from './globals/StronaGlowna'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Sekret podpisuje tokeny sesji panelu. Payload przyjmuje pusty ciąg BEZ
 * PROTESTU, więc literówka w nazwie zmiennej dałaby działającą aplikację
 * z bezwartościowymi tokenami — i nikt by się nie zorientował. Wolimy, żeby
 * proces nie wstał.
 *
 * Brak tu wyjątku dla budowania. Wcześniejsza wersja rozpoznawała fazę po
 * wewnętrznej zmiennej Next-a (`NEXT_PHASE`), co (a) opierało się na szczególe
 * implementacyjnym cudzego narzędzia i (b) i tak nie obejmowało `payload
 * generate:types` — CI wywalił się na tym przy pierwszym uruchomieniu.
 *
 * Zamiast zgadywać: etapy, które NIE wydają sesji (budowanie obrazu,
 * generowanie typów w CI), dostają jawny placeholder ustawiony na miejscu,
 * z komentarzem dlaczego. Placeholder z etapu `build` w Dockerfile NIE trafia
 * do obrazu końcowego — to osobny etap `FROM`, a zmienne środowiskowe nie
 * przechodzą między etapami.
 */
function requireSecret(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (secret) return secret
  throw new Error(
    'Brak PAYLOAD_SECRET. Wygeneruj: openssl rand -base64 32 — i ustaw w .env (lokalnie) ' +
      'albo w deploy/.env (produkcja).',
  )
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— ABC Wspinania',
      description: 'Panel zarządzania treścią szkoły wspinaczkowej ABC Wspinania',
    },
  },
  // Panel po polsku — pracuje w nim Krzysiek, nie programista. `fallbackLanguage`
  // musi być ustawiony razem z `supportedLanguages`, inaczej Payload wraca do
  // angielskiego przy pierwszym brakującym kluczu.
  i18n: {
    supportedLanguages: { pl },
    fallbackLanguage: 'pl',
  },
  collections: [Kursy, Media, Wiadomosci, Users],
  // Globale to treść występująca dokładnie raz (dane kontaktowe, teksty stron).
  // Kolekcja z jednym wpisem wymagałaby pilnowania, który wpis jest „tym
  // właściwym" — global nie daje takiej możliwości pomyłki.
  globals: [Ustawienia, StronaGlowna],
  editor: lexicalEditor(),
  secret: requireSecret(),
  typescript: {
    // Typy generowane z konfiguracji i współdzielone ze stroną. CI pilnuje,
    // żeby wygenerowany plik nie rozjechał się z definicją kolekcji.
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // GraphQL WYŁĄCZONY. Nic w kodzie go nie używa (strona sięga po dane przez
  // Local API, w tym samym procesie), a włączony wystawia publicznie pełny schemat
  // wszystkich kolekcji i pól pod /api/graphql-playground — darmową mapę systemu
  // dla kogoś, kto szuka wejścia. Włączać dopiero, gdy pojawi się konsument.
  graphQL: {
    disable: true,
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // `push` synchronizuje schemat automatycznie — wygodne lokalnie, ale na
    // produkcji zmiany idą przez jawne migracje, żeby start kontenera nie mógł
    // przepisać tabeli z danymi klienta.
    push: process.env.NODE_ENV !== 'production',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  // Generowanie wariantów zdjęć.
  sharp,
  upload: {
    limits: {
      // Spójne z `client_max_body_size` w deploy/nginx.conf. Rozjazd daje 413
      // z nginx, zanim żądanie dojdzie do aplikacji — i błąd, którego nie widać
      // w jej logach.
      fileSize: 25 * 1024 * 1024,
    },
  },
  plugins: [],
})
