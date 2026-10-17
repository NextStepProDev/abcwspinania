import type { Payload } from 'payload'

import { bookingsOf } from '@/lib/participantBookings'

export interface AccountDetails {
  firstName: string
  lastName: string
  phone: string
}

/**
 * "Twoje dane" saved: the account, and the person's UPCOMING bookings.
 *
 * A booking keeps a COPY of the contact details from the day it was made
 * (CLAUDE.md, "Zapisy na kursy"). Upcoming ones that are not cancelled take
 * the new details too (decided 18.10.2026), so the school calls the number
 * that works; past and cancelled ones stay as they were — the record of who
 * came, as they gave it then.
 *
 * Validated and owned by the caller: the id must come from the login.
 * Returns how many bookings were updated.
 */
export async function saveAccountDetails(
  payload: Payload,
  customerId: number,
  details: AccountDetails,
): Promise<number> {
  await payload.update({
    collection: 'customers',
    id: customerId,
    data: details,
    overrideAccess: true,
  })
  const { upcoming } = await bookingsOf(customerId)
  if (upcoming.length === 0) return 0
  // A bulk update does not throw — refusals come back in `errors`.
  const { docs, errors } = await payload.update({
    collection: 'bookings',
    where: { id: { in: upcoming.map((b) => b.id) } },
    data: details,
    overrideAccess: true,
    // Neither the places nor the status change; the list label is rebuilt
    // from the new name by the collection's own hook.
    context: { skipRecount: true, skipStatusEmail: true },
  })
  if (errors.length > 0) {
    throw new Error(`${errors.length} upcoming booking(s) not updated`)
  }
  return docs.length
}
