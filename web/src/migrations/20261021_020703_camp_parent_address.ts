import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ADD COLUMN "address_street" varchar;
  ALTER TABLE "bookings" ADD COLUMN "address_postcode" varchar;
  ALTER TABLE "bookings" ADD COLUMN "address_city" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" DROP COLUMN "address_street";
  ALTER TABLE "bookings" DROP COLUMN "address_postcode";
  ALTER TABLE "bookings" DROP COLUMN "address_city";`)
}
