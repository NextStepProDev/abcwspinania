import type { CollectionConfig } from 'payload'

import { isAdmin } from '../lib/access'
import { DELIVERY_STATUS_OPTIONS } from '../lib/broadcasts'
import { LANGUAGE_OPTIONS_FOR_PAYLOAD } from '../lib/email/language'

/**
 * One row per address of a broadcast, written when "Wyślij" is pressed and
 * worked through by the queue (`lib/broadcastSender.ts`). It is the fixed
 * recipient list, the queue's state and the record of who got what.
 *
 * Hidden from the panel's menu: the school sees these rows on the broadcast
 * itself (the "Odbiorcy" join). Nothing is edited here by hand.
 */
export const BroadcastDeliveries: CollectionConfig = {
  slug: 'broadcast-deliveries',
  labels: { singular: 'Wysłany mail', plural: 'Wysłane maile' },
  admin: {
    hidden: true,
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'sentAt'],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // The same address twice in one broadcast would be two emails.
  indexes: [{ fields: ['broadcast', 'email'], unique: true }],
  fields: [
    {
      name: 'broadcast',
      type: 'relationship',
      relationTo: 'broadcasts',
      required: true,
      index: true,
      label: 'Wysyłka',
    },
    { name: 'email', type: 'email', required: true, label: 'Adres e-mail' },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'pl',
      label: 'Język',
      options: LANGUAGE_OPTIONS_FOR_PAYLOAD,
    },
    {
      // Newsletter broadcasts: the subscription, checked again right before
      // sending (unsubscribed meanwhile → skipped) and holding the unsubscribe token.
      name: 'newsletter',
      type: 'relationship',
      relationTo: 'newsletter',
      label: 'Zapis na newsletter',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      label: 'Status',
      options: DELIVERY_STATUS_OPTIONS,
    },
    { name: 'attempts', type: 'number', defaultValue: 0, label: 'Próby' },
    {
      name: 'nextAttemptAt',
      type: 'date',
      label: 'Następna próba',
      admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'd.MM.yyyy, HH:mm' } },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: 'Wysłano',
      admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'd.MM.yyyy, HH:mm' } },
    },
    { name: 'error', type: 'text', label: 'Błąd' },
  ],
  timestamps: true,
}
