import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ALTER COLUMN "alt" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // The backfill is NOT what the generator wrote — it was added by hand, and
  // without it this rollback cannot run at all. Once `alt` is optional, images
  // get uploaded without one; restoring NOT NULL over those rows fails with
  // `column "alt" of relation "media" contains null values`, leaving the
  // database stuck between two schema versions. Measured 23.09.2026.
  //
  // An empty string is the honest restore: it is what an image with no
  // description already renders as (`alt={media.alt ?? ''}`), so nothing about
  // the site changes — only the constraint comes back.
  await db.execute(sql`
   UPDATE "media" SET "alt" = '' WHERE "alt" IS NULL;`)
  await db.execute(sql`
   ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;`)
}
