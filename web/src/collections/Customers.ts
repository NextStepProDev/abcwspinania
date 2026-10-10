import type { CollectionConfig } from 'payload'

import { adminOrSelf, isAdmin } from '../lib/access'
import { LANGUAGE_OPTIONS_FOR_PAYLOAD, type EmailLanguage } from '../lib/email/language'
import { tokenLink } from '../lib/email/links'
import { resetPasswordEmail, verifyAccountEmail } from '../lib/email/templates'
import { eraseHandler, erasureSummaryHandler } from '../lib/personErasure'

/**
 * Participant accounts — people who sign up for courses and camps.
 *
 * A SECOND auth collection next to `users` (the school's panel accounts), not
 * a role inside it: participants never enter the panel, and keeping them in a
 * separate table means a mistake in a role check cannot turn a participant
 * into an administrator. The price is rule 28 in CLAUDE.md — "logged in" no
 * longer means "the school", so every access rule checks the collection.
 *
 * Writes go ONLY through the site's server actions (`app/(frontend)/konto/
 * actions.ts`): they validate, store the consent text and rate-limit through
 * nginx. REST create/update/delete are closed to everyone but the school.
 *
 * Account emails (address confirmation, password reset) are sent by the
 * site itself — `lib/accountEmails.ts`, HTML and text, in the person's
 * language; Payload only issues the tokens. The `generateEmail*` hooks below
 * are the FALLBACK for Payload's own REST endpoints, which the site does not
 * use: they render the same templates, but Payload sends them HTML only.
 */

/** How long a "set a new password" link works, in hours — also said in the email. */
export const RESET_LINK_HOURS = 2

/**
 * How long the address-confirmation link works, in hours. Payload's token has
 * NO expiry of its own, so ours is enforced by `/konto/potwierdz` against
 * `verificationSentAt` — set every time a link is sent (`lib/accountEmails.ts`),
 * so "send it again" restarts the clock. Payload's own
 * `/api/customers/verify/:token` would skip that check, so nginx closes it
 * (CLAUDE.md, "Konta uczestników").
 */
export const VERIFY_LINK_HOURS = 48

/** How long a login lasts on the site before logging in again, in days. */
const SESSION_DAYS = 14

function languageOf(user: unknown): EmailLanguage {
  return (user as { language?: string } | null)?.language === 'en' ? 'en' : 'pl'
}

function firstNameOf(user: unknown): string | null {
  return (user as { firstName?: string } | null)?.firstName ?? null
}

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: {
    singular: 'Uczestnik',
    plural: 'Uczestnicy',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', '_verified', 'createdAt'],
    group: 'Zapisy',
    description:
      'Konta osób zapisujących się na kursy i obozy. Zakładają je same na stronie — tu tylko podgląd i pomoc.',
    // "Usuń wszystkie dane osoby" — a request to be forgotten (`lib/personErasure.ts`).
    components: { beforeList: ['/components/admin/ErasePersonPanel#ErasePersonPanel'] },
  },
  endpoints: [
    { path: '/erase', method: 'get', handler: erasureSummaryHandler },
    { path: '/erase', method: 'post', handler: eraseHandler },
  ],
  auth: {
    tokenExpiration: SESSION_DAYS * 24 * 60 * 60,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: {
      sameSite: 'Lax',
      // Over HTTPS only in production; locally the site runs on plain http.
      secure: process.env.NODE_ENV === 'production',
    },
    verify: {
      generateEmailSubject: ({ user }) =>
        verifyAccountEmail(languageOf(user), { url: '', firstName: null }).subject,
      generateEmailHTML: ({ token, user }) =>
        verifyAccountEmail(languageOf(user), {
          firstName: firstNameOf(user),
          url: tokenLink('/konto/potwierdz', token),
          validHours: VERIFY_LINK_HOURS,
        }).html,
    },
    forgotPassword: {
      expiration: RESET_LINK_HOURS * 60 * 60 * 1000,
      generateEmailSubject: ({ user } = {}) =>
        resetPasswordEmail(languageOf(user), { url: '', firstName: null }).subject,
      generateEmailHTML: ({ token, user } = {}) =>
        resetPasswordEmail(languageOf(user), {
          firstName: firstNameOf(user),
          url: tokenLink('/konto/ustaw-haslo', token ?? ''),
          validHours: RESET_LINK_HOURS,
        }).html,
    },
  },
  access: {
    // Participants never see the panel, even with a valid login.
    admin: isAdmin,
    create: isAdmin,
    // Own account only — `/api/customers/me` reads through this rule.
    read: adminOrSelf('customers'),
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'firstName',
          type: 'text',
          required: true,
          maxLength: 120,
          label: 'Imię',
          admin: { width: '50%' },
        },
        {
          name: 'lastName',
          type: 'text',
          required: true,
          maxLength: 120,
          label: 'Nazwisko',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      maxLength: 30,
      label: 'Telefon',
      admin: {
        description: 'Z kierunkowym kraju, np. +48600100200 (ta sama zasada co w Next Step Pro).',
      },
    },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'pl',
      required: true,
      label: 'Język wiadomości',
      options: LANGUAGE_OPTIONS_FOR_PAYLOAD,
      admin: {
        description: 'W tym języku idą maile do tej osoby. Zmienia go sama w „Moim koncie”.',
      },
    },
    {
      name: 'verificationSentAt',
      type: 'date',
      label: 'Link potwierdzający wysłany',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: `Ostatnia wysyłka linku do potwierdzenia adresu. Link działa ${VERIFY_LINK_HOURS} godz.`,
      },
    },
    // --- GDPR: the clause accepted when the account was created ---
    {
      name: 'consentText',
      type: 'textarea',
      required: true,
      label: 'Treść zgody',
      admin: {
        readOnly: true,
        description: 'Dokładne brzmienie klauzuli zaakceptowanej przy zakładaniu konta.',
      },
    },
    {
      name: 'consentDate',
      type: 'date',
      required: true,
      label: 'Data zgody',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
