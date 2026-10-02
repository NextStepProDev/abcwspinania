import { redirect } from 'next/navigation'

import { FormDone } from '@/components/AccountForm'
import { Container } from '@/components/Ui'
import { accountPageMetadata, getCurrentCustomer } from '@/lib/auth'
import { LanguageForm } from './LanguageForm'
import { LogoutButton } from './LogoutButton'

export function generateMetadata() {
  return accountPageMetadata('Moje konto')
}

type Props = { searchParams: Promise<{ password?: string }> }

export default async function AccountPage({ searchParams }: Props) {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/logowanie?next=/konto')
  const { password } = await searchParams

  return (
    <main>
      <Container className="pb-16 pt-10 lg:pb-24 lg:pt-14">
        <div className="mx-auto flex max-w-[760px] flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[32px] leading-[1.1] lg:text-[40px]">Moje konto</h1>
              <p className="mt-2 text-[17px] text-rock-600">
                {customer.firstName} {customer.lastName} · {customer.email}
              </p>
            </div>
            <LogoutButton />
          </div>

          {password === 'set' && (
            <div className="rounded-2xl border border-rope bg-rope-soft p-5 text-rope-dark">
              <FormDone title="Nowe hasło ustawione. Możesz korzystać z konta." />
            </div>
          )}

          <section
            aria-labelledby="zapisy"
            className="rounded-2xl border border-rock-200 bg-white p-6 lg:p-8"
          >
            <h2 id="zapisy" className="text-[22px] leading-tight">
              Moje zapisy
            </h2>
            {/* Filled in by the booking stage: upcoming sign-ups and an archive. */}
            <p className="mt-3 text-rock-600">
              Nie masz jeszcze zapisów. Gdy zapiszesz się na kurs albo obóz, zobaczysz tu termin i
              jego stan.
            </p>
          </section>

          <section
            aria-labelledby="ustawienia"
            className="rounded-2xl border border-rock-200 bg-white p-6 lg:p-8"
          >
            <h2 id="ustawienia" className="text-[22px] leading-tight">
              Wiadomości od nas
            </h2>
            <LanguageForm current={customer.language} />
          </section>
        </div>
      </Container>
    </main>
  )
}
