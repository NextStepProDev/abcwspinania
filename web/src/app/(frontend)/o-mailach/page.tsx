import { AccountPage, TextLink } from '@/components/AccountForm'
import { accountPageMetadata } from '@/lib/auth'

export function generateMetadata() {
  return accountPageMetadata('Maile od ABC Wspinania')
}

/**
 * Where "Anuluj subskrypcję" leads on an email that is not the newsletter —
 * a booking's confirmation, a status change, an account link. Those cannot
 * be unsubscribed from: they ARE the booking or the account. The header that
 * brings people here replaces Brevo's own, whose click would have stopped
 * every later email to the address (`withServiceUnsubscribe` in
 * `lib/email/brevo.ts`).
 */
export default function ServiceEmailsPage() {
  return (
    <AccountPage title="Maile o zapisie i koncie">
      <div className="flex flex-col gap-3 text-[17px] leading-7 text-rock-600">
        <p>
          Ten mail dotyczył Twojego zapisu albo konta — potwierdzenia, zmiany statusu, płatności.
          Takie wiadomości przychodzą tylko w tej sprawie, dopóki trwa, więc nie ma z nich
          wypisania: nic się nie zmieniło.
        </p>
        <p>
          Chcesz zrezygnować z zapisu? <TextLink href="/kontakt">Napisz do nas</TextLink> albo
          odpowiedz na tamten mail. Konto usuniesz w <TextLink href="/konto">Moim koncie</TextLink>.
        </p>
        <p>Z newslettera wypiszesz się linkiem na dole każdego newslettera.</p>
      </div>
    </AccountPage>
  )
}
