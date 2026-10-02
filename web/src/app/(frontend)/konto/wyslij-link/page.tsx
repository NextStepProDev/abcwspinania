import { AccountPage, TextLink } from '@/components/AccountForm'
import { VERIFY_LINK_HOURS } from '@/collections/Customers'
import { accountPageMetadata } from '@/lib/auth'
import { ResendByEmailForm } from './ResendByEmailForm'

export function generateMetadata() {
  return accountPageMetadata('Wyślij link ponownie')
}

/**
 * "The confirmation email never came" — a new link by address alone. The
 * same action as the button after login (`resendVerification`): it answers
 * identically whether the address has an account or not, so this page tells
 * nobody who studies here.
 */
export default function ResendLinkPage() {
  return (
    <AccountPage
      title="Wyślij link ponownie"
      intro={`Podaj adres, na który jest założone konto — wyślemy nowy link do potwierdzenia. Działa ${VERIFY_LINK_HOURS} godz., poprzednie linki przestaną działać.`}
      footer={
        <p>
          <TextLink href="/logowanie">Wróć do logowania</TextLink>
        </p>
      }
    >
      <ResendByEmailForm />
    </AccountPage>
  )
}
