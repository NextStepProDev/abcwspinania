import type { CollectionConfig } from 'payload'

import { isAdmin } from '../lib/access'
import { publicUrl } from '../lib/email/links'
import { panelAccountChangedEmail } from '../lib/email/templates'

/** `req.context` key: this account's password is being changed in this update. */
const passwordChangedKey = (id: number | string) => `panelPasswordChanged:${id}`

/**
 * Admin panel accounts.
 *
 * A difference from Strapi worth remembering: there were TWO independent worlds
 * of users there (panel administrators and, separately, API users from the
 * users-permissions plugin) that knew nothing of each other. Here logging in is
 * an ordinary property of a collection (`auth: true`), so participant accounts
 * at the booking stage will simply be a second collection using the same
 * mechanism.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  // Polish labels — without them Payload derives the name from the slug and
  // "Users" stuck out in the menu next to "Kursy", "Opinie" and "Wiadomości".
  // The client operates this panel, not a developer.
  labels: {
    singular: 'Konto',
    plural: 'Konta panelu',
  },
  admin: {
    useAsTitle: 'email',
    group: 'System',
  },
  auth: {
    // Payload's default cookie has no `Secure` flag (`collections/config/
    // defaults.js`): the panel's login, unlike a participant's
    // (`Customers.ts`), could be sent over plain http. HSTS makes that
    // unlikely, not impossible — the temporary domain has no
    // `includeSubDomains` and a first visit comes before any HSTS (audit,
    // 25.10.2026). Locally the panel runs on plain http, hence the condition.
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  // School accounts only. Payload's default would be "anyone logged in",
  // which from the booking stage on includes participants. The very first
  // account is still created through the panel's first-user screen: Payload
  // registers it with access checks skipped.
  access: {
    admin: isAdmin,
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    // The owner is emailed after a change of password or address (decided
    // 13.10.2026). Payload's "Zmień hasło" does not ask for the current
    // password, so a panel left open on someone else's computer is enough to
    // take the account over — this is how the owner finds out. The email
    // points to "forgot password", whose link goes to the owner's inbox.
    //
    // The new password is only visible here, before Payload hashes it and
    // drops it from the data (`collections/operations/utilities/update.js`),
    // so this hook marks the change and `afterChange` sends. Keyed by id: one
    // request can update several accounts. A reset through the emailed link
    // runs no update hooks (`auth/operations/resetPassword.js`) and sends
    // nothing — that link already proved the inbox.
    beforeChange: [
      ({ data, operation, originalDoc, req }) => {
        if (
          operation === 'update' &&
          originalDoc &&
          typeof data.password === 'string' &&
          data.password
        ) {
          req.context[passwordChangedKey(originalDoc.id)] = true
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || !previousDoc) return doc
        const password = req.context[passwordChangedKey(doc.id)] === true
        const emailChanged = previousDoc.email !== doc.email
        if (!password && !emailChanged) return doc
        const user = req.user
        const byOwner = user?.collection === 'users' && user.id === doc.id
        const email = panelAccountChangedEmail({
          name: doc.name,
          password,
          newEmail: emailChanged ? doc.email : null,
          changedAt: new Date(),
          changedBy: user && !byOwner ? user.email : null,
          forgotUrl: `${publicUrl()}/admin/forgot`,
        })
        // The OLD address first: after a takeover that changed it, the old
        // one is the owner's. A failed email is logged; the change stays.
        const to = [...new Set([previousDoc.email, doc.email])]
        for (const address of to) {
          try {
            await req.payload.sendEmail({
              to: address,
              subject: email.subject,
              html: email.html,
              text: email.text,
            })
          } catch (err) {
            req.payload.logger.error({ err, user: doc.id }, 'panel account change email failed')
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Imię i nazwisko',
    },
  ],
}
