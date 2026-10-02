import { AccountPage, TextLink } from '@/components/AccountForm'
import { accountPageMetadata } from '@/lib/auth'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export function generateMetadata() {
  return accountPageMetadata('Nie pamiętam hasła')
}

export default function ForgotPasswordPage() {
  return (
    <AccountPage
      title="Nie pamiętam hasła"
      intro="Podaj adres, na który jest założone konto — wyślemy link do ustawienia nowego hasła."
      footer={
        <p>
          <TextLink href="/logowanie">Wróć do logowania</TextLink>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AccountPage>
  )
}
