import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_courses_level" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum_courses_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__courses_v_version_level" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum__courses_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_camps_kind" AS ENUM('camp', 'trip', 'classes');
  CREATE TYPE "public"."enum_camps_level" AS ENUM('recreational', 'advanced');
  CREATE TYPE "public"."enum_camps_icon" AS ENUM('mountains', 'people', 'house', 'shield');
  CREATE TYPE "public"."enum_camps_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__camps_v_version_kind" AS ENUM('camp', 'trip', 'classes');
  CREATE TYPE "public"."enum__camps_v_version_level" AS ENUM('recreational', 'advanced');
  CREATE TYPE "public"."enum__camps_v_version_icon" AS ENUM('mountains', 'people', 'house', 'shield');
  CREATE TYPE "public"."enum__camps_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_sessions_status" AS ENUM('open', 'waitlist', 'cancelled', 'finished');
  CREATE TYPE "public"."enum_posts_category" AS ENUM('school-life', 'jura-history', 'guides', 'reports');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_category" AS ENUM('school-life', 'jura-history', 'guides', 'reports');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_testimonials_subject" AS ENUM('rock-course', 'bolted-routes', 'trad', 'camp', 'training');
  CREATE TYPE "public"."enum_messages_topic" AS ENUM('rock-course', 'bolted-routes', 'trad', 'indoor-wall', 'camp', 'private-lesson', 'other');
  CREATE TYPE "public"."enum_messages_status" AS ENUM('new', 'in-progress', 'resolved');
  CREATE TYPE "public"."enum_newsletter_status" AS ENUM('subscribed', 'unsubscribed');
  CREATE TYPE "public"."enum_home_page_reasons_icon" AS ENUM('shield', 'people', 'mountains', 'house');
  CREATE TABLE "courses_program" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"caption" varchar,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "courses_included" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "courses_excluded" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "courses_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"price" numeric,
  	"note" varchar
  );
  
  CREATE TABLE "courses_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "courses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"description" jsonb,
  	"price" numeric,
  	"price_from" boolean,
  	"duration" varchar,
  	"level" "enum_courses_level",
  	"order" numeric DEFAULT 0,
  	"max_group_size" numeric,
  	"location" varchar,
  	"certificate" varchar,
  	"audience" jsonb,
  	"title_en" varchar,
  	"featured" boolean,
  	"cover_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_courses_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_courses_v_version_program" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"caption" varchar,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_included" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_excluded" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"price" numeric,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_description" jsonb,
  	"version_price" numeric,
  	"version_price_from" boolean,
  	"version_duration" varchar,
  	"version_level" "enum__courses_v_version_level",
  	"version_order" numeric DEFAULT 0,
  	"version_max_group_size" numeric,
  	"version_location" varchar,
  	"version_certificate" varchar,
  	"version_audience" jsonb,
  	"version_title_en" varchar,
  	"version_featured" boolean,
  	"version_cover_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__courses_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "camps_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "camps_daily_schedule" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"time" varchar,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "camps" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_camps_kind" DEFAULT 'camp',
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"description" jsonb,
  	"age_from" numeric,
  	"age_to" numeric,
  	"level" "enum_camps_level",
  	"price" numeric,
  	"price_from" boolean,
  	"price_unit" varchar,
  	"duration" varchar,
  	"max_group_size" numeric,
  	"location" varchar,
  	"accommodation" boolean,
  	"meals" boolean,
  	"icon" "enum_camps_icon" DEFAULT 'mountains',
  	"cover_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_camps_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_camps_v_version_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_camps_v_version_daily_schedule" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"time" varchar,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_camps_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_kind" "enum__camps_v_version_kind" DEFAULT 'camp',
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_description" jsonb,
  	"version_age_from" numeric,
  	"version_age_to" numeric,
  	"version_level" "enum__camps_v_version_level",
  	"version_price" numeric,
  	"version_price_from" boolean,
  	"version_price_unit" varchar,
  	"version_duration" varchar,
  	"version_max_group_size" numeric,
  	"version_location" varchar,
  	"version_accommodation" boolean,
  	"version_meals" boolean,
  	"version_icon" "enum__camps_v_version_icon" DEFAULT 'mountains',
  	"version_cover_id" integer,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__camps_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"course_id" integer,
  	"camp_id" integer,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone,
  	"location" varchar,
  	"price" numeric,
  	"capacity" numeric,
  	"spots_left" numeric,
  	"status" "enum_sessions_status" DEFAULT 'open' NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"category" "enum_posts_category" DEFAULT 'school-life',
  	"lead" varchar,
  	"content" jsonb,
  	"published_at" timestamp(3) with time zone,
  	"author" varchar DEFAULT 'Krzysztof Wróbel',
  	"featured" boolean,
  	"cover_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_category" "enum__posts_v_version_category" DEFAULT 'school-life',
  	"version_lead" varchar,
  	"version_content" jsonb,
  	"version_published_at" timestamp(3) with time zone,
  	"version_author" varchar DEFAULT 'Krzysztof Wróbel',
  	"version_featured" boolean,
  	"version_cover_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "testimonials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar NOT NULL,
  	"author" varchar NOT NULL,
  	"subject" "enum_testimonials_subject" DEFAULT 'training' NOT NULL,
  	"period" varchar,
  	"published" boolean DEFAULT false,
  	"on_homepage" boolean,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "instructors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar,
  	"license" varchar,
  	"bio" varchar,
  	"portrait_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
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
  
  CREATE TABLE "messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"message" varchar NOT NULL,
  	"topic" "enum_messages_topic",
  	"preferred_date" varchar,
  	"course_id" integer,
  	"status" "enum_messages_status" DEFAULT 'new',
  	"consent_text" varchar NOT NULL,
  	"consent_date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "newsletter" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"status" "enum_newsletter_status" DEFAULT 'subscribed' NOT NULL,
  	"consent_text" varchar NOT NULL,
  	"consent_date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"courses_id" integer,
  	"camps_id" integer,
  	"sessions_id" integer,
  	"posts_id" integer,
  	"testimonials_id" integer,
  	"instructors_id" integer,
  	"media_id" integer,
  	"messages_id" integer,
  	"newsletter_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_config" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"phone" varchar,
  	"phone_e164" varchar,
  	"email" varchar,
  	"opening_hours" varchar,
  	"contact_note" varchar,
  	"legal_name" varchar,
  	"street" varchar,
  	"postal_code" varchar,
  	"city" varchar,
  	"directions" varchar,
  	"map_embed_url" varchar,
  	"pza_licence" varchar,
  	"state_qualifications" varchar,
  	"founded_year" numeric,
  	"short_description" varchar,
  	"facebook" varchar,
  	"youtube" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"caption" varchar NOT NULL,
  	"highlighted" boolean
  );
  
  CREATE TABLE "home_page_reasons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"icon" "enum_home_page_reasons_icon" DEFAULT 'shield'
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_badge" varchar,
  	"hero_subtitle" varchar,
  	"hero_title" varchar NOT NULL,
  	"hero_text" varchar,
  	"courses_title" varchar,
  	"courses_text" varchar,
  	"camps_badge" varchar,
  	"camps_title" varchar,
  	"camps_text" varchar,
  	"camps_image_id" integer,
  	"cta_title" varchar,
  	"cta_text" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_page_licence_reasons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL
  );
  
  CREATE TABLE "about_page_jura_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"caption" varchar NOT NULL
  );
  
  CREATE TABLE "about_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"intro" varchar,
  	"content" jsonb,
  	"about_jura" varchar,
  	"image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "english_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"badge" varchar,
  	"title" varchar,
  	"lead" varchar,
  	"about" varchar,
  	"accommodation" varchar,
  	"season" varchar,
  	"directions" varchar,
  	"courses_note" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "courses_program" ADD CONSTRAINT "courses_program_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_included" ADD CONSTRAINT "courses_included_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_excluded" ADD CONSTRAINT "courses_excluded_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_variants" ADD CONSTRAINT "courses_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_faq" ADD CONSTRAINT "courses_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses" ADD CONSTRAINT "courses_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v_version_program" ADD CONSTRAINT "_courses_v_version_program_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_included" ADD CONSTRAINT "_courses_v_version_included_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_excluded" ADD CONSTRAINT "_courses_v_version_excluded_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_variants" ADD CONSTRAINT "_courses_v_version_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_faq" ADD CONSTRAINT "_courses_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_parent_id_courses_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "camps_highlights" ADD CONSTRAINT "camps_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."camps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "camps_daily_schedule" ADD CONSTRAINT "camps_daily_schedule_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."camps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "camps" ADD CONSTRAINT "camps_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_camps_v_version_highlights" ADD CONSTRAINT "_camps_v_version_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_camps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_camps_v_version_daily_schedule" ADD CONSTRAINT "_camps_v_version_daily_schedule_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_camps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_camps_v" ADD CONSTRAINT "_camps_v_parent_id_camps_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."camps"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_camps_v" ADD CONSTRAINT "_camps_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "instructors" ADD CONSTRAINT "instructors_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_courses_fk" FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_camps_fk" FOREIGN KEY ("camps_id") REFERENCES "public"."camps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sessions_fk" FOREIGN KEY ("sessions_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_instructors_fk" FOREIGN KEY ("instructors_id") REFERENCES "public"."instructors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_messages_fk" FOREIGN KEY ("messages_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletter"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_stats" ADD CONSTRAINT "home_page_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_reasons" ADD CONSTRAINT "home_page_reasons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_camps_image_id_media_id_fk" FOREIGN KEY ("camps_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_licence_reasons" ADD CONSTRAINT "about_page_licence_reasons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_jura_facts" ADD CONSTRAINT "about_page_jura_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "courses_program_order_idx" ON "courses_program" USING btree ("_order");
  CREATE INDEX "courses_program_parent_id_idx" ON "courses_program" USING btree ("_parent_id");
  CREATE INDEX "courses_included_order_idx" ON "courses_included" USING btree ("_order");
  CREATE INDEX "courses_included_parent_id_idx" ON "courses_included" USING btree ("_parent_id");
  CREATE INDEX "courses_excluded_order_idx" ON "courses_excluded" USING btree ("_order");
  CREATE INDEX "courses_excluded_parent_id_idx" ON "courses_excluded" USING btree ("_parent_id");
  CREATE INDEX "courses_variants_order_idx" ON "courses_variants" USING btree ("_order");
  CREATE INDEX "courses_variants_parent_id_idx" ON "courses_variants" USING btree ("_parent_id");
  CREATE INDEX "courses_faq_order_idx" ON "courses_faq" USING btree ("_order");
  CREATE INDEX "courses_faq_parent_id_idx" ON "courses_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "courses_slug_idx" ON "courses" USING btree ("slug");
  CREATE INDEX "courses_cover_idx" ON "courses" USING btree ("cover_id");
  CREATE INDEX "courses_updated_at_idx" ON "courses" USING btree ("updated_at");
  CREATE INDEX "courses_created_at_idx" ON "courses" USING btree ("created_at");
  CREATE INDEX "courses__status_idx" ON "courses" USING btree ("_status");
  CREATE INDEX "_courses_v_version_program_order_idx" ON "_courses_v_version_program" USING btree ("_order");
  CREATE INDEX "_courses_v_version_program_parent_id_idx" ON "_courses_v_version_program" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_included_order_idx" ON "_courses_v_version_included" USING btree ("_order");
  CREATE INDEX "_courses_v_version_included_parent_id_idx" ON "_courses_v_version_included" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_excluded_order_idx" ON "_courses_v_version_excluded" USING btree ("_order");
  CREATE INDEX "_courses_v_version_excluded_parent_id_idx" ON "_courses_v_version_excluded" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_variants_order_idx" ON "_courses_v_version_variants" USING btree ("_order");
  CREATE INDEX "_courses_v_version_variants_parent_id_idx" ON "_courses_v_version_variants" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_faq_order_idx" ON "_courses_v_version_faq" USING btree ("_order");
  CREATE INDEX "_courses_v_version_faq_parent_id_idx" ON "_courses_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_parent_idx" ON "_courses_v" USING btree ("parent_id");
  CREATE INDEX "_courses_v_version_version_slug_idx" ON "_courses_v" USING btree ("version_slug");
  CREATE INDEX "_courses_v_version_version_cover_idx" ON "_courses_v" USING btree ("version_cover_id");
  CREATE INDEX "_courses_v_version_version_updated_at_idx" ON "_courses_v" USING btree ("version_updated_at");
  CREATE INDEX "_courses_v_version_version_created_at_idx" ON "_courses_v" USING btree ("version_created_at");
  CREATE INDEX "_courses_v_version_version__status_idx" ON "_courses_v" USING btree ("version__status");
  CREATE INDEX "_courses_v_created_at_idx" ON "_courses_v" USING btree ("created_at");
  CREATE INDEX "_courses_v_updated_at_idx" ON "_courses_v" USING btree ("updated_at");
  CREATE INDEX "_courses_v_latest_idx" ON "_courses_v" USING btree ("latest");
  CREATE INDEX "camps_highlights_order_idx" ON "camps_highlights" USING btree ("_order");
  CREATE INDEX "camps_highlights_parent_id_idx" ON "camps_highlights" USING btree ("_parent_id");
  CREATE INDEX "camps_daily_schedule_order_idx" ON "camps_daily_schedule" USING btree ("_order");
  CREATE INDEX "camps_daily_schedule_parent_id_idx" ON "camps_daily_schedule" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "camps_slug_idx" ON "camps" USING btree ("slug");
  CREATE INDEX "camps_cover_idx" ON "camps" USING btree ("cover_id");
  CREATE INDEX "camps_updated_at_idx" ON "camps" USING btree ("updated_at");
  CREATE INDEX "camps_created_at_idx" ON "camps" USING btree ("created_at");
  CREATE INDEX "camps__status_idx" ON "camps" USING btree ("_status");
  CREATE INDEX "_camps_v_version_highlights_order_idx" ON "_camps_v_version_highlights" USING btree ("_order");
  CREATE INDEX "_camps_v_version_highlights_parent_id_idx" ON "_camps_v_version_highlights" USING btree ("_parent_id");
  CREATE INDEX "_camps_v_version_daily_schedule_order_idx" ON "_camps_v_version_daily_schedule" USING btree ("_order");
  CREATE INDEX "_camps_v_version_daily_schedule_parent_id_idx" ON "_camps_v_version_daily_schedule" USING btree ("_parent_id");
  CREATE INDEX "_camps_v_parent_idx" ON "_camps_v" USING btree ("parent_id");
  CREATE INDEX "_camps_v_version_version_slug_idx" ON "_camps_v" USING btree ("version_slug");
  CREATE INDEX "_camps_v_version_version_cover_idx" ON "_camps_v" USING btree ("version_cover_id");
  CREATE INDEX "_camps_v_version_version_updated_at_idx" ON "_camps_v" USING btree ("version_updated_at");
  CREATE INDEX "_camps_v_version_version_created_at_idx" ON "_camps_v" USING btree ("version_created_at");
  CREATE INDEX "_camps_v_version_version__status_idx" ON "_camps_v" USING btree ("version__status");
  CREATE INDEX "_camps_v_created_at_idx" ON "_camps_v" USING btree ("created_at");
  CREATE INDEX "_camps_v_updated_at_idx" ON "_camps_v" USING btree ("updated_at");
  CREATE INDEX "_camps_v_latest_idx" ON "_camps_v" USING btree ("latest");
  CREATE INDEX "sessions_course_idx" ON "sessions" USING btree ("course_id");
  CREATE INDEX "sessions_camp_idx" ON "sessions" USING btree ("camp_id");
  CREATE INDEX "sessions_updated_at_idx" ON "sessions" USING btree ("updated_at");
  CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_cover_idx" ON "posts" USING btree ("cover_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_cover_idx" ON "_posts_v" USING btree ("version_cover_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "testimonials_updated_at_idx" ON "testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "testimonials" USING btree ("created_at");
  CREATE INDEX "instructors_portrait_idx" ON "instructors" USING btree ("portrait_id");
  CREATE INDEX "instructors_updated_at_idx" ON "instructors" USING btree ("updated_at");
  CREATE INDEX "instructors_created_at_idx" ON "instructors" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_medium_sizes_medium_filename_idx" ON "media" USING btree ("sizes_medium_filename");
  CREATE INDEX "messages_course_idx" ON "messages" USING btree ("course_id");
  CREATE INDEX "messages_updated_at_idx" ON "messages" USING btree ("updated_at");
  CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");
  CREATE UNIQUE INDEX "newsletter_email_idx" ON "newsletter" USING btree ("email");
  CREATE INDEX "newsletter_updated_at_idx" ON "newsletter" USING btree ("updated_at");
  CREATE INDEX "newsletter_created_at_idx" ON "newsletter" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_courses_id_idx" ON "payload_locked_documents_rels" USING btree ("courses_id");
  CREATE INDEX "payload_locked_documents_rels_camps_id_idx" ON "payload_locked_documents_rels" USING btree ("camps_id");
  CREATE INDEX "payload_locked_documents_rels_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("sessions_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonials_id");
  CREATE INDEX "payload_locked_documents_rels_instructors_id_idx" ON "payload_locked_documents_rels" USING btree ("instructors_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("messages_id");
  CREATE INDEX "payload_locked_documents_rels_newsletter_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletter_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "home_page_stats_order_idx" ON "home_page_stats" USING btree ("_order");
  CREATE INDEX "home_page_stats_parent_id_idx" ON "home_page_stats" USING btree ("_parent_id");
  CREATE INDEX "home_page_reasons_order_idx" ON "home_page_reasons" USING btree ("_order");
  CREATE INDEX "home_page_reasons_parent_id_idx" ON "home_page_reasons" USING btree ("_parent_id");
  CREATE INDEX "home_page_camps_image_idx" ON "home_page" USING btree ("camps_image_id");
  CREATE INDEX "about_page_licence_reasons_order_idx" ON "about_page_licence_reasons" USING btree ("_order");
  CREATE INDEX "about_page_licence_reasons_parent_id_idx" ON "about_page_licence_reasons" USING btree ("_parent_id");
  CREATE INDEX "about_page_jura_facts_order_idx" ON "about_page_jura_facts" USING btree ("_order");
  CREATE INDEX "about_page_jura_facts_parent_id_idx" ON "about_page_jura_facts" USING btree ("_parent_id");
  CREATE INDEX "about_page_image_idx" ON "about_page" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "courses_program" CASCADE;
  DROP TABLE "courses_included" CASCADE;
  DROP TABLE "courses_excluded" CASCADE;
  DROP TABLE "courses_variants" CASCADE;
  DROP TABLE "courses_faq" CASCADE;
  DROP TABLE "courses" CASCADE;
  DROP TABLE "_courses_v_version_program" CASCADE;
  DROP TABLE "_courses_v_version_included" CASCADE;
  DROP TABLE "_courses_v_version_excluded" CASCADE;
  DROP TABLE "_courses_v_version_variants" CASCADE;
  DROP TABLE "_courses_v_version_faq" CASCADE;
  DROP TABLE "_courses_v" CASCADE;
  DROP TABLE "camps_highlights" CASCADE;
  DROP TABLE "camps_daily_schedule" CASCADE;
  DROP TABLE "camps" CASCADE;
  DROP TABLE "_camps_v_version_highlights" CASCADE;
  DROP TABLE "_camps_v_version_daily_schedule" CASCADE;
  DROP TABLE "_camps_v" CASCADE;
  DROP TABLE "sessions" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "testimonials" CASCADE;
  DROP TABLE "instructors" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "messages" CASCADE;
  DROP TABLE "newsletter" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_config" CASCADE;
  DROP TABLE "home_page_stats" CASCADE;
  DROP TABLE "home_page_reasons" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "about_page_licence_reasons" CASCADE;
  DROP TABLE "about_page_jura_facts" CASCADE;
  DROP TABLE "about_page" CASCADE;
  DROP TABLE "english_page" CASCADE;
  DROP TYPE "public"."enum_courses_level";
  DROP TYPE "public"."enum_courses_status";
  DROP TYPE "public"."enum__courses_v_version_level";
  DROP TYPE "public"."enum__courses_v_version_status";
  DROP TYPE "public"."enum_camps_kind";
  DROP TYPE "public"."enum_camps_level";
  DROP TYPE "public"."enum_camps_icon";
  DROP TYPE "public"."enum_camps_status";
  DROP TYPE "public"."enum__camps_v_version_kind";
  DROP TYPE "public"."enum__camps_v_version_level";
  DROP TYPE "public"."enum__camps_v_version_icon";
  DROP TYPE "public"."enum__camps_v_version_status";
  DROP TYPE "public"."enum_sessions_status";
  DROP TYPE "public"."enum_posts_category";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_category";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum_testimonials_subject";
  DROP TYPE "public"."enum_messages_topic";
  DROP TYPE "public"."enum_messages_status";
  DROP TYPE "public"."enum_newsletter_status";
  DROP TYPE "public"."enum_home_page_reasons_icon";`)
}
