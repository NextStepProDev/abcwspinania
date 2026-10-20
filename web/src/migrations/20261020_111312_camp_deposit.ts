import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ADD COLUMN "deposit_due_at" timestamp(3) with time zone;
  ALTER TABLE "bookings" ADD COLUMN "deposit_reminder_at" timestamp(3) with time zone;
  CREATE INDEX "bookings_deposit_due_at_idx" ON "bookings" USING btree ("deposit_due_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "bookings_deposit_due_at_idx";
  ALTER TABLE "bookings" DROP COLUMN "deposit_due_at";
  ALTER TABLE "bookings" DROP COLUMN "deposit_reminder_at";`)
}
