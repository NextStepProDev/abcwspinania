'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * A "Status" column as a select — a row moves along without being opened.
 * Shared by bookings (`BookingStatusCell`) and contact messages
 * (`MessageStatusCell`).
 *
 * It saves through the REST API like the edit form does, so everything that
 * follows a status change still happens (for a booking: the participant's
 * email, the recount of places). `confirmFor` returns the question to ask
 * before a change, or null to change at once — a status that emails someone
 * must not go out on a click in the wrong row.
 */
export function StatusSelectCell({
  collection,
  options,
  cellData,
  rowData,
  fallback,
  label,
  confirmFor,
}: {
  collection: 'bookings' | 'messages'
  options: readonly { label: string; value: string }[]
  cellData?: string
  rowData?: { id?: number | string }
  fallback: string
  label: string
  confirmFor?: (from: string, to: string) => string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState(cellData ?? fallback)
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  // A new value from the list (refresh, another row in this slot after
  // sorting or filtering) replaces the local one — adjusted during render,
  // the pattern Header.tsx uses, so a select never shows another row's status.
  const [seen, setSeen] = useState(cellData)
  if (seen !== cellData) {
    setSeen(cellData)
    setStatus(cellData ?? fallback)
    setState('idle')
  }

  async function change(next: string) {
    if (!rowData?.id || next === status) return
    const question = confirmFor?.(status, next)
    if (question && !window.confirm(question)) return
    const previous = status
    setStatus(next)
    setState('saving')
    try {
      const response = await fetch(`/api/${collection}/${rowData.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!response.ok) throw new Error(String(response.status))
      setState('idle')
      // Other columns (and for a booking, the session's spots) may have changed.
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
        onChange={(e) => change(e.target.value)}
        aria-label={label}
        style={{ padding: '2px 4px' }}
      >
        {options.map((o) => (
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
