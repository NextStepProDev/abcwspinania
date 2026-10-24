'use client'

import { useSearchParams } from 'next/navigation'

import { bookingsListDescription, kindFromListQuery } from '@/lib/bookingsList'

/**
 * The line under "Zapisy" on the bookings list. The menu opens one list for
 * both halves ("Zapisy na kursy" / "na obozy", `BookingsNavLinks`), and
 * Payload's heading and description are the collection's — the same for
 * both, so a camp list read as a list of everything (reported 24.10.2026).
 * The kind comes from the filter in the address.
 */
export function BookingsListDescription() {
  const searchParams = useSearchParams()
  const { title, text } = bookingsListDescription(kindFromListQuery(searchParams.entries()))
  return (
    <div className="custom-view-description">
      {title && <strong>{title}. </strong>}
      {text}
    </div>
  )
}
