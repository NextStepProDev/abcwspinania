import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * "Wysyłki": upcoming courses and upcoming camps as separate audiences
 * (27.11.2026). Up only adds enum values (none is used in this transaction —
 * CLAUDE.md, "unsafe use of new value"). Down, written by hand: rows with a
 * new value would abort the cast back to the old type, so they become
 * `upcoming` (both together) first.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_broadcasts_audience" ADD VALUE 'upcomingCourses' BEFORE 'upcoming';
  ALTER TYPE "public"."enum_broadcasts_audience" ADD VALUE 'upcomingCamps' BEFORE 'upcoming';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "broadcasts" ALTER COLUMN "audience" SET DATA TYPE text;
  ALTER TABLE "broadcasts" ALTER COLUMN "audience" SET DEFAULT 'session'::text;
  UPDATE "broadcasts" SET "audience" = 'upcoming' WHERE "audience" IN ('upcomingCourses', 'upcomingCamps');
  DROP TYPE "public"."enum_broadcasts_audience";
  CREATE TYPE "public"."enum_broadcasts_audience" AS ENUM('session', 'upcoming', 'newsletter');
  ALTER TABLE "broadcasts" ALTER COLUMN "audience" SET DEFAULT 'session'::"public"."enum_broadcasts_audience";
  ALTER TABLE "broadcasts" ALTER COLUMN "audience" SET DATA TYPE "public"."enum_broadcasts_audience" USING "audience"::"public"."enum_broadcasts_audience";`)
}
