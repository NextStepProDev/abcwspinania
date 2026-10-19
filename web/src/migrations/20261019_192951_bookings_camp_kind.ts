import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_bookings_kind" AS ENUM('course', 'camp');
  ALTER TABLE "bookings" ADD COLUMN "kind" "enum_bookings_kind" DEFAULT 'course' NOT NULL;
  ALTER TABLE "bookings" ADD COLUMN "child_first_name" varchar;
  ALTER TABLE "bookings" ADD COLUMN "child_last_name" varchar;
  ALTER TABLE "bookings" ADD COLUMN "child_birth_date" timestamp(3) with time zone;
  ALTER TABLE "bookings" ADD COLUMN "photo_consent" boolean DEFAULT false;
  ALTER TABLE "bookings" ADD COLUMN "photo_consent_text" varchar;
  CREATE INDEX "bookings_kind_idx" ON "bookings" USING btree ("kind");`)
  // Every booking so far came from the course form, but the school could
  // have added one by hand on a camp's session — that one is a camp booking.
  // Written by hand; keep it when squashing schema migrations.
  await db.execute(sql`
   UPDATE "bookings" SET "kind" = 'camp'
   FROM "sessions" WHERE "sessions"."id" = "bookings"."session_id" AND "sessions"."camp_id" IS NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "bookings_kind_idx";
  ALTER TABLE "bookings" DROP COLUMN "kind";
  ALTER TABLE "bookings" DROP COLUMN "child_first_name";
  ALTER TABLE "bookings" DROP COLUMN "child_last_name";
  ALTER TABLE "bookings" DROP COLUMN "child_birth_date";
  ALTER TABLE "bookings" DROP COLUMN "photo_consent";
  ALTER TABLE "bookings" DROP COLUMN "photo_consent_text";
  DROP TYPE "public"."enum_bookings_kind";`)
}
