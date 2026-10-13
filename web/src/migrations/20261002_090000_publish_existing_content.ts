import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Marks every existing course, camp and post as PUBLISHED.
 *
 * Written by hand — a data change, not a schema one, so `migrate:create` has
 * nothing to generate it from.
 *
 * Why: the seed created everything with Payload's default status, `draft`,
 * and the site never checked the status, so drafts were shown as if
 * published. Since 02.10.2026 `lib/content.ts` shows published entries only.
 * Without this migration that filter would empty the site on the first
 * deploy. Everything visible today was visible as a draft, so publishing all
 * of it keeps the site exactly as it is.
 *
 * The latest version row is set too, so the panel does not report "unpublished
 * changes" on every entry.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "courses" SET "_status" = 'published' WHERE "_status" = 'draft';
    UPDATE "camps" SET "_status" = 'published' WHERE "_status" = 'draft';
    UPDATE "posts" SET "_status" = 'published' WHERE "_status" = 'draft';
    UPDATE "_courses_v" SET "version__status" = 'published' WHERE "latest" AND "version__status" = 'draft';
    UPDATE "_camps_v" SET "version__status" = 'published' WHERE "latest" AND "version__status" = 'draft';
    UPDATE "_posts_v" SET "version__status" = 'published' WHERE "latest" AND "version__status" = 'draft';
  `)
}

/**
 * Deliberately does nothing. Which entries were drafts before is not recorded
 * anywhere, and setting everything back to `draft` would take the whole site
 * offline — the opposite of undoing a fix.
 */
export async function down(_args: MigrateDownArgs): Promise<void> {}
