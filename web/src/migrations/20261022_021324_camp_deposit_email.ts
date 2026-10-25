import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ADD COLUMN "deposit_email_at" timestamp(3) with time zone;`)
  // Written by hand: camp bookings with a deposit marked before this column
  // got their email then (one per child) — the daily sweep must not send it
  // again (\`sendWaitingDepositEmails\`). Keep when squashing migrations.
  await db.execute(sql`
   UPDATE "bookings" SET "deposit_email_at" = "updated_at"
   WHERE "kind" = 'camp' AND "status" IN ('deposit', 'paid');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" DROP COLUMN "deposit_email_at";`)
}
