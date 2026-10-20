'use client'

import { BOOKING_STATUS_OPTIONS, statusEmailForKind, type BookingStatus } from '@/lib/bookings'

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
  // Same safe side for the kind: a row without it may be a camp, whose
  // deposit emails the parent — so it is treated as one.
  const kind = props.rowData && 'kind' in props.rowData ? props.rowData.kind : 'camp'
  const known = props.rowData?.kind
  const who = known === 'camp' ? 'rodzic' : known ? 'kursant' : 'uczestnik'
  const what = known === 'camp' ? 'obóz' : known ? 'kurs' : 'termin'
  return (
    <StatusSelectCell
      {...props}
      collection="bookings"
      options={BOOKING_STATUS_OPTIONS}
      fallback="new"
      label="Status zapisu"
      // The list loads rows without their session, so the cell cannot tell
      // whether the course has started: for "paid" it says when the email goes.
      confirmFor={(from, to) =>
        !noAddress && statusEmailForKind(kind, from as BookingStatus, to as BookingStatus)
          ? to === 'paid'
            ? `Zmienić status na „${labelOf(to)}”? Jeśli ${what} jeszcze się nie zaczął, ${who} dostanie maila.`
            : `Zmienić status na „${labelOf(to)}”? ${who[0].toUpperCase()}${who.slice(1)} dostanie maila.`
          : null
      }
    />
  )
}

function labelOf(status: string): string {
  return BOOKING_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}
