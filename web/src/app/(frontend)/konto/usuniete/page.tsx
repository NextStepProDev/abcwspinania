import { AccountPage, FormDone, TextLink } from '@/components/AccountForm'
import { accountPageMetadata } from '@/lib/auth'

export function generateMetadata() {
  return accountPageMetadata('Konto usunięte')
}

/** Where "Usuń konto" lands — the account and its login are already gone. */
export default function AccountDeletedPage() {
  return (
    <AccountPage title="Konto usunięte">
      <FormDone title="Twoje konto zostało usunięte.">
        Wysłaliśmy potwierdzenie na adres konta. <TextLink href="/">Strona główna</TextLink>
      </FormDone>
    </AccountPage>
  )
}
