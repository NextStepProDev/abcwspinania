import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_wpisy_kategoria" AS ENUM('z-zycia-szkoly', 'historia-jury', 'poradniki', 'relacje');
  CREATE TYPE "public"."enum_wpisy_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__wpisy_v_version_kategoria" AS ENUM('z-zycia-szkoly', 'historia-jury', 'poradniki', 'relacje');
  CREATE TYPE "public"."enum__wpisy_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_opinie_czego" AS ENUM('kurs-skalkowy', 'drogi-ubezpieczone', 'trad', 'oboz', 'kurs');
  CREATE TABLE "wpisy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"kategoria" "enum_wpisy_kategoria" DEFAULT 'z-zycia-szkoly',
  	"lead" varchar,
  	"tresc" jsonb,
  	"published_at" timestamp(3) with time zone,
  	"autor" varchar DEFAULT 'Krzysztof Wróbel',
  	"wyrozniony" boolean,
  	"cover_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_wpisy_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_wpisy_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_kategoria" "enum__wpisy_v_version_kategoria" DEFAULT 'z-zycia-szkoly',
  	"version_lead" varchar,
  	"version_tresc" jsonb,
  	"version_published_at" timestamp(3) with time zone,
  	"version_autor" varchar DEFAULT 'Krzysztof Wróbel',
  	"version_wyrozniony" boolean,
  	"version_cover_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__wpisy_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "opinie" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tresc" varchar NOT NULL,
  	"autor" varchar NOT NULL,
  	"czego" "enum_opinie_czego" DEFAULT 'kurs' NOT NULL,
  	"termin" varchar,
  	"opublikowana" boolean DEFAULT false,
  	"na_stronie_glownej" boolean,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "instruktorzy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"imie" varchar NOT NULL,
  	"rola" varchar,
  	"licencja" varchar,
  	"opis" varchar,
  	"portret_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "strona_o_nas_powody_licencji" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tytul" varchar NOT NULL,
  	"opis" varchar NOT NULL
  );
  
  CREATE TABLE "strona_o_nas_liczby_jura" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"wartosc" varchar NOT NULL,
  	"opis" varchar NOT NULL
  );
  
  CREATE TABLE "strona_o_nas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tytul" varchar,
  	"wstep" varchar,
  	"tresc" jsonb,
  	"o_jurze" varchar,
  	"zdjecie_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "wpisy_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "opinie_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "instruktorzy_id" integer;
  ALTER TABLE "wpisy" ADD CONSTRAINT "wpisy_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_wpisy_v" ADD CONSTRAINT "_wpisy_v_parent_id_wpisy_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."wpisy"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_wpisy_v" ADD CONSTRAINT "_wpisy_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "instruktorzy" ADD CONSTRAINT "instruktorzy_portret_id_media_id_fk" FOREIGN KEY ("portret_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "strona_o_nas_powody_licencji" ADD CONSTRAINT "strona_o_nas_powody_licencji_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."strona_o_nas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "strona_o_nas_liczby_jura" ADD CONSTRAINT "strona_o_nas_liczby_jura_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."strona_o_nas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "strona_o_nas" ADD CONSTRAINT "strona_o_nas_zdjecie_id_media_id_fk" FOREIGN KEY ("zdjecie_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "wpisy_slug_idx" ON "wpisy" USING btree ("slug");
  CREATE INDEX "wpisy_cover_idx" ON "wpisy" USING btree ("cover_id");
  CREATE INDEX "wpisy_updated_at_idx" ON "wpisy" USING btree ("updated_at");
  CREATE INDEX "wpisy_created_at_idx" ON "wpisy" USING btree ("created_at");
  CREATE INDEX "wpisy__status_idx" ON "wpisy" USING btree ("_status");
  CREATE INDEX "_wpisy_v_parent_idx" ON "_wpisy_v" USING btree ("parent_id");
  CREATE INDEX "_wpisy_v_version_version_slug_idx" ON "_wpisy_v" USING btree ("version_slug");
  CREATE INDEX "_wpisy_v_version_version_cover_idx" ON "_wpisy_v" USING btree ("version_cover_id");
  CREATE INDEX "_wpisy_v_version_version_updated_at_idx" ON "_wpisy_v" USING btree ("version_updated_at");
  CREATE INDEX "_wpisy_v_version_version_created_at_idx" ON "_wpisy_v" USING btree ("version_created_at");
  CREATE INDEX "_wpisy_v_version_version__status_idx" ON "_wpisy_v" USING btree ("version__status");
  CREATE INDEX "_wpisy_v_created_at_idx" ON "_wpisy_v" USING btree ("created_at");
  CREATE INDEX "_wpisy_v_updated_at_idx" ON "_wpisy_v" USING btree ("updated_at");
  CREATE INDEX "_wpisy_v_latest_idx" ON "_wpisy_v" USING btree ("latest");
  CREATE INDEX "opinie_updated_at_idx" ON "opinie" USING btree ("updated_at");
  CREATE INDEX "opinie_created_at_idx" ON "opinie" USING btree ("created_at");
  CREATE INDEX "instruktorzy_portret_idx" ON "instruktorzy" USING btree ("portret_id");
  CREATE INDEX "instruktorzy_updated_at_idx" ON "instruktorzy" USING btree ("updated_at");
  CREATE INDEX "instruktorzy_created_at_idx" ON "instruktorzy" USING btree ("created_at");
  CREATE INDEX "strona_o_nas_powody_licencji_order_idx" ON "strona_o_nas_powody_licencji" USING btree ("_order");
  CREATE INDEX "strona_o_nas_powody_licencji_parent_id_idx" ON "strona_o_nas_powody_licencji" USING btree ("_parent_id");
  CREATE INDEX "strona_o_nas_liczby_jura_order_idx" ON "strona_o_nas_liczby_jura" USING btree ("_order");
  CREATE INDEX "strona_o_nas_liczby_jura_parent_id_idx" ON "strona_o_nas_liczby_jura" USING btree ("_parent_id");
  CREATE INDEX "strona_o_nas_zdjecie_idx" ON "strona_o_nas" USING btree ("zdjecie_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wpisy_fk" FOREIGN KEY ("wpisy_id") REFERENCES "public"."wpisy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opinie_fk" FOREIGN KEY ("opinie_id") REFERENCES "public"."opinie"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_instruktorzy_fk" FOREIGN KEY ("instruktorzy_id") REFERENCES "public"."instruktorzy"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_wpisy_id_idx" ON "payload_locked_documents_rels" USING btree ("wpisy_id");
  CREATE INDEX "payload_locked_documents_rels_opinie_id_idx" ON "payload_locked_documents_rels" USING btree ("opinie_id");
  CREATE INDEX "payload_locked_documents_rels_instruktorzy_id_idx" ON "payload_locked_documents_rels" USING btree ("instruktorzy_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "wpisy" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_wpisy_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "opinie" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "instruktorzy" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "strona_o_nas_powody_licencji" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "strona_o_nas_liczby_jura" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "strona_o_nas" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "wpisy" CASCADE;
  DROP TABLE "_wpisy_v" CASCADE;
  DROP TABLE "opinie" CASCADE;
  DROP TABLE "instruktorzy" CASCADE;
  DROP TABLE "strona_o_nas_powody_licencji" CASCADE;
  DROP TABLE "strona_o_nas_liczby_jura" CASCADE;
  DROP TABLE "strona_o_nas" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_wpisy_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_opinie_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_instruktorzy_fk";
  
  DROP INDEX "payload_locked_documents_rels_wpisy_id_idx";
  DROP INDEX "payload_locked_documents_rels_opinie_id_idx";
  DROP INDEX "payload_locked_documents_rels_instruktorzy_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "wpisy_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "opinie_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "instruktorzy_id";
  DROP TYPE "public"."enum_wpisy_kategoria";
  DROP TYPE "public"."enum_wpisy_status";
  DROP TYPE "public"."enum__wpisy_v_version_kategoria";
  DROP TYPE "public"."enum__wpisy_v_version_status";
  DROP TYPE "public"."enum_opinie_czego";`)
}
