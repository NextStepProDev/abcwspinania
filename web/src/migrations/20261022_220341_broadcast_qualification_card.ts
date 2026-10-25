import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "broadcasts" ADD COLUMN "attach_qualification_card" boolean DEFAULT false;
  ALTER TABLE "camp_config" ADD COLUMN "qualification_card_id" integer;
  ALTER TABLE "camp_config" ADD CONSTRAINT "camp_config_qualification_card_id_private_files_id_fk" FOREIGN KEY ("qualification_card_id") REFERENCES "public"."private_files"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "camp_config_qualification_card_idx" ON "camp_config" USING btree ("qualification_card_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "camp_config" DROP CONSTRAINT "camp_config_qualification_card_id_private_files_id_fk";
  
  DROP INDEX "camp_config_qualification_card_idx";
  ALTER TABLE "broadcasts" DROP COLUMN "attach_qualification_card";
  ALTER TABLE "camp_config" DROP COLUMN "qualification_card_id";`)
}
