import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_wiadomosci_status" AS ENUM('nowa', 'w-toku', 'zalatwiona');
  CREATE TABLE "wiadomosci" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"imie" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"telefon" varchar,
  	"tresc" varchar NOT NULL,
  	"kurs_id" integer,
  	"status" "enum_wiadomosci_status" DEFAULT 'nowa',
  	"zgoda_tresc" varchar NOT NULL,
  	"zgoda_data" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "wiadomosci_id" integer;
  ALTER TABLE "wiadomosci" ADD CONSTRAINT "wiadomosci_kurs_id_kursy_id_fk" FOREIGN KEY ("kurs_id") REFERENCES "public"."kursy"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "wiadomosci_kurs_idx" ON "wiadomosci" USING btree ("kurs_id");
  CREATE INDEX "wiadomosci_updated_at_idx" ON "wiadomosci" USING btree ("updated_at");
  CREATE INDEX "wiadomosci_created_at_idx" ON "wiadomosci" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wiadomosci_fk" FOREIGN KEY ("wiadomosci_id") REFERENCES "public"."wiadomosci"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_wiadomosci_id_idx" ON "payload_locked_documents_rels" USING btree ("wiadomosci_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "wiadomosci" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "wiadomosci" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_wiadomosci_fk";
  
  DROP INDEX "payload_locked_documents_rels_wiadomosci_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "wiadomosci_id";
  DROP TYPE "public"."enum_wiadomosci_status";`)
}
