import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_strona_glowna_dlaczego_ikona" AS ENUM('tarcza', 'ludzie', 'gory', 'dom');
  CREATE TABLE "ustawienia" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"telefon" varchar,
  	"telefon_e164" varchar,
  	"email" varchar,
  	"godziny" varchar,
  	"uwaga_kontaktowa" varchar,
  	"nazwa_firmy" varchar,
  	"ulica" varchar,
  	"kod_pocztowy" varchar,
  	"miejscowosc" varchar,
  	"mapa_embed" varchar,
  	"licencja_pza" varchar,
  	"uprawnienia_panstwowe" varchar,
  	"rok_zalozenia" numeric,
  	"opis_krotki" varchar,
  	"facebook" varchar,
  	"youtube" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "strona_glowna_liczby" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"wartosc" varchar NOT NULL,
  	"opis" varchar NOT NULL,
  	"wyrozniony" boolean
  );
  
  CREATE TABLE "strona_glowna_dlaczego" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tytul" varchar NOT NULL,
  	"opis" varchar NOT NULL,
  	"ikona" "enum_strona_glowna_dlaczego_ikona" DEFAULT 'tarcza'
  );
  
  CREATE TABLE "strona_glowna" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_odznaka" varchar,
  	"hero_podtytul" varchar,
  	"hero_tytul" varchar NOT NULL,
  	"hero_tekst" varchar,
  	"kursy_tytul" varchar,
  	"kursy_tekst" varchar,
  	"obozy_odznaka" varchar,
  	"obozy_tytul" varchar,
  	"obozy_tekst" varchar,
  	"obozy_zdjecie_id" integer,
  	"cta_tytul" varchar,
  	"cta_tekst" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "kursy" ADD COLUMN "cena_od" boolean;
  ALTER TABLE "kursy" ADD COLUMN "wyrozniony" boolean;
  ALTER TABLE "_kursy_v" ADD COLUMN "version_cena_od" boolean;
  ALTER TABLE "_kursy_v" ADD COLUMN "version_wyrozniony" boolean;
  ALTER TABLE "strona_glowna_liczby" ADD CONSTRAINT "strona_glowna_liczby_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."strona_glowna"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "strona_glowna_dlaczego" ADD CONSTRAINT "strona_glowna_dlaczego_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."strona_glowna"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "strona_glowna" ADD CONSTRAINT "strona_glowna_obozy_zdjecie_id_media_id_fk" FOREIGN KEY ("obozy_zdjecie_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "strona_glowna_liczby_order_idx" ON "strona_glowna_liczby" USING btree ("_order");
  CREATE INDEX "strona_glowna_liczby_parent_id_idx" ON "strona_glowna_liczby" USING btree ("_parent_id");
  CREATE INDEX "strona_glowna_dlaczego_order_idx" ON "strona_glowna_dlaczego" USING btree ("_order");
  CREATE INDEX "strona_glowna_dlaczego_parent_id_idx" ON "strona_glowna_dlaczego" USING btree ("_parent_id");
  CREATE INDEX "strona_glowna_obozy_zdjecie_idx" ON "strona_glowna" USING btree ("obozy_zdjecie_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ustawienia" CASCADE;
  DROP TABLE "strona_glowna_liczby" CASCADE;
  DROP TABLE "strona_glowna_dlaczego" CASCADE;
  DROP TABLE "strona_glowna" CASCADE;
  ALTER TABLE "kursy" DROP COLUMN "cena_od";
  ALTER TABLE "kursy" DROP COLUMN "wyrozniony";
  ALTER TABLE "_kursy_v" DROP COLUMN "version_cena_od";
  ALTER TABLE "_kursy_v" DROP COLUMN "version_wyrozniony";
  DROP TYPE "public"."enum_strona_glowna_dlaczego_ikona";`)
}
