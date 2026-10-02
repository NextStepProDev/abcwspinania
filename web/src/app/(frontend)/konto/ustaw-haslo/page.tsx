import { AccountPage, FormDone, TextLink } from '@/components/AccountForm'
import { accountPageMetadata } from '@/lib/auth'
import { SetPasswordForm } from './SetPasswordForm'

export function generateMetadata() {
  return accountPageMetadata('Ustaw hasło')
}

type Props = { searchParams: Promise<{ token?: string }> }

/**
 * The link from the "set a new password" email. The page only shows the
 * form; the token is checked when the form is sent, so opening the link (or a
 * mail scanner opening it) spends nothing.
 */
export default async function SetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams

  return (
    <AccountPage title="Ustaw nowe hasło">
      {typeof token === 'string' && token ? (
        <SetPasswordForm token={token} />
      ) : (
        <FormDone title="Brakuje kodu z maila.">
          Otwórz link prosto z wiadomości albo{' '}
          <TextLink href="/konto/nie-pamietam-hasla">poproś o nowy</TextLink>.
        </FormDone>
      )}
    </AccountPage>
  )
}
