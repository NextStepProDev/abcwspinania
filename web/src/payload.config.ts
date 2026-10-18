import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { pl } from '@payloadcms/translations/languages/pl'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { collections } from './collections'
import { Users } from './collections/Users'
import { globals } from './globals'
import { brevoAdapter } from './lib/email/brevo'
import { restorePublicMessage } from './lib/errorResponse'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * The secret signs admin session tokens. Payload accepts an empty string
 * WITHOUT COMPLAINT, so a typo in the variable name would yield a working
 * application issuing worthless tokens — and nobody would notice. We would
 * rather the process refused to start.
 *
 * There is no build-time exception here. An earlier version detected the phase
 * from an internal Next variable (`NEXT_PHASE`), which (a) relied on an
 * implementation detail of someone else's tool and (b) did not cover `payload
 * generate:types` anyway — CI broke on exactly that the first time it ran.
 *
 * Rather than guessing: the stages that do NOT issue sessions (building the
 * image, generating types in CI) get an explicit placeholder set at the call
 * site, with a comment saying why. The placeholder from the Dockerfile `build`
 * stage does NOT reach the final image — that is a separate `FROM` stage, and
 * environment variables do not cross stage boundaries.
 */
function requireSecret(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (secret) return secret
  throw new Error(
    'Brak PAYLOAD_SECRET. Wygeneruj: openssl rand -base64 32 — i ustaw w .env (lokalnie) ' +
      'albo w deploy/.env (produkcja).',
  )
}

/**
 * Outgoing email through Brevo — or nowhere, deliberately, when no key is set.
 *
 * Without `BREVO_API_KEY` Payload falls back to printing emails to the console
 * and says so at startup. That is what we want locally and in CI (no one gets
 * mailed from a laptop by accident), and on a server it is the loud signal that
 * the key is missing.
 *
 * The sender must be an address on a domain authenticated in Brevo (SPF and
 * DKIM) — anything else is refused by Brevo or lands in spam. Switching from
 * the test domain to the school's is a change of these variables, not of code.
 */
function emailAdapter() {
  const apiKey = process.env.BREVO_API_KEY
  const email = process.env.EMAIL_FROM
  if (!apiKey || !email) return undefined
  return brevoAdapter({
    apiKey,
    sender: { email, name: process.env.EMAIL_FROM_NAME || 'ABC Wspinania' },
  })
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // "Do zrobienia" above the collections: new bookings, waiting list,
    // occupancy of the next sessions — see the component. "Pulpit" in the
    // menu: Payload's only way back to it is a small logo.
    components: {
      beforeDashboard: ['/components/admin/SchoolDashboard#SchoolDashboard'],
      beforeNavLinks: ['/components/admin/DashboardNavLink#DashboardNavLink'],
    },
    meta: {
      titleSuffix: '— ABC Wspinania',
      description: 'Panel zarządzania treścią szkoły wspinaczkowej ABC Wspinania',
      // The school's sign in the browser tab instead of Payload's logo — the
      // same icon as the site, served by `app/favicon.ico/route.tsx`.
      icons: [{ rel: 'icon', type: 'image/png', url: '/favicon.ico' }],
    },
  },
  // The panel is in Polish — the client works in it, not a developer.
  // `fallbackLanguage` has to be set alongside `supportedLanguages`, otherwise
  // Payload falls back to English at the first missing key.
  i18n: {
    supportedLanguages: { pl },
    fallbackLanguage: 'pl',
  },
  collections,
  hooks: {
    // A refusal like "Ten termin ma zapisy…" reached the panel as "An unknown
    // error occurred." — the production minifier can leave Payload's error
    // class nameless. See the function.
    afterError: [({ error, result }) => restorePublicMessage(error, result)],
  },
  // Globals are content that occurs exactly once (contact details, page copy).
  // A collection holding a single entry would force someone to keep track of
  // which entry is "the real one" — a global makes that mistake impossible.
  globals,
  editor: lexicalEditor(),
  email: emailAdapter(),
  secret: requireSecret(),
  typescript: {
    // Types generated from the config and shared with the site. CI makes sure
    // the generated file does not drift from the collection definitions.
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // GraphQL DISABLED. Nothing in the code uses it (the site reads data through
  // the Local API, in the same process), and when enabled it publicly exposes
  // the full schema of every collection and field at /api/graphql-playground —
  // a free map of the system for anyone looking for a way in. Enable it only
  // once there is a consumer.
  graphQL: {
    disable: true,
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // `push` synchronises the schema automatically — convenient locally, but in
    // production changes go through explicit migrations so that starting a
    // container cannot rewrite a table holding client data.
    push: process.env.NODE_ENV !== 'production',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  // Image variant generation.
  sharp,
  upload: {
    limits: {
      // Must match `client_max_body_size` in deploy/nginx.conf. A mismatch
      // yields a 413 from nginx before the request reaches the application —
      // an error invisible in its logs.
      fileSize: 25 * 1024 * 1024,
    },
  },
  plugins: [],
})
