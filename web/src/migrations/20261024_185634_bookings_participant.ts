import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The bookings list's "Uczestnik" column (`Bookings.ts`, `participant`): the
// child on a camp, the person on a course — as the label hook builds it. The
// UPDATE is hand-written and fills it for the bookings that exist; an
// anonymized booking has no names, so it stays empty.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ADD COLUMN "participant" varchar;
  CREATE INDEX "bookings_participant_idx" ON "bookings" USING btree ("participant");
  UPDATE "bookings" SET "participant" = NULLIF(TRIM(CASE
      WHEN "kind" = 'camp' THEN CONCAT_WS(' ', NULLIF("child_first_name", ''), NULLIF("child_last_name", ''))
      ELSE CONCAT_WS(' ', NULLIF("first_name", ''), NULLIF("last_name", ''))
    END), '')
    WHERE "anonymized_at" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "bookings_participant_idx";
  ALTER TABLE "bookings" DROP COLUMN IF EXISTS "participant";`)
}
