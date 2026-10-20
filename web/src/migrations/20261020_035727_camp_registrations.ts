import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "camp_registrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"booking_id" integer NOT NULL,
  	"pesel" varchar NOT NULL,
  	"height_cm" numeric,
  	"allergies" varchar,
  	"medications" varchar,
  	"diet" varchar,
  	"conditions" varchar,
  	"activities_consent_text" varchar,
  	"consent_text" varchar,
  	"consent_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "bookings" ADD COLUMN "registration_reminder_at" timestamp(3) with time zone;
  ALTER TABLE "bookings" ADD COLUMN "registered_at" timestamp(3) with time zone;
  ALTER TABLE "bookings" ADD COLUMN "invoice_requested" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "camp_registrations_id" integer;
  ALTER TABLE "camp_registrations" ADD CONSTRAINT "camp_registrations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "camp_registrations_booking_idx" ON "camp_registrations" USING btree ("booking_id");
  CREATE INDEX "camp_registrations_updated_at_idx" ON "camp_registrations" USING btree ("updated_at");
  CREATE INDEX "camp_registrations_created_at_idx" ON "camp_registrations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_camp_registrations_fk" FOREIGN KEY ("camp_registrations_id") REFERENCES "public"."camp_registrations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "bookings_registered_at_idx" ON "bookings" USING btree ("registered_at");
  CREATE INDEX "payload_locked_documents_rels_camp_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("camp_registrations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "camp_registrations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "camp_registrations" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_camp_registrations_fk";
  
  DROP INDEX IF EXISTS "bookings_registered_at_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_camp_registrations_id_idx";
  ALTER TABLE "bookings" DROP COLUMN "registration_reminder_at";
  ALTER TABLE "bookings" DROP COLUMN "registered_at";
  ALTER TABLE "bookings" DROP COLUMN "invoice_requested";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "camp_registrations_id";`)
}
