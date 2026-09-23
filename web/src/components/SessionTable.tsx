import Link from 'next/link'

import type { Session } from '@/lib/content'
import { asCourse, asCamp } from '@/lib/content'
import {
  formatPriceLabel,
  formatSpotsLeft,
  formatDateRange,
  formatDateRangeShort,
} from '@/lib/format'
import { Badge } from './Ui'

/**
 * Shared logic for reading a session.
 *
 * A session may override the price and the location of the course or camp it
 * belongs to — "fill in only where it differs" in the panel. Deciding what to
 * display in the end lives HERE, not in the three views that render a session:
 * a divergence between the homepage and the schedule would be hard to spot and
 * harder still to explain to the client.
 */
export function sessionDetails(session: Session) {
  const course = asCourse(session.course)
  const camp = asCamp(session.camp)
  const target = course ?? camp

  return {
    name: target?.title ?? 'Termin',
    href: course ? `/kursy/${course.slug}` : camp ? `/obozy/${camp.slug}` : null,
    location: session.location || target?.location || null,
    price: session.price ?? target?.price ?? null,
    // The "from" prefix is taken from the course or camp only when the session
    // has no price of its own. A price entered on the session is a definite
    // figure, so "from" would be untrue.
    priceFrom: session.price != null ? false : Boolean(target?.priceFrom),
    soldOut: session.status === 'waitlist' || (session.spotsLeft != null && session.spotsLeft <= 0),
  }
}

export function SpotsBadge({ session }: { session: Session }) {
  const { soldOut } = sessionDetails(session)
  if (soldOut)
    return (
      <Badge tone="accent" pill>
        brak miejsc
      </Badge>
    )
  if (session.spotsLeft == null)
    return (
      <Badge tone="neutral" pill>
        zapytaj o miejsca
      </Badge>
    )
  // Below three spots the accent colour applies — that is real information
  // ("two left"), not decoration.
  return (
    <Badge tone={session.spotsLeft <= 2 ? 'accent' : 'available'} pill>
      {formatSpotsLeft(session.spotsLeft)}
    </Badge>
  )
}

/** Table of upcoming sessions — homepage and camps page. */
export function SessionTable({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-rock-100 bg-white p-6 text-rock-600">
        Nowe terminy pojawią się tutaj po dodaniu ich w panelu. W międzyczasie napisz albo zadzwoń —
        przy grupie od trzech osób ustalamy termin indywidualnie.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)]">
      {/* A table from `sm` up; below that the same data as a list of cards,
          because five columns at 390 px cannot be read, and horizontal
          scrolling inside a table of prices is particularly unpleasant. */}
      <table className="hidden w-full border-collapse text-[15px] sm:table">
        <thead>
          <tr className="bg-rock-100 text-left">
            <th
              scope="col"
              className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
            >
              Termin
            </th>
            <th
              scope="col"
              className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
            >
              Co
            </th>
            <th
              scope="col"
              className="px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
            >
              Miejsca
            </th>
            <th
              scope="col"
              className="px-6 py-3.5 text-right text-[13px] font-semibold uppercase tracking-[0.04em] text-rock-600"
            >
              Cena
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => {
            const details = sessionDetails(session)
            return (
              <tr key={session.id} className="border-b border-rock-100 last:border-0">
                <td className="px-6 py-4 font-semibold tabular-nums">
                  {formatDateRange(session.startDate, session.endDate)}
                </td>
                <td className="px-6 py-4">
                  {details.href ? (
                    <Link href={details.href} className="font-medium text-rock-900 hover:text-rope">
                      {details.name}
                    </Link>
                  ) : (
                    details.name
                  )}
                  {details.location && (
                    <span className="block text-[13px] text-rock-600">{details.location}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <SpotsBadge session={session} />
                </td>
                <td className="px-6 py-4 text-right font-semibold tabular-nums">
                  {formatPriceLabel(details.price, details.priceFrom)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-rock-100 sm:hidden">
        {sessions.map((session) => {
          const details = sessionDetails(session)
          return (
            <li key={session.id} className="flex flex-col gap-2 p-5">
              <span className="font-semibold tabular-nums">
                {formatDateRangeShort(session.startDate, session.endDate)}
              </span>
              {details.href ? (
                <Link
                  href={details.href}
                  className="text-[15px] text-rock-900 underline underline-offset-4"
                >
                  {details.name}
                </Link>
              ) : (
                <span className="text-[15px]">{details.name}</span>
              )}
              <div className="flex items-center justify-between gap-3">
                <SpotsBadge session={session} />
                <span className="font-semibold tabular-nums">
                  {formatPriceLabel(details.price, details.priceFrom)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
