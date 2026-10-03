import {
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { APIError, type CollectionConfig, type FieldHook } from 'payload'

import { isAdmin } from '../lib/access'
import { lockedError, sendHandler, summaryHandler, testHandler } from '../lib/broadcastSender'
import { BROADCAST_AUDIENCE_OPTIONS, BROADCAST_STATUS_OPTIONS } from '../lib/broadcasts'
import { hasText, type RichTextValue } from '../lib/email/richText'

/**
 * Broadcasts ("Wysyłki") — a message the school writes once and sends to a
 * group: the people booked on one session, everyone with an upcoming
 * booking, or the confirmed newsletter addresses. How it goes out:
 * `lib/broadcastSender.ts`.
 *
 * A sent broadcast cannot be edited (`beforeChange`): its text must stay what
 * people actually received. "Duplikuj" makes an editable copy — the status
 * and counters reset on duplication (`beforeDuplicate`).
 */

/** Only what an email shows reliably: no images, tables, code or embeds. */
const emailEditor = lexicalEditor({
  features: [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    UnorderedListFeature(),
    OrderedListFeature(),
    // Addresses only — a link to a document in the panel means nothing in an inbox.
    LinkFeature({ enabledCollections: [] }),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
})

const resetOnDuplicate =
  <T>(value: T): FieldHook =>
  () =>
    value

/** Counters and dates: filled by the queue, shown once there is something to show. */
const progress = {
  readOnly: true,
  position: 'sidebar' as const,
  condition: (data: Partial<{ status: string }>) => data?.status !== 'draft',
}
const dateTime = { pickerAppearance: 'dayAndTime' as const, displayFormat: 'd.MM.yyyy, HH:mm' }

/**
 * The message and its audience are editable only while it is a draft. In the
 * panel the fields turn read-only; the `beforeChange` hook below is the
 * guard for anything that writes without the form.
 */
const draftOnly = {
  update: ({ doc }: { doc?: { status?: string } | null }) => !doc || doc.status === 'draft',
}

export const Broadcasts: CollectionConfig = {
  slug: 'broadcasts',
  labels: { singular: 'Wysyłka', plural: 'Wysyłki' },
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'audience', 'status', 'sentCount', 'startedAt'],
    group: 'Zapisy',
    description:
      'Wiadomości do grup: zapisanych na termin, wszystkich z nadchodzącymi zapisami albo newslettera. Zapisz, wyślij próbnie do siebie, potem „Wyślij”.',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: '-createdAt',
  endpoints: [
    { path: '/:id/summary', method: 'get', handler: summaryHandler },
    { path: '/:id/test', method: 'post', handler: testHandler },
    { path: '/:id/send', method: 'post', handler: sendHandler },
  ],
  hooks: {
    beforeChange: [
      ({ operation, originalDoc, context }) => {
        if (operation !== 'update' || context.broadcastQueue) return
        if (originalDoc?.status && originalDoc.status !== 'draft') throw lockedError()
      },
    ],
    beforeDelete: [
      // Deliveries point at the broadcast with a required field, so Postgres
      // would refuse the delete with "Failed query" (as with sessions). They go
      // first — except while sending, when the queue is still using them.
      async ({ id, req }) => {
        const broadcast = await req.payload.findByID({
          collection: 'broadcasts',
          id,
          depth: 0,
          joins: false,
          req,
          overrideAccess: true,
        })
        if (broadcast.status === 'sending') {
          throw new APIError(
            'Ta wiadomość jest właśnie wysyłana — usuń ją, gdy wysyłka się skończy.',
            400,
            null,
            true,
          )
        }
        await req.payload.delete({
          collection: 'broadcast-deliveries',
          where: { broadcast: { equals: id } },
          req,
          overrideAccess: true,
        })
      },
    ],
  },
  fields: [
    {
      name: 'subject',
      access: draftOnly,
      type: 'text',
      required: true,
      label: 'Temat',
      maxLength: 150,
    },
    {
      name: 'content',
      access: draftOnly,
      type: 'richText',
      required: true,
      label: 'Treść',
      editor: emailEditor,
      validate: (value: unknown) => hasText(value as RichTextValue) || 'Wpisz treść wiadomości.',
      admin: {
        description:
          'Na górze maila pojawi się temat jako nagłówek, na dole — skąd ktoś ma tę wiadomość. Odpowiedzi trafiają na adres szkoły.',
      },
    },
    {
      type: 'collapsible',
      label: 'Wersja angielska (opcjonalnie)',
      admin: {
        initCollapsed: true,
        description:
          'Osoby z językiem angielskim dostaną tę wersję — o ile wpiszesz i temat, i treść. Bez niej dostaną polską.',
      },
      fields: [
        {
          name: 'subjectEn',
          access: draftOnly,
          type: 'text',
          label: 'Temat (EN)',
          maxLength: 150,
          validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
            !hasText(siblingData.contentEn as RichTextValue) ||
            Boolean(typeof value === 'string' && value.trim()) ||
            'Dopisz temat po angielsku albo usuń angielską treść.',
        },
        {
          name: 'contentEn',
          access: draftOnly,
          type: 'richText',
          label: 'Treść (EN)',
          editor: emailEditor,
          validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
            !(typeof siblingData.subjectEn === 'string' && siblingData.subjectEn.trim()) ||
            hasText(value as RichTextValue) ||
            'Dopisz treść po angielsku albo usuń angielski temat.',
        },
      ],
    },
    {
      name: 'audience',
      access: draftOnly,
      type: 'select',
      required: true,
      defaultValue: 'session',
      label: 'Do kogo',
      options: BROADCAST_AUDIENCE_OPTIONS,
    },
    {
      name: 'session',
      access: draftOnly,
      type: 'relationship',
      relationTo: 'sessions',
      label: 'Termin',
      admin: { condition: (data) => data?.audience === 'session' },
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        siblingData.audience !== 'session' || Boolean(value) || 'Wybierz termin.',
    },
    {
      name: 'includeWaitlist',
      access: draftOnly,
      type: 'checkbox',
      defaultValue: false,
      label: 'Także lista rezerwowa',
      admin: {
        condition: (data) => data?.audience !== 'newsletter',
        description:
          'Domyślnie wiadomość dostają tylko osoby z miejscem. Zaznacz np. przy odwołaniu terminu albo zmianie dat.',
      },
    },
    {
      // Buttons and live numbers — `components/admin/BroadcastPanel.tsx`.
      name: 'sendPanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/admin/BroadcastPanel#BroadcastPanel' },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'Status',
      options: BROADCAST_STATUS_OPTIONS,
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
      hooks: { beforeDuplicate: [resetOnDuplicate('draft')] },
    },
    {
      name: 'recipientsCount',
      type: 'number',
      label: 'Odbiorców',
      admin: progress,
      hooks: { beforeDuplicate: [resetOnDuplicate(null)] },
    },
    {
      name: 'sentCount',
      type: 'number',
      label: 'Wysłano',
      admin: progress,
      hooks: { beforeDuplicate: [resetOnDuplicate(null)] },
    },
    {
      name: 'failedCount',
      type: 'number',
      label: 'Błędy',
      admin: progress,
      hooks: { beforeDuplicate: [resetOnDuplicate(null)] },
    },
    {
      name: 'startedAt',
      type: 'date',
      label: 'Wysyłka rozpoczęta',
      admin: { ...progress, date: dateTime },
      hooks: { beforeDuplicate: [resetOnDuplicate(null)] },
    },
    {
      name: 'finishedAt',
      type: 'date',
      label: 'Wysyłka zakończona',
      admin: { ...progress, date: dateTime },
      hooks: { beforeDuplicate: [resetOnDuplicate(null)] },
    },
    {
      // Set by the queue when Brevo refuses everything for now (daily limit).
      name: 'pausedUntil',
      type: 'date',
      admin: { hidden: true },
      hooks: { beforeDuplicate: [resetOnDuplicate(null)] },
    },
    {
      name: 'lastError',
      type: 'text',
      admin: { hidden: true },
      hooks: { beforeDuplicate: [resetOnDuplicate(null)] },
    },
    {
      name: 'deliveries',
      type: 'join',
      collection: 'broadcast-deliveries',
      on: 'broadcast',
      label: 'Odbiorcy',
      admin: {
        allowCreate: false,
        condition: (data) => data?.status !== 'draft',
        defaultColumns: ['email', 'status', 'sentAt', 'error'],
        description:
          'Lista ustalona w chwili „Wyślij” — kto później zapisze się na termin, tej wiadomości nie dostanie.',
      },
    },
  ],
}
