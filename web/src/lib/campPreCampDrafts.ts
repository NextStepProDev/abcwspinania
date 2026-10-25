import type { Payload } from 'payload'

import { recipientsOf } from '@/lib/broadcastSender'
import { campMailbox, campSender } from '@/lib/campPayment'
import {
  DEFAULT_PRE_CAMP_TEMPLATE,
  PRE_CAMP_REMINDER_DAYS,
  fillPreCampTemplate,
  preCampDueWhere,
  preCampSubject,
  templateToRichText,
} from '@/lib/campPreCamp'
import { publicUrl } from '@/lib/email/links'
import { preCampDraftNotification } from '@/lib/email/templates'
import { formatDateRange } from '@/lib/format'
import type { Broadcast } from '@/payload-types'

/**
 * The daily sweep behind `campPreCamp.ts`: for each camp turnus that starts
 * within the days set in "Ustawienia obozów", a draft "Wysyłka" to its
 * parents from the template, and an email to the camp mailbox saying it
 * waits. Never sends to parents — the draft has blanks only Krzysiek can fill.
 *
 * The turnus is marked (`preCampDraftAt`) once the draft exists, before the
 * email: a failed email must not make tomorrow's sweep add a second draft.
 * A turnus nobody has a place on yet is left unmarked and checked again the
 * next day.
 */
export async function preparePreCampDrafts(
  payload: Payload,
  // Tests narrow the sweep to their own turnusy — the dev database has others.
  only?: number[],
): Promise<void> {
  const config = await payload
    .findGlobal({ slug: 'camp-config', depth: 0, overrideAccess: true })
    .catch(() => null)
  const days = config?.preCampReminderDays ?? PRE_CAMP_REMINDER_DAYS
  const template = config?.preCampTemplate?.trim() || DEFAULT_PRE_CAMP_TEMPLATE

  const due = preCampDueWhere(new Date(), days)
  const { docs } = await payload.find({
    collection: 'sessions',
    where: only ? { and: [due, { id: { in: only } }] } : due,
    pagination: false,
    depth: 1,
    joins: false,
    overrideAccess: true,
  })
  for (const session of docs) {
    try {
      const camp = typeof session.camp === 'object' ? session.camp : null
      // Trips and regular classes have no packing list or qualification card.
      if (!camp || camp.kind !== 'camp') continue
      const audience: Pick<Broadcast, 'audience' | 'session' | 'includeWaitlist'> = {
        audience: 'session',
        session: session.id,
        includeWaitlist: false,
      }
      const recipients = await recipientsOf(payload, audience)
      if (recipients.length === 0) continue

      const draft = await payload.create({
        collection: 'broadcasts',
        data: {
          audience: 'session',
          session: session.id,
          includeWaitlist: false,
          attachQualificationCard: true,
          status: 'draft',
          subject: preCampSubject(camp.title),
          content: templateToRichText(
            fillPreCampTemplate(template, {
              title: camp.title,
              ownSleepingBags: Boolean(camp.ownSleepingBags),
            }),
          ) as Broadcast['content'],
        },
        overrideAccess: true,
      })
      // Straight to the database: the collection's hooks would recount places.
      await payload.db.updateOne({
        collection: 'sessions',
        id: session.id,
        data: { preCampDraftAt: new Date().toISOString() },
      })

      const to = campMailbox()
      if (!to) continue
      await payload
        .sendEmail({
          to,
          from: campSender(),
          ...preCampDraftNotification({
            campTitle: camp.title,
            dates: formatDateRange(session.startDate, session.endDate),
            recipients: recipients.length,
            adminUrl: `${publicUrl()}/admin/collections/broadcasts/${draft.id}`,
          }),
        })
        .catch((error) =>
          payload.logger.warn({ err: error }, `Pre-camp notice for session ${session.id} failed`),
        )
    } catch (error) {
      payload.logger.warn({ err: error }, `Pre-camp draft for session ${session.id} failed`)
    }
  }
}
