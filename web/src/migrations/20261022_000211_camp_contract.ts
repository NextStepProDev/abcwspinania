import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "private_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "camp_config" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contract_signature_id" integer,
  	"pre_camp_reminder_days" numeric DEFAULT 16 NOT NULL,
  	"pre_camp_template" varchar DEFAULT 'Dzień dobry,
  
  już niedługo zaczyna się nasz obóz: [nazwa obozu]. Spotykamy się w [miejsce zbiórki] (lokalizacja: [link do mapy]).
  
  Prosimy przywieźć wypełnione, kompletne karty kwalifikacyjne. Dzieci odbieramy i kwaterujemy [dzień i data] w godzinach [godziny]. Po zakwaterowaniu od razu idziemy w skały, żeby wykorzystać dzień — wracamy na kolację.
  
  Pamiętajcie o spakowaniu:
  - czapka na głowę albo kapelusz z szerszym rondem,
  - plecak 30–40 litrów (trzeba gdzieś spakować sprzęt),
  - bidon na wodę, minimum 0,75 l (albo dwa po 0,5 l),
  - krem z filtrem UV i krem z witaminą A na skórę dłoni (skała jest ostra),
  - kurtka przeciwdeszczowa (albo parasol),
  - buty podejściowe,
  - obuwie sportowe na zmianę i kapcie do chodzenia po domku,
  - jeśli dziecko ma: uprząż, buty wspinaczkowe i kask — dajcie znać, kto ich nie ma, przygotujemy,
  - osobiste środki higieny, ręcznik, szampon, mydło,
  - [śpiwór — jeśli na tym obozie trzeba mieć własny]
  - gry planszowe, jeśli dzieci je lubią.
  
  Pakujemy dzieci jak na zwykłą dłuższą wycieczkę. Obóz jest sportowo-przygodowy, nie robimy tańców i karaoke :-).
  
  Odbiór dzieci: [dzień i data] do godziny [godzina] — musimy wtedy opuścić obiekt.
  
  Pytania? Napiszcie albo zadzwońcie: [telefon]. Będę pod tym numerem w trakcie całego obozu — choć nie obiecuję, że w każdej chwili :-).
  
  Pozdrawiam i do zobaczenia
  Krzysztof Wróbel',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "camps" ADD COLUMN "own_sleeping_bags" boolean DEFAULT false;
  ALTER TABLE "_camps_v" ADD COLUMN "version_own_sleeping_bags" boolean DEFAULT false;
  ALTER TABLE "sessions" ADD COLUMN "kuratorium_number" varchar;
  ALTER TABLE "sessions" ADD COLUMN "pre_camp_draft_at" timestamp(3) with time zone;
  ALTER TABLE "bookings" ADD COLUMN "invoice_company_name" varchar;
  ALTER TABLE "bookings" ADD COLUMN "invoice_nip" varchar;
  ALTER TABLE "bookings" ADD COLUMN "invoice_company_address" varchar;
  ALTER TABLE "bookings" ADD COLUMN "contract_sent_at" timestamp(3) with time zone;
  ALTER TABLE "bookings" ADD COLUMN "contract_price" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "private_files_id" integer;
  ALTER TABLE "camp_config" ADD CONSTRAINT "camp_config_contract_signature_id_private_files_id_fk" FOREIGN KEY ("contract_signature_id") REFERENCES "public"."private_files"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "private_files_updated_at_idx" ON "private_files" USING btree ("updated_at");
  CREATE INDEX "private_files_created_at_idx" ON "private_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "private_files_filename_idx" ON "private_files" USING btree ("filename");
  CREATE INDEX "camp_config_contract_signature_idx" ON "camp_config" USING btree ("contract_signature_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_private_files_fk" FOREIGN KEY ("private_files_id") REFERENCES "public"."private_files"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_private_files_id_idx" ON "payload_locked_documents_rels" USING btree ("private_files_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "private_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "camp_config" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "private_files" CASCADE;
  DROP TABLE "camp_config" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_private_files_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_private_files_id_idx";
  ALTER TABLE "camps" DROP COLUMN "own_sleeping_bags";
  ALTER TABLE "_camps_v" DROP COLUMN "version_own_sleeping_bags";
  ALTER TABLE "sessions" DROP COLUMN "kuratorium_number";
  ALTER TABLE "sessions" DROP COLUMN "pre_camp_draft_at";
  ALTER TABLE "bookings" DROP COLUMN "invoice_company_name";
  ALTER TABLE "bookings" DROP COLUMN "invoice_nip";
  ALTER TABLE "bookings" DROP COLUMN "invoice_company_address";
  ALTER TABLE "bookings" DROP COLUMN "contract_sent_at";
  ALTER TABLE "bookings" DROP COLUMN "contract_price";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "private_files_id";`)
}
