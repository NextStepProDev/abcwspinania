'use client'

import { MESSAGE_STATUS_OPTIONS } from '@/lib/messages'

import { StatusSelectCell } from './StatusSelectCell'

/**
 * The "Status" column of the contact messages as a select — nowa → w toku →
 * załatwiona in one click (asked for 10.10.2026: it took opening each
 * message). No question first: a message's status emails nobody.
 */
export function MessageStatusCell(props: {
  cellData?: string
  rowData?: { id?: number | string }
}) {
  return (
    <StatusSelectCell
      {...props}
      collection="messages"
      options={MESSAGE_STATUS_OPTIONS}
      fallback="new"
      label="Status wiadomości"
    />
  )
}
