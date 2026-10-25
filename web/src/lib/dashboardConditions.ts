import type { ListCondition } from '@/lib/adminListUrl'
import { ACTIVE_STATUSES, type BookingKind } from '@/lib/bookings'

/**
 * What each dashboard tile counts and links to (`SchoolDashboard`) — one
 * list of conditions serves both, so the number and the list it opens
 * cannot drift apart. One field per condition (`adminListUrl.ts`).
 */
export function dashboardConditions(now: Date) {
  const kind = (k: BookingKind): ListCondition => ({ kind: { equals: k } })
  const status = (s: string): ListCondition => ({ status: { equals: s } })
  const all = (...conditions: ListCondition[]) => conditions
  // Only camps still ahead: after one starts, neither the form nor the
  // deposit is anything to chase. `sessionStart` — a relationship's own
  // date would not show in the list's filters.
  const ahead: ListCondition = { sessionStart: { greater_than: now.toISOString() } }
  return {
    newCourse: [kind('course'), status('new')],
    confirmedCourse: [kind('course'), status('confirmed')],
    waitingCourse: [kind('course'), status('waitlist')],
    newCamp: [kind('camp'), status('new')],
    // A place, and no registration form from the parent yet.
    campWithoutForm: [
      kind('camp'),
      { status: { in: [...ACTIVE_STATUSES] } },
      { registeredAt: { exists: false } },
      ahead,
    ],
    // The deposit deadline passed without the deposit (`lib/campPayment.ts`).
    campLateDeposit: [
      kind('camp'),
      { status: { in: ['new', 'confirmed'] } },
      { depositDueAt: { less_than: now.toISOString() } },
      ahead,
    ],
    waitingCamp: [kind('camp'), status('waitlist')],
    // An email to the participant that did not go out (`recordEmailIssue`)
    // and that the school has not dealt with yet.
    lostEmails: all(
      { emailIssueAt: { exists: true } },
      { emailIssueHandled: { not_equals: true } },
    ),
  }
}

/** "zapisani" beside a session in the dashboard's table. */
export function sessionBookingsConditions(sessionId: number, k: BookingKind): ListCondition[] {
  return [{ session: { equals: sessionId } }, { kind: { equals: k } }]
}

/**
 * The menu's view of a half (`BookingsNavLinks`, asked for 24.10.2026): by
 * the session's date (`bookingsListUrl`), from a month back — older years
 * would otherwise fill the first pages. The date condition shows in the
 * list's filters and can be removed there.
 */
export const LIST_DAYS_BACK = 30

export function bookingsMenuConditions(kind: BookingKind, now: Date): ListCondition[] {
  const from = new Date(now.getTime() - LIST_DAYS_BACK * 86_400_000).toISOString().slice(0, 10)
  return [{ kind: { equals: kind } }, { sessionStart: { greater_than_equal: from } }]
}
