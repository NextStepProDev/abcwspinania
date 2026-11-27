import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The hero slideshow's two photo collections (`collections/HeroPhotos.ts`).
 *
 * Generated, with one fix by hand: `down` drops the tables with CASCADE,
 * which already takes their constraints on `payload_locked_documents_rels` —
 * so those drops are `IF EXISTS` (the trap described in CLAUDE.md).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "hero_wide_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"alt" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_medium_url" varchar,
  	"sizes_medium_width" numeric,
  	"sizes_medium_height" numeric,
  	"sizes_medium_mime_type" varchar,
  	"sizes_medium_filesize" numeric,
  	"sizes_medium_filename" varchar
  );
  
  CREATE TABLE "hero_tall_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"alt" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_medium_url" varchar,
  	"sizes_medium_width" numeric,
  	"sizes_medium_height" numeric,
  	"sizes_medium_mime_type" varchar,
  	"sizes_medium_filesize" numeric,
  	"sizes_medium_filename" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "hero_wide_photos_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "hero_tall_photos_id" integer;
  CREATE INDEX "hero_wide_photos__order_idx" ON "hero_wide_photos" USING btree ("_order");
  CREATE INDEX "hero_wide_photos_updated_at_idx" ON "hero_wide_photos" USING btree ("updated_at");
  CREATE INDEX "hero_wide_photos_created_at_idx" ON "hero_wide_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "hero_wide_photos_filename_idx" ON "hero_wide_photos" USING btree ("filename");
  CREATE INDEX "hero_wide_photos_sizes_medium_sizes_medium_filename_idx" ON "hero_wide_photos" USING btree ("sizes_medium_filename");
  CREATE INDEX "hero_tall_photos__order_idx" ON "hero_tall_photos" USING btree ("_order");
  CREATE INDEX "hero_tall_photos_updated_at_idx" ON "hero_tall_photos" USING btree ("updated_at");
  CREATE INDEX "hero_tall_photos_created_at_idx" ON "hero_tall_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "hero_tall_photos_filename_idx" ON "hero_tall_photos" USING btree ("filename");
  CREATE INDEX "hero_tall_photos_sizes_medium_sizes_medium_filename_idx" ON "hero_tall_photos" USING btree ("sizes_medium_filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_hero_wide_photos_fk" FOREIGN KEY ("hero_wide_photos_id") REFERENCES "public"."hero_wide_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_hero_tall_photos_fk" FOREIGN KEY ("hero_tall_photos_id") REFERENCES "public"."hero_tall_photos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_hero_wide_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("hero_wide_photos_id");
  CREATE INDEX "payload_locked_documents_rels_hero_tall_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("hero_tall_photos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "hero_wide_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "hero_tall_photos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "hero_wide_photos" CASCADE;
  DROP TABLE "hero_tall_photos" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_hero_wide_photos_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_hero_tall_photos_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_hero_wide_photos_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_hero_tall_photos_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "hero_wide_photos_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "hero_tall_photos_id";`)
}
