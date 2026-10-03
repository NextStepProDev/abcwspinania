import { getPayload } from 'payload'
import config from '@payload-config'

import { AccountPage, FormDone, TextLink } from '@/components/AccountForm'
import { VERIFY_LINK_HOURS } from '@/collections/Customers'
import { accountPageMetadata } from '@/lib/auth'
import { ResendLinkForm } from '../ResendLinkForm'
import { claimBookings } from '@/lib/bookingEffects'
import { isExpired } from '@/lib/expiry'
import { pluralPl } from '@/lib/format'

export function generateMetadata() {
  return accountPageMetadata('Potwierdzenie adresu')
}

type Props = { searchParams: Promise<{ token?: string }> }

type Outcome = 'confirmed' | 'expired' | 'invalid'

/**
 * The link from the confirmation email.
 *
 * Payload's token never expires, so the age is checked HERE, against
 * `verificationSentAt` (set on every sending, `lib/accountEmails.ts`; an
 * account from before that field falls back to `createdAt`). An expired link
 * confirms nothing, and the page offers a fresh one.
 *
 * Confirmed on opening the page: the token is single-use and long (40 hex
 * characters, `collections/operations/create.js`), and a mail scanner that
 * opens the link first only confirms the address of the person it scans for.
 */
async function confirm(token: string): Promise<Outcome> {
  const payload = await getPayload({ config })
  // ⚠️ `overrideAccess` and `showHiddenFields`: the token is a hidden field
  // and an anonymous visitor reads no accounts. Only the account holding
  // exactly this token is looked at, and nothing about it is shown.
  const { docs } = await payload.find({
    collection: 'customers',
    where: { _verificationToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  const account = docs[0]
  if (!account) return 'invalid'
  const sentAt = account.verificationSentAt ?? account.createdAt
  if (isExpired(sentAt, VERIFY_LINK_HOURS, new Date())) return 'expired'
  const confirmed = await payload.verifyEmail({ collection: 'customers', token })
  if (!confirmed) return 'invalid'
  // The address is proven — bookings made with it join the account.
  await claimBookings(payload, account).catch((e) => console.error('claim failed:', e))
  return 'confirmed'
}

export default async function ConfirmPage({ searchParams }: Props) {
  const { token } = await searchParams
  let outcome: Outcome = 'invalid'
  if (typeof token === 'string' && token) {
    try {
      outcome = await confirm(token)
    } catch {
      // An unknown or already used token — shown below, not an error page.
    }
  }

  if (outcome === 'confirmed') {
    return (
      <AccountPage title="Adres potwierdzony">
        <FormDone title="Gotowe — możesz się zalogować.">
          <TextLink href="/logowanie">Przejdź do logowania</TextLink>
        </FormDone>
      </AccountPage>
    )
  }

  return (
    <AccountPage title="Link nie działa">
      {outcome === 'expired' && token ? (
        <div className="flex flex-col gap-4">
          <FormDone
            title={`Ten link wygasł — działa ${VERIFY_LINK_HOURS} ${pluralPl(VERIFY_LINK_HOURS, 'godzinę', 'godziny', 'godzin')} od wysłania.`}
          >
            Wyślemy nowy na ten sam adres.
          </FormDone>
          <ResendLinkForm token={token} />
        </div>
      ) : (
        <FormDone title="Ten link jest nieważny albo został już użyty.">
          Jeśli adres był już potwierdzony, po prostu{' '}
          <TextLink href="/logowanie">zaloguj się</TextLink>. Jeśli nie — zaloguj się mimo to:
          pojawi się przycisk wysłania nowego linku.
        </FormDone>
      )}
    </AccountPage>
  )
}
