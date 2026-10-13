import { getPayload } from 'payload'
import config from '@payload-config'

import { AccountPage, FormDone, TextLink } from '@/components/AccountForm'
import { accountPageMetadata } from '@/lib/auth'
import { findByToken } from '@/lib/newsletter'
import { confirmNewsletter } from '../actions'
import { NewsletterButton } from '../NewsletterButton'

export function generateMetadata() {
  return accountPageMetadata('Potwierdzenie zapisu na newsletter')
}

type Props = { searchParams: Promise<{ token?: string; result?: string }> }

/** The link from the confirmation email: one button, see `../actions.ts` for why. */
export default async function ConfirmNewsletterPage({ searchParams }: Props) {
  const { token, result } = await searchParams

  if (result === 'confirmed') {
    return (
      <AccountPage title="Zapis potwierdzony">
        <FormDone title="Dzięki — jesteś na liście.">
          Odezwiemy się, gdy ruszą zapisy albo pojawi się nowy tekst. Każda wiadomość ma na dole
          link do wypisania się.
        </FormDone>
      </AccountPage>
    )
  }
  if (result === 'error') {
    return (
      <AccountPage title="Coś poszło nie tak">
        <FormDone title="Nie udało się potwierdzić zapisu.">
          Spróbuj ponownie za chwilę — link z maila dalej działa.
        </FormDone>
      </AccountPage>
    )
  }

  const entry =
    typeof token === 'string' && token
      ? await getPayload({ config })
          .then((payload) => findByToken(payload, token))
          .catch(() => null)
      : null

  if (entry?.status === 'subscribed') {
    return (
      <AccountPage title="Zapis potwierdzony">
        <FormDone title="Ten adres jest już na liście.">Nic więcej nie musisz robić.</FormDone>
      </AccountPage>
    )
  }

  if (!entry || entry.status !== 'pending' || result === 'invalid') {
    return (
      <AccountPage title="Link nie działa">
        <FormDone title="Ten link jest nieważny albo wygasł.">
          Niepotwierdzone zapisy usuwamy po 7 dniach. Zapisz się jeszcze raz formularzem na dole
          dowolnej strony — przyjdzie nowy link. <TextLink href="/">Strona główna</TextLink>
        </FormDone>
      </AccountPage>
    )
  }

  return (
    <AccountPage
      title="Potwierdź zapis na newsletter"
      intro={`Adres ${entry.email} — kliknij, żeby dostawać wiadomości o terminach kursów, obozach i nowych tekstach.`}
    >
      <form action={confirmNewsletter}>
        <input type="hidden" name="token" value={token} />
        <NewsletterButton label="Potwierdzam zapis" busyLabel="Zapisuję…" />
      </form>
    </AccountPage>
  )
}
