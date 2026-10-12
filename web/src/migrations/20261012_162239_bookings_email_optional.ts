import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ALTER COLUMN "email" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Phone bookings saved without an address would stop NOT NULL — they get
  // the empty string, the same "no address" an anonymized booking has.
  await db.execute(sql`
   UPDATE "bookings" SET "email" = '' WHERE "email" IS NULL;
   ALTER TABLE "bookings" ALTER COLUMN "email" SET NOT NULL;`)
}
