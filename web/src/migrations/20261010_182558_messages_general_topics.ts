import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Contact-form topics: course names from the mockup → general topics
 * (`lib/topics.ts`, 10.10.2026). Generated, then completed by hand: the
 * generated version recast the column to the new type straight away, and
 * every message with an old topic would have failed the cast — on
 * production, with messages in it.
 *
 * Old course topics become "course", with `course_id` filled from the
 * matching course where the message had none (the course itself was the
 * topic). The slugs are those of the courses in the panel on 10.10.2026; a
 * course renamed since simply stays unassigned. "private-lesson" maps to the
 * "Szkolenie indywidualne" course, which is in the offer as a course.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "messages" ALTER COLUMN "topic" SET DATA TYPE text;
  UPDATE "messages" m SET "course_id" = c."id"
    FROM "courses" c
    WHERE m."course_id" IS NULL
      AND c."slug" = CASE m."topic"
        WHEN 'rock-course' THEN 'kurs-wspinaczki-skalnej-pza'
        WHEN 'bolted-routes' THEN 'kurs-na-drogach-ubezpieczonych'
        WHEN 'trad' THEN 'kurs-asekuracji-tradycyjnej'
        WHEN 'indoor-wall' THEN 'kurs-na-sztucznej-sciance'
        WHEN 'private-lesson' THEN 'szkolenie-indywidualne'
      END;
  UPDATE "messages" SET "topic" = 'course'
    WHERE "topic" IN ('rock-course', 'bolted-routes', 'trad', 'indoor-wall', 'private-lesson');
  DROP TYPE "public"."enum_messages_topic";
  CREATE TYPE "public"."enum_messages_topic" AS ENUM('course', 'camp', 'other');
  ALTER TABLE "messages" ALTER COLUMN "topic" SET DATA TYPE "public"."enum_messages_topic" USING "topic"::"public"."enum_messages_topic";`)
}

/** Back: "course" cannot be split again — it becomes "other"; the course link stays. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "messages" ALTER COLUMN "topic" SET DATA TYPE text;
  UPDATE "messages" SET "topic" = 'other' WHERE "topic" = 'course';
  DROP TYPE "public"."enum_messages_topic";
  CREATE TYPE "public"."enum_messages_topic" AS ENUM('rock-course', 'bolted-routes', 'trad', 'indoor-wall', 'camp', 'private-lesson', 'other');
  ALTER TABLE "messages" ALTER COLUMN "topic" SET DATA TYPE "public"."enum_messages_topic" USING "topic"::"public"."enum_messages_topic";`)
}
