/**
 * Access rules — one place, so every collection says the same thing the same way.
 *
 * ⚠️ The reason this file exists: Payload's DEFAULT rule for any operation a
 * collection does not declare is "anyone logged in" (`Boolean(req.user)`,
 * `payload/dist/auth/defaultAccess.js`), and an undeclared `readVersions`
 * falls back to the same (`auth/executeAccess.js`). That was harmless while
 * the only accounts were the school's. With participant accounts (a second
 * `auth: true` collection) it would let any participant create, edit and
 * delete courses, posts and photos through the REST API, read every message
 * from the contact form, and read drafts. Hence two rules:
 *
 *   1. never `Boolean(req.user)` — "logged in" no longer means "the school";
 *   2. every collection declares create / read / update / delete (and
 *      `readVersions` when it has versions), every global read / update.
 *      `src/lib/access.test.ts` fails the build when one is missing.
 *
 * Pure functions with no Payload import, so the test runs under `node --test`.
 */

/**
 * The collection of panel accounts — `admin.user` in `payload.config.ts`.
 * Spelled out rather than imported from `Users.ts` to keep this file free of
 * collection imports; the access test checks the two agree.
 */
export const ADMIN_COLLECTION = 'users'

// The narrow shape these rules read. Payload passes far more; declaring only
// this keeps the functions callable from a test with a hand-made request.
interface AccessArgs {
  req: { user?: { collection?: string } | null }
}

/** A school account — not merely someone logged in. */
export function isAdmin({ req }: AccessArgs): boolean {
  return req.user?.collection === ADMIN_COLLECTION
}

/** Public content and public forms. */
export function anyone(): boolean {
  return true
}

/**
 * Collections with drafts: the school sees everything, everyone else only the
 * published version. With a plain `read: () => true` the REST API hands any
 * draft to anyone who asks (`?draft=true` included).
 *
 * This rule governs the REST API only. The site reads through the Local API,
 * which skips access rules — what the site shows is decided in
 * `lib/content.ts`, not here.
 */
export function publishedOrAdmin(args: AccessArgs) {
  return isAdmin(args) ? true : { _status: { equals: 'published' } }
}

/**
 * Testimonials carry a `published` checkbox instead of drafts: an opinion
 * stays unpublished until its author agrees to it being shown (ZAKRES.md,
 * "Do potwierdzenia" 3). A public `read: () => true` handed every unpublished
 * opinion to anyone asking `/api/testimonials`, consent or not.
 */
export function publishedFlagOrAdmin(args: AccessArgs) {
  return isAdmin(args) ? true : { published: { equals: true } }
}
