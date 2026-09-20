import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_obozy_typ" AS ENUM('oboz', 'wyjazd', 'zajecia');
  CREATE TYPE "public"."enum_obozy_poziom" AS ENUM('rekreacyjny', 'zaawansowany');
  CREATE TYPE "public"."enum_obozy_ikona" AS ENUM('gory', 'ludzie', 'dom', 'tarcza');
  CREATE TYPE "public"."enum_obozy_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__obozy_v_version_typ" AS ENUM('oboz', 'wyjazd', 'zajecia');
  CREATE TYPE "public"."enum__obozy_v_version_poziom" AS ENUM('rekreacyjny', 'zaawansowany');
  CREATE TYPE "public"."enum__obozy_v_version_ikona" AS ENUM('gory', 'ludzie', 'dom', 'tarcza');
  CREATE TYPE "public"."enum__obozy_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_terminy_status" AS ENUM('otwarty', 'brak-miejsc', 'odwolany', 'zakonczony');
  CREATE TABLE "kursy_program" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"etykieta" varchar,
  	"tytul" varchar,
  	"opis" varchar
  );
  
  CREATE TABLE "kursy_w_cenie" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pozycja" varchar
  );
  
  CREATE TABLE "kursy_poza_cena" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pozycja" varchar
  );
  
  CREATE TABLE "kursy_warianty" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nazwa" varchar,
  	"cena" numeric,
  	"opis" varchar
  );
  
  CREATE TABLE "kursy_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pytanie" varchar,
  	"odpowiedz" varchar
  );
  
  CREATE TABLE "_kursy_v_version_program" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"etykieta" varchar,
  	"tytul" varchar,
  	"opis" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_kursy_v_version_w_cenie" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pozycja" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_kursy_v_version_poza_cena" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pozycja" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_kursy_v_version_warianty" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nazwa" varchar,
  	"cena" numeric,
  	"opis" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_kursy_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pytanie" varchar,
  	"odpowiedz" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "obozy_atrakcje" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pozycja" varchar
  );
  
  CREATE TABLE "obozy_plan_dnia" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"godzina" varchar,
  	"tytul" varchar,
  	"opis" varchar
  );
  
  CREATE TABLE "obozy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"typ" "enum_obozy_typ" DEFAULT 'oboz',
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"description" jsonb,
  	"wiek_od" numeric,
  	"wiek_do" numeric,
  	"poziom" "enum_obozy_poziom",
  	"cena" numeric,
  	"cena_od" boolean,
  	"jednostka_ceny" varchar,
  	"czas" varchar,
  	"grupa_max" numeric,
  	"miejsce" varchar,
  	"nocleg" boolean,
  	"wyzywienie" boolean,
  	"ikona" "enum_obozy_ikona" DEFAULT 'gory',
  	"cover_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_obozy_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_obozy_v_version_atrakcje" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pozycja" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_obozy_v_version_plan_dnia" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"godzina" varchar,
  	"tytul" varchar,
  	"opis" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_obozy_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_typ" "enum__obozy_v_version_typ" DEFAULT 'oboz',
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_description" jsonb,
  	"version_wiek_od" numeric,
  	"version_wiek_do" numeric,
  	"version_poziom" "enum__obozy_v_version_poziom",
  	"version_cena" numeric,
  	"version_cena_od" boolean,
  	"version_jednostka_ceny" varchar,
  	"version_czas" varchar,
  	"version_grupa_max" numeric,
  	"version_miejsce" varchar,
  	"version_nocleg" boolean,
  	"version_wyzywienie" boolean,
  	"version_ikona" "enum__obozy_v_version_ikona" DEFAULT 'gory',
  	"version_cover_id" integer,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__obozy_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "terminy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"etykieta" varchar,
  	"kurs_id" integer,
  	"oboz_id" integer,
  	"data_od" timestamp(3) with time zone NOT NULL,
  	"data_do" timestamp(3) with time zone,
  	"miejsce" varchar,
  	"cena" numeric,
  	"limit_miejsc" numeric,
  	"wolne_miejsca" numeric,
  	"status" "enum_terminy_status" DEFAULT 'otwarty' NOT NULL,
  	"uwagi" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "kursy" ADD COLUMN "grupa_max" numeric;
  ALTER TABLE "kursy" ADD COLUMN "miejsce" varchar;
  ALTER TABLE "kursy" ADD COLUMN "certyfikat" varchar;
  ALTER TABLE "kursy" ADD COLUMN "dla_kogo" jsonb;
  ALTER TABLE "kursy" ADD COLUMN "tytul_en" varchar;
  ALTER TABLE "_kursy_v" ADD COLUMN "version_grupa_max" numeric;
  ALTER TABLE "_kursy_v" ADD COLUMN "version_miejsce" varchar;
  ALTER TABLE "_kursy_v" ADD COLUMN "version_certyfikat" varchar;
  ALTER TABLE "_kursy_v" ADD COLUMN "version_dla_kogo" jsonb;
  ALTER TABLE "_kursy_v" ADD COLUMN "version_tytul_en" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "obozy_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "terminy_id" integer;
  ALTER TABLE "kursy_program" ADD CONSTRAINT "kursy_program_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kursy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kursy_w_cenie" ADD CONSTRAINT "kursy_w_cenie_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kursy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kursy_poza_cena" ADD CONSTRAINT "kursy_poza_cena_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kursy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kursy_warianty" ADD CONSTRAINT "kursy_warianty_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kursy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kursy_faq" ADD CONSTRAINT "kursy_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kursy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kursy_v_version_program" ADD CONSTRAINT "_kursy_v_version_program_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kursy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kursy_v_version_w_cenie" ADD CONSTRAINT "_kursy_v_version_w_cenie_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kursy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kursy_v_version_poza_cena" ADD CONSTRAINT "_kursy_v_version_poza_cena_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kursy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kursy_v_version_warianty" ADD CONSTRAINT "_kursy_v_version_warianty_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kursy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kursy_v_version_faq" ADD CONSTRAINT "_kursy_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kursy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "obozy_atrakcje" ADD CONSTRAINT "obozy_atrakcje_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."obozy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "obozy_plan_dnia" ADD CONSTRAINT "obozy_plan_dnia_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."obozy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "obozy" ADD CONSTRAINT "obozy_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_obozy_v_version_atrakcje" ADD CONSTRAINT "_obozy_v_version_atrakcje_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_obozy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_obozy_v_version_plan_dnia" ADD CONSTRAINT "_obozy_v_version_plan_dnia_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_obozy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_obozy_v" ADD CONSTRAINT "_obozy_v_parent_id_obozy_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."obozy"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_obozy_v" ADD CONSTRAINT "_obozy_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "terminy" ADD CONSTRAINT "terminy_kurs_id_kursy_id_fk" FOREIGN KEY ("kurs_id") REFERENCES "public"."kursy"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "terminy" ADD CONSTRAINT "terminy_oboz_id_obozy_id_fk" FOREIGN KEY ("oboz_id") REFERENCES "public"."obozy"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "kursy_program_order_idx" ON "kursy_program" USING btree ("_order");
  CREATE INDEX "kursy_program_parent_id_idx" ON "kursy_program" USING btree ("_parent_id");
  CREATE INDEX "kursy_w_cenie_order_idx" ON "kursy_w_cenie" USING btree ("_order");
  CREATE INDEX "kursy_w_cenie_parent_id_idx" ON "kursy_w_cenie" USING btree ("_parent_id");
  CREATE INDEX "kursy_poza_cena_order_idx" ON "kursy_poza_cena" USING btree ("_order");
  CREATE INDEX "kursy_poza_cena_parent_id_idx" ON "kursy_poza_cena" USING btree ("_parent_id");
  CREATE INDEX "kursy_warianty_order_idx" ON "kursy_warianty" USING btree ("_order");
  CREATE INDEX "kursy_warianty_parent_id_idx" ON "kursy_warianty" USING btree ("_parent_id");
  CREATE INDEX "kursy_faq_order_idx" ON "kursy_faq" USING btree ("_order");
  CREATE INDEX "kursy_faq_parent_id_idx" ON "kursy_faq" USING btree ("_parent_id");
  CREATE INDEX "_kursy_v_version_program_order_idx" ON "_kursy_v_version_program" USING btree ("_order");
  CREATE INDEX "_kursy_v_version_program_parent_id_idx" ON "_kursy_v_version_program" USING btree ("_parent_id");
  CREATE INDEX "_kursy_v_version_w_cenie_order_idx" ON "_kursy_v_version_w_cenie" USING btree ("_order");
  CREATE INDEX "_kursy_v_version_w_cenie_parent_id_idx" ON "_kursy_v_version_w_cenie" USING btree ("_parent_id");
  CREATE INDEX "_kursy_v_version_poza_cena_order_idx" ON "_kursy_v_version_poza_cena" USING btree ("_order");
  CREATE INDEX "_kursy_v_version_poza_cena_parent_id_idx" ON "_kursy_v_version_poza_cena" USING btree ("_parent_id");
  CREATE INDEX "_kursy_v_version_warianty_order_idx" ON "_kursy_v_version_warianty" USING btree ("_order");
  CREATE INDEX "_kursy_v_version_warianty_parent_id_idx" ON "_kursy_v_version_warianty" USING btree ("_parent_id");
  CREATE INDEX "_kursy_v_version_faq_order_idx" ON "_kursy_v_version_faq" USING btree ("_order");
  CREATE INDEX "_kursy_v_version_faq_parent_id_idx" ON "_kursy_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "obozy_atrakcje_order_idx" ON "obozy_atrakcje" USING btree ("_order");
  CREATE INDEX "obozy_atrakcje_parent_id_idx" ON "obozy_atrakcje" USING btree ("_parent_id");
  CREATE INDEX "obozy_plan_dnia_order_idx" ON "obozy_plan_dnia" USING btree ("_order");
  CREATE INDEX "obozy_plan_dnia_parent_id_idx" ON "obozy_plan_dnia" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "obozy_slug_idx" ON "obozy" USING btree ("slug");
  CREATE INDEX "obozy_cover_idx" ON "obozy" USING btree ("cover_id");
  CREATE INDEX "obozy_updated_at_idx" ON "obozy" USING btree ("updated_at");
  CREATE INDEX "obozy_created_at_idx" ON "obozy" USING btree ("created_at");
  CREATE INDEX "obozy__status_idx" ON "obozy" USING btree ("_status");
  CREATE INDEX "_obozy_v_version_atrakcje_order_idx" ON "_obozy_v_version_atrakcje" USING btree ("_order");
  CREATE INDEX "_obozy_v_version_atrakcje_parent_id_idx" ON "_obozy_v_version_atrakcje" USING btree ("_parent_id");
  CREATE INDEX "_obozy_v_version_plan_dnia_order_idx" ON "_obozy_v_version_plan_dnia" USING btree ("_order");
  CREATE INDEX "_obozy_v_version_plan_dnia_parent_id_idx" ON "_obozy_v_version_plan_dnia" USING btree ("_parent_id");
  CREATE INDEX "_obozy_v_parent_idx" ON "_obozy_v" USING btree ("parent_id");
  CREATE INDEX "_obozy_v_version_version_slug_idx" ON "_obozy_v" USING btree ("version_slug");
  CREATE INDEX "_obozy_v_version_version_cover_idx" ON "_obozy_v" USING btree ("version_cover_id");
  CREATE INDEX "_obozy_v_version_version_updated_at_idx" ON "_obozy_v" USING btree ("version_updated_at");
  CREATE INDEX "_obozy_v_version_version_created_at_idx" ON "_obozy_v" USING btree ("version_created_at");
  CREATE INDEX "_obozy_v_version_version__status_idx" ON "_obozy_v" USING btree ("version__status");
  CREATE INDEX "_obozy_v_created_at_idx" ON "_obozy_v" USING btree ("created_at");
  CREATE INDEX "_obozy_v_updated_at_idx" ON "_obozy_v" USING btree ("updated_at");
  CREATE INDEX "_obozy_v_latest_idx" ON "_obozy_v" USING btree ("latest");
  CREATE INDEX "terminy_kurs_idx" ON "terminy" USING btree ("kurs_id");
  CREATE INDEX "terminy_oboz_idx" ON "terminy" USING btree ("oboz_id");
  CREATE INDEX "terminy_updated_at_idx" ON "terminy" USING btree ("updated_at");
  CREATE INDEX "terminy_created_at_idx" ON "terminy" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_obozy_fk" FOREIGN KEY ("obozy_id") REFERENCES "public"."obozy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_terminy_fk" FOREIGN KEY ("terminy_id") REFERENCES "public"."terminy"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_obozy_id_idx" ON "payload_locked_documents_rels" USING btree ("obozy_id");
  CREATE INDEX "payload_locked_documents_rels_terminy_id_idx" ON "payload_locked_documents_rels" USING btree ("terminy_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "kursy_program" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kursy_w_cenie" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kursy_poza_cena" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kursy_warianty" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kursy_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_kursy_v_version_program" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_kursy_v_version_w_cenie" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_kursy_v_version_poza_cena" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_kursy_v_version_warianty" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_kursy_v_version_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "obozy_atrakcje" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "obozy_plan_dnia" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "obozy" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_obozy_v_version_atrakcje" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_obozy_v_version_plan_dnia" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_obozy_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "terminy" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "kursy_program" CASCADE;
  DROP TABLE "kursy_w_cenie" CASCADE;
  DROP TABLE "kursy_poza_cena" CASCADE;
  DROP TABLE "kursy_warianty" CASCADE;
  DROP TABLE "kursy_faq" CASCADE;
  DROP TABLE "_kursy_v_version_program" CASCADE;
  DROP TABLE "_kursy_v_version_w_cenie" CASCADE;
  DROP TABLE "_kursy_v_version_poza_cena" CASCADE;
  DROP TABLE "_kursy_v_version_warianty" CASCADE;
  DROP TABLE "_kursy_v_version_faq" CASCADE;
  DROP TABLE "obozy_atrakcje" CASCADE;
  DROP TABLE "obozy_plan_dnia" CASCADE;
  DROP TABLE "obozy" CASCADE;
  DROP TABLE "_obozy_v_version_atrakcje" CASCADE;
  DROP TABLE "_obozy_v_version_plan_dnia" CASCADE;
  DROP TABLE "_obozy_v" CASCADE;
  DROP TABLE "terminy" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_obozy_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_terminy_fk";
  
  DROP INDEX "payload_locked_documents_rels_obozy_id_idx";
  DROP INDEX "payload_locked_documents_rels_terminy_id_idx";
  ALTER TABLE "kursy" DROP COLUMN "grupa_max";
  ALTER TABLE "kursy" DROP COLUMN "miejsce";
  ALTER TABLE "kursy" DROP COLUMN "certyfikat";
  ALTER TABLE "kursy" DROP COLUMN "dla_kogo";
  ALTER TABLE "kursy" DROP COLUMN "tytul_en";
  ALTER TABLE "_kursy_v" DROP COLUMN "version_grupa_max";
  ALTER TABLE "_kursy_v" DROP COLUMN "version_miejsce";
  ALTER TABLE "_kursy_v" DROP COLUMN "version_certyfikat";
  ALTER TABLE "_kursy_v" DROP COLUMN "version_dla_kogo";
  ALTER TABLE "_kursy_v" DROP COLUMN "version_tytul_en";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "obozy_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "terminy_id";
  DROP TYPE "public"."enum_obozy_typ";
  DROP TYPE "public"."enum_obozy_poziom";
  DROP TYPE "public"."enum_obozy_ikona";
  DROP TYPE "public"."enum_obozy_status";
  DROP TYPE "public"."enum__obozy_v_version_typ";
  DROP TYPE "public"."enum__obozy_v_version_poziom";
  DROP TYPE "public"."enum__obozy_v_version_ikona";
  DROP TYPE "public"."enum__obozy_v_version_status";
  DROP TYPE "public"."enum_terminy_status";`)
}
