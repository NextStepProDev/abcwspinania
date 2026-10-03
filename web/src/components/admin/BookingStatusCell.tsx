'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { BOOKING_STATUS_OPTIONS, statusEmailFor, type BookingStatus } from '@/lib/bookings'

/**
 * The "Status" column of the bookings list as a select — the school moves a
 * booking along (confirmed, paid, …) without opening it.
 *
 * It saves through the REST API like the edit form does, so everything that
 * follows a status change still happens: the participant's email, the
 * recount of places, the "a place freed up" email. A status that emails the
 * participant asks first — a click on the wrong row must not send someone
 * "your booking is cancelled".
 *
 * Props are typed narrowly here (rowData.id, cellData) instead of importing
 * Payload's cell types: only these two are read.
 */
export function BookingStatusCell({
  cellData,
  rowData,
}: {
  cellData?: string
  rowData?: { id?: number | string }
}) {
  const router = useRouter()
  const [status, setStatus] = useState((cellData ?? 'new') as BookingStatus)
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  // A new value from the list (refresh, another row in this slot after
  // sorting or filtering) replaces the local one — adjusted during render,
  // the pattern Header.tsx uses, so a select never shows another booking's
  // status.
  const [seen, setSeen] = useState(cellData)
  if (seen !== cellData) {
    setSeen(cellData)
    setStatus((cellData ?? 'new') as BookingStatus)
    setState('idle')
  }

  async function change(next: BookingStatus) {
    if (!rowData?.id || next === status) return
    if (
      statusEmailFor(status, next) &&
      !window.confirm(`Zmienić status na „${labelOf(next)}”? Kursant dostanie maila.`)
    ) {
      return
    }
    const previous = status
    setStatus(next)
    setState('saving')
    try {
      const response = await fetch(`/api/bookings/${rowData.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!response.ok) throw new Error(String(response.status))
      setState('idle')
      // Other columns and the session's spots may have changed.
      router.refresh()
    } catch {
      setStatus(previous)
      setState('error')
    }
  }

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      // Clicks stay in the select — nothing around it in the list should
      // react to choosing a status.
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={status}
        disabled={state === 'saving'}
        onChange={(e) => change(e.target.value as BookingStatus)}
        aria-label="Status zapisu"
        style={{ padding: '2px 4px' }}
      >
        {BOOKING_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {state === 'saving' && <span style={{ fontSize: 12 }}>zapisuję…</span>}
      {state === 'error' && (
        <span style={{ fontSize: 12, color: 'var(--theme-error-500)' }}>nie zapisano</span>
      )}
    </span>
  )
}

function labelOf(status: BookingStatus): string {
  return BOOKING_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}
