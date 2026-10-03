import { getPayload } from 'payload'
import config from '@payload-config'

import { AccountPage, FormDone, TextLink } from '@/components/AccountForm'
import { accountPageMetadata } from '@/lib/auth'
import { findByToken } from '@/lib/newsletter'
import { unsubscribeNewsletter } from '../actions'
import { NewsletterButton } from '../NewsletterButton'

export function generateMetadata() {
  return accountPageMetadata('Wypisanie z newslettera')
}

type Props = { searchParams: Promise<{ token?: string; result?: string }> }

/** The link at the bottom of every newsletter: one button, see `../actions.ts` for why. */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { token, result } = await searchParams

  if (result === 'done') {
    return (
      <AccountPage title="Wypisano">
        <FormDone title="Nie wyślemy już newslettera na ten adres.">
          Zmienisz zdanie — zapisz się ponownie formularzem na dole dowolnej strony.{' '}
          <TextLink href="/">Strona główna</TextLink>
        </FormDone>
      </AccountPage>
    )
  }
  if (result === 'error') {
    return (
      <AccountPage title="Coś poszło nie tak">
        <FormDone title="Nie udało się wypisać adresu.">
          Spróbuj ponownie za chwilę albo odpowiedz na dowolny newsletter — wypiszemy Cię ręcznie.
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

  if (entry?.status === 'unsubscribed') {
    return (
      <AccountPage title="Wypisano">
        <FormDone title="Ten adres jest już wypisany.">Nic więcej nie musisz robić.</FormDone>
      </AccountPage>
    )
  }

  if (!entry || result === 'invalid') {
    return (
      <AccountPage title="Link nie działa">
        <FormDone title="Nie rozpoznajemy tego linku.">
          Odpowiedz na newsletter, z którego przychodzisz — wypiszemy Cię ręcznie.{' '}
          <TextLink href="/kontakt">Kontakt</TextLink>
        </FormDone>
      </AccountPage>
    )
  }

  return (
    <AccountPage
      title="Wypisać się z newslettera?"
      intro={`Adres ${entry.email} przestanie dostawać newsletter ABC Wspinania. Wiadomości o kursach, na które masz zapis, będą przychodzić dalej.`}
    >
      <form action={unsubscribeNewsletter}>
        <input type="hidden" name="token" value={token} />
        <NewsletterButton label="Wypisz mnie" busyLabel="Wypisuję…" />
      </form>
    </AccountPage>
  )
}
