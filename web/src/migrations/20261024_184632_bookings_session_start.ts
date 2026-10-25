import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The bookings list sorts by its session's start (`Bookings.ts`,
// `sessionStart`). The UPDATE is hand-written: it fills the copy for the
// bookings that exist — new ones get it from the booking's own hook.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ADD COLUMN "session_start" timestamp(3) with time zone;
  CREATE INDEX "bookings_session_start_idx" ON "bookings" USING btree ("session_start");
  UPDATE "bookings" SET "session_start" = "sessions"."start_date"
    FROM "sessions" WHERE "sessions"."id" = "bookings"."session_id";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "bookings_session_start_idx";
  ALTER TABLE "bookings" DROP COLUMN IF EXISTS "session_start";`)
}
