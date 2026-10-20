import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ADD COLUMN "registration_token" varchar;
  ALTER TABLE "bookings" ADD COLUMN "registration_sent_at" timestamp(3) with time zone;
  CREATE INDEX "bookings_registration_token_idx" ON "bookings" USING btree ("registration_token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "bookings_registration_token_idx";
  ALTER TABLE "bookings" DROP COLUMN "registration_token";
  ALTER TABLE "bookings" DROP COLUMN "registration_sent_at";`)
}
