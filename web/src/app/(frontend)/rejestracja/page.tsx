import { redirect } from 'next/navigation'

import { AccountPage, TextLink } from '@/components/AccountForm'
import { accountPageMetadata, getCurrentCustomer } from '@/lib/auth'
import { RegisterForm } from './RegisterForm'

export function generateMetadata() {
  return accountPageMetadata('Załóż konto')
}

export default async function RegisterPage() {
  if (await getCurrentCustomer()) redirect('/konto')

  return (
    <AccountPage
      title="Załóż konto"
      intro="Z kontem nie wpisujesz danych przy każdym zapisie, a wszystkie zapisy masz w jednym miejscu. Na kurs możesz się zapisać także bez konta."
      footer={
        <p>
          Masz już konto? <TextLink href="/logowanie">Zaloguj się</TextLink>
        </p>
      }
    >
      <RegisterForm />
    </AccountPage>
  )
}
