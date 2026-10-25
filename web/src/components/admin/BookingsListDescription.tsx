'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

import { LAST_LIST_KIND_KEY, describeBookingsList, kindFromListQuery } from '@/lib/bookingsList'

/**
 * The text under "Zapisy" on the bookings list: which half and which view
 * (a dashboard tile, the menu, filters set by hand), what the rows are, then
 * when a status change emails someone (`describeBookingsList`). Payload's
 * heading and description are the collection's — the same for every view,
 * so a camp list read as a list of everything (reported 24.10.2026).
 */
export function BookingsListDescription() {
  const searchParams = useSearchParams()
  const { title, about, rules } = describeBookingsList(searchParams.entries())
  const kind = kindFromListQuery(searchParams.entries())
  // For "Stwórz nowy" (`BookingKindField`): the half this list shows.
  useEffect(() => {
    try {
      if (kind) window.sessionStorage.setItem(LAST_LIST_KIND_KEY, kind)
      else window.sessionStorage.removeItem(LAST_LIST_KIND_KEY)
    } catch {
      // Storage blocked: new bookings start at the default.
    }
  }, [kind])
  return (
    <div className="custom-view-description">
      <p style={{ margin: 0 }}>
        <strong>{title}.</strong> {about}
      </p>
      <p style={{ margin: '4px 0 0', color: 'var(--theme-elevation-500)' }}>{rules}</p>
    </div>
  )
}
