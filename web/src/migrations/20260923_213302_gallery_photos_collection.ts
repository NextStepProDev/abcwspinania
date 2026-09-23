import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "gallery_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
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
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "gallery_photos_id" integer;
  CREATE INDEX "gallery_photos_updated_at_idx" ON "gallery_photos" USING btree ("updated_at");
  CREATE INDEX "gallery_photos_created_at_idx" ON "gallery_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "gallery_photos_filename_idx" ON "gallery_photos" USING btree ("filename");
  CREATE INDEX "gallery_photos_sizes_medium_sizes_medium_filename_idx" ON "gallery_photos" USING btree ("sizes_medium_filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gallery_photos_fk" FOREIGN KEY ("gallery_photos_id") REFERENCES "public"."gallery_photos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_gallery_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("gallery_photos_id");
  ALTER TABLE "media" DROP COLUMN "show_in_gallery";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // This one DESTROYS DATA, unavoidably: reverting a collection means dropping
  // its table, so every gallery photo record goes with it (the files stay on
  // the volume, orphaned). The restored `show_in_gallery` column comes back
  // empty — the ticks it once held are not recoverable from here. Take a dump
  // before running this against anything that matters.
  await db.execute(sql`
   ALTER TABLE "gallery_photos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "gallery_photos" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_gallery_photos_fk";
  
  DROP INDEX "payload_locked_documents_rels_gallery_photos_id_idx";
  ALTER TABLE "media" ADD COLUMN "show_in_gallery" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "gallery_photos_id";`)
}
