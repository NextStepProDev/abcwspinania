'use client'

import { BOOKING_STATUS_OPTIONS, statusEmailFor, type BookingStatus } from '@/lib/bookings'

import { StatusSelectCell } from './StatusSelectCell'

/**
 * The "Status" column of the bookings list as a select (`StatusSelectCell`).
 * A status that emails the participant asks first — a click on the wrong row
 * must not send someone "your booking is cancelled".
 *
 * Props are typed narrowly (rowData.id, cellData) instead of importing
 * Payload's cell types: only these two are read.
 */
export function BookingStatusCell(props: {
  cellData?: string
  rowData?: { id?: number | string }
}) {
  return (
    <StatusSelectCell
      {...props}
      collection="bookings"
      options={BOOKING_STATUS_OPTIONS}
      fallback="new"
      label="Status zapisu"
      confirmFor={(from, to) =>
        statusEmailFor(from as BookingStatus, to as BookingStatus)
          ? `Zmienić status na „${labelOf(to)}”? Kursant dostanie maila.`
          : null
      }
    />
  )
}

function labelOf(status: string): string {
  return BOOKING_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}
