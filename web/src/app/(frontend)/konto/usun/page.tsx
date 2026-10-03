import { redirect } from 'next/navigation'

import { AccountPage, TextLink } from '@/components/AccountForm'
import { accountPageMetadata, getCurrentCustomer } from '@/lib/auth'
import { bookingsOf } from '@/lib/participantBookings'
import { DeleteAccountForm } from './DeleteAccountForm'

export function generateMetadata() {
  return accountPageMetadata('Usuń konto')
}

/**
 * Says what goes and what stays BEFORE anything is deleted — above all that
 * an upcoming course is not cancelled by deleting the account
 * (`deleteAccount` in `../actions.ts`).
 */
export default async function DeleteAccountPage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/logowanie?next=/konto/usun')
  const { upcoming } = await bookingsOf(customer.id)

  return (
    <AccountPage
      title="Usuń konto"
      intro={`Konto ${customer.email} zostanie usunięte od razu i na zawsze — tego nie da się cofnąć.`}
      footer={<TextLink href="/konto">Wróć do Mojego konta</TextLink>}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 text-rock-600">
          <p>
            <strong className="text-rock-900">Usuniemy:</strong> konto — imię, nazwisko, telefon,
            adres e-mail, ustawienia i hasło. Nie zalogujesz się już na nie.
          </p>
          <p>
            <strong className="text-rock-900">Zostaną w szkole:</strong> Twoje zapisy na kursy, już
            bez powiązania z kontem. Dotyczą organizacji zajęć i rozliczeń. Jeśli chcesz usunąć
            także je, napisz do nas — <TextLink href="/kontakt">kontakt</TextLink>.
          </p>
          {upcoming.length > 0 && (
            <p
              role="note"
              className="rounded-lg border border-rope bg-rope-soft px-4 py-3 text-rope-dark"
            >
              Masz {upcoming.length === 1 ? 'nadchodzący zapis' : 'nadchodzące zapisy'} (
              {upcoming.map((b) => `${b.title}, ${b.dates}`).join('; ')}).{' '}
              {upcoming.length === 1
                ? 'Usunięcie konta go nie odwołuje'
                : 'Usunięcie konta ich nie odwołuje'}{' '}
              — żeby zrezygnować, napisz do nas.
            </p>
          )}
          <p>Newslettera to nie dotyczy — wypiszesz się linkiem na dole każdej wiadomości.</p>
        </div>
        <DeleteAccountForm />
      </div>
    </AccountPage>
  )
}
