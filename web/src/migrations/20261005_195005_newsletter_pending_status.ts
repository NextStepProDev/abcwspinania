import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `pending` (double opt-in) to the newsletter status type — ALONE.
 *
 * Written by hand, split out of `20261005_195006_bookings_accounts_broadcasts`.
 * Payload runs each migration in one transaction, and Postgres refuses to
 * USE an enum value added in the same transaction: the generated migration
 * added `pending` and then made it the column's default, and failed with
 * `unsafe use of new value "pending" of enum type enum_newsletter_status`
 * (measured 05.10.2026 on a database migrated to main's state). In its own
 * migration the value is committed before the next one uses it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_newsletter_status" ADD VALUE IF NOT EXISTS 'pending' BEFORE 'subscribed';
  `)
}

/**
 * Nothing: Postgres cannot remove a value from an enum. The down of the
 * migration after this one rebuilds the type without `pending`.
 */
export async function down(_args: MigrateDownArgs): Promise<void> {}
