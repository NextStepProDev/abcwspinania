import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_wiadomosci_temat" AS ENUM('kurs-skalkowy', 'drogi-ubezpieczone', 'trad', 'scianka', 'oboz', 'indywidualne', 'inna');
  CREATE TYPE "public"."enum_newsletter_status" AS ENUM('zapisany', 'wypisany');
  CREATE TABLE "newsletter" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"status" "enum_newsletter_status" DEFAULT 'zapisany' NOT NULL,
  	"zgoda_tresc" varchar NOT NULL,
  	"zgoda_data" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "strona_en" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"badge" varchar,
  	"tytul" varchar,
  	"lead" varchar,
  	"o_nas" varchar,
  	"baza" varchar,
  	"sezon" varchar,
  	"dojazd" varchar,
  	"kurs_opis" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "wiadomosci" ADD COLUMN "temat" "enum_wiadomosci_temat";
  ALTER TABLE "wiadomosci" ADD COLUMN "preferowany_termin" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "newsletter_id" integer;
  ALTER TABLE "ustawienia" ADD COLUMN "dojazd" varchar;
  CREATE UNIQUE INDEX "newsletter_email_idx" ON "newsletter" USING btree ("email");
  CREATE INDEX "newsletter_updated_at_idx" ON "newsletter" USING btree ("updated_at");
  CREATE INDEX "newsletter_created_at_idx" ON "newsletter" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletter"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_newsletter_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletter_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "strona_en" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "newsletter" CASCADE;
  DROP TABLE "strona_en" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_newsletter_fk";
  
  DROP INDEX "payload_locked_documents_rels_newsletter_id_idx";
  ALTER TABLE "wiadomosci" DROP COLUMN "temat";
  ALTER TABLE "wiadomosci" DROP COLUMN "preferowany_termin";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "newsletter_id";
  ALTER TABLE "ustawienia" DROP COLUMN "dojazd";
  DROP TYPE "public"."enum_wiadomosci_temat";
  DROP TYPE "public"."enum_newsletter_status";`)
}
