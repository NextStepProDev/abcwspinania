import { redirect } from 'next/navigation'

import { AccountPage, TextLink } from '@/components/AccountForm'
import { accountPageMetadata, getCurrentCustomer } from '@/lib/auth'
import { safeNextPath } from '@/lib/validation'
import { LoginForm } from './LoginForm'

export function generateMetadata() {
  return accountPageMetadata('Logowanie')
}

type Props = { searchParams: Promise<{ next?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next)
  // Already logged in — the form would only confuse.
  if (await getCurrentCustomer()) redirect(next)

  return (
    <AccountPage
      title="Zaloguj się"
      intro="Konto pokazuje Twoje zapisy na kursy i obozy. Na obóz zapisujesz się po zalogowaniu."
      footer={
        <>
          <p>
            Nie masz konta? <TextLink href="/rejestracja">Załóż je</TextLink>
          </p>
          <p>
            <TextLink href="/konto/nie-pamietam-hasla">Nie pamiętam hasła</TextLink>
          </p>
          <p>
            <TextLink href="/konto/wyslij-link">Nie dotarł mail z potwierdzeniem?</TextLink>
          </p>
        </>
      }
    >
      <LoginForm next={next} />
    </AccountPage>
  )
}
