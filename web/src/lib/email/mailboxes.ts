/**
 * Which school mailbox each kind of email belongs to (decided 26.10.2026):
 * courses → `COURSE_EMAIL` (kursy@), camps → `CAMP_EMAIL` (obozy@),
 * everything else — accounts, the newsletter, the contact form, broadcasts
 * to everyone — → `EMAIL_FROM` and `ADMIN_NOTIFY_EMAIL` (biuro@).
 *
 * A mailbox is three things at once: the sender's address, where a reply
 * goes, and where the school's notification about it arrives. Each falls
 * back to the general one while its variable is empty — which is the case
 * locally and in CI, so nothing changes there.
 *
 * Pure: the environment comes in as an argument, for `node --test`.
 */

export type MailKind = 'course' | 'camp' | 'general'

export interface MailSender {
  name: string
  address: string
}

type Env = Record<string, string | undefined>

/** A parent sees at once what the email is about (decided 21.10.2026). */
export const CAMP_SENDER_NAME = 'ABC Wspinania · Obozy'

const NAMES: Record<MailKind, string> = {
  general: 'ABC Wspinania',
  course: 'ABC Wspinania',
  camp: CAMP_SENDER_NAME,
}

function domainOf(address: string | undefined): string | null {
  const at = address?.lastIndexOf('@') ?? -1
  return at > 0
    ? address!
        .slice(at + 1)
        .trim()
        .toLowerCase()
    : null
}

/**
 * Whether `address` is on the same domain as `sender` — the domain
 * authenticated in Brevo (SPF, DKIM). Brevo refuses any other sender, or the
 * email lands in spam, so only such an address may be a sender.
 */
export function sameDomain(address: string | undefined, sender: string | undefined): boolean {
  const a = domainOf(address)
  return a !== null && a === domainOf(sender)
}

function own(kind: MailKind, env: Env): string | undefined {
  if (kind === 'course') return env.COURSE_EMAIL?.trim() || undefined
  if (kind === 'camp') return env.CAMP_EMAIL?.trim() || undefined
  return undefined
}

/**
 * Where the school is told about it and where a reply goes: the kind's own
 * mailbox, else the general one. Undefined when neither is set.
 */
export function mailboxFor(kind: MailKind, env: Env = process.env): string | undefined {
  return own(kind, env) || env.ADMIN_NOTIFY_EMAIL?.trim() || undefined
}

/**
 * Who the email is from. The kind's mailbox is the address only when it is on
 * the domain of `EMAIL_FROM` — a mailbox set before the school's domain is
 * authenticated in Brevo (or a private Gmail typed in locally) must not
 * become a sender Brevo refuses. Then the general address, under the kind's
 * name.
 */
export function senderFor(kind: MailKind, env: Env = process.env): MailSender {
  const general = env.EMAIL_FROM?.trim() || 'biuro@abcwspinania.info'
  const mailbox = own(kind, env)
  const name = kind === 'general' ? env.EMAIL_FROM_NAME?.trim() || NAMES.general : NAMES[kind]
  return { name, address: mailbox && sameDomain(mailbox, general) ? mailbox : general }
}
