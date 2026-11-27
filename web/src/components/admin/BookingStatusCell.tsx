'use client'

import { BOOKING_STATUS_OPTIONS, statusChangeQuestion } from '@/lib/bookings'

import { StatusSelectCell } from './StatusSelectCell'

/**
 * The "Status" column of the bookings list as a select (`StatusSelectCell`).
 * A status that emails the participant asks first — a click on the wrong row
 * must not send someone "your booking is cancelled".
 *
 * Props are typed narrowly (rowData.id and .email, cellData) instead of
 * importing Payload's cell types: only these are read.
 */
export function BookingStatusCell(props: {
  cellData?: string
  rowData?: { id?: number | string; email?: string | null; kind?: string | null }
}) {
  // A phone booking may have no address (12.10.2026): then nobody is
  // emailed, and the question would say otherwise. When the row does not
  // carry the field at all, it still asks — the safe side.
  const noAddress = props.rowData?.email === null || props.rowData?.email === ''
  // Same safe side for the kind: a row without it counts as a camp, which
  // emails more (`statusChangeQuestion`).
  const kind = props.rowData && 'kind' in props.rowData ? props.rowData.kind : null
  return (
    <StatusSelectCell
      {...props}
      collection="bookings"
      options={BOOKING_STATUS_OPTIONS}
      fallback="new"
      label="Status zapisu"
      confirmFor={(from, to) => statusChangeQuestion(kind, from, to, !noAddress)}
    />
  )
}
