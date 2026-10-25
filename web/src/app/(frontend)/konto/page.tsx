import { redirect } from 'next/navigation'

import { FormDone, TextLink } from '@/components/AccountForm'
import { Container } from '@/components/Ui'
import { accountPageMetadata, getCurrentCustomer } from '@/lib/auth'
import { STATUS_FOR_PARTICIPANT } from '@/lib/bookings'
import { bookingsOf, type BookingRow } from '@/lib/participantBookings'
import { DetailsForm } from './DetailsForm'
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
  const { upcoming, archive } = await bookingsOf(customer.id)

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
            {upcoming.length === 0 && archive.length === 0 ? (
              <p className="mt-3 text-rock-600">
                Nie masz jeszcze zapisów. Gdy zapiszesz się na kurs albo obóz, zobaczysz tu termin i
                jego stan.
              </p>
            ) : (
              <>
                <BookingList
                  title="Nadchodzące"
                  items={upcoming}
                  empty="Brak nadchodzących zapisów."
                />
                {archive.length > 0 && <BookingList title="Archiwum" items={archive} />}
              </>
            )}
          </section>

          <section
            aria-labelledby="dane"
            className="rounded-2xl border border-rock-200 bg-white p-6 lg:p-8"
          >
            <h2 id="dane" className="text-[22px] leading-tight">
              Twoje dane
            </h2>
            <DetailsForm
              current={{
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone: customer.phone,
                email: customer.email,
              }}
            />
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

          <section aria-labelledby="usuniecie" className="px-1">
            <h2 id="usuniecie" className="text-[17px] font-semibold">
              Usunięcie konta
            </h2>
            <p className="mt-1 text-rock-600">
              Możesz w każdej chwili usunąć konto razem z jego danymi.{' '}
              <TextLink href="/konto/usun">Usuń konto</TextLink>
            </p>
          </section>
        </div>
      </Container>
    </main>
  )
}

function BookingList({
  title,
  items,
  empty,
}: {
  title: string
  items: BookingRow[]
  empty?: string
}) {
  return (
    <div className="mt-5">
      <h3 className="text-[15px] font-semibold text-rock-600">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-rock-600">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rock-100 px-4 py-3"
            >
              <span>
                <span className="block font-medium">
                  {item.child ? `${item.child} · ${item.title}` : item.title}
                </span>
                <span className="text-sm tabular-nums text-rock-600">{item.dates}</span>
                {item.payment && (
                  <span className="mt-1 block text-sm text-rock-600">{item.payment}</span>
                )}
              </span>
              <span className="flex flex-col items-end gap-1 text-sm text-rock-600">
                {STATUS_FOR_PARTICIPANT[item.status]}
                {item.form && (
                  <TextLink href={item.form.url}>
                    {item.form.done ? 'Popraw formularz' : 'Wypełnij formularz rejestracyjny'}
                  </TextLink>
                )}
                {item.contract && (
                  // A plain link: a file, not a page — `next/link` would prefetch it.
                  <a
                    href={item.contract}
                    className="font-medium text-rope underline-offset-4 hover:underline"
                  >
                    Pobierz umowę
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
