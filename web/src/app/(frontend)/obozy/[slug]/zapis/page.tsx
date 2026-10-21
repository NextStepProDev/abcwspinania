import { notFound, redirect } from 'next/navigation'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { TextLink } from '@/components/AccountForm'
import type { SessionChoice } from '@/components/SessionChoices'
import { Container } from '@/components/Ui'
import { accountPageMetadata, getCurrentCustomer } from '@/lib/auth'
import { MAX_CHILDREN } from '@/lib/bookings'
import { getCamp, getSessionsForCamp } from '@/lib/content'
import { formatDateRange, formatSpotsLeft } from '@/lib/format'
import { CampBookingForm } from './CampBookingForm'

/** A form page — nothing for a search engine; the camp page is indexed. */
export function generateMetadata() {
  return accountPageMetadata('Zapis na obóz')
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session?: string }>
}

/**
 * The camp sign-up — step 1 of the school's procedure (20.10.2026): the
 * turnus, the children's names and the parent's contact. It reserves the
 * place; the rest of the child's details come with the registration form
 * linked in the confirmation email.
 *
 * Only for a camp (`kind = camp`): trips and recurring classes take no
 * bookings and go on to the contact form.
 */
export default async function CampBookingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const camp = await getCamp(slug)
  if (!camp) notFound()
  // The header's "Zapisz się" leads here from any `/obozy/…` page.
  if (camp.kind !== 'camp') redirect(`/kontakt?camp=${camp.slug}`)

  const [sessions, customer, { session: preselected }] = await Promise.all([
    getSessionsForCamp(camp.id),
    getCurrentCustomer(),
    searchParams,
  ])

  const choices: SessionChoice[] = sessions.map((s) => {
    const full = s.status === 'waitlist' || (typeof s.spotsLeft === 'number' && s.spotsLeft <= 0)
    return {
      id: s.id,
      dates: formatDateRange(s.startDate, s.endDate),
      spots: full ? 'brak miejsc — lista rezerwowa' : formatSpotsLeft(s.spotsLeft),
      full,
      note: s.note ?? null,
      spotsLeft: typeof s.spotsLeft === 'number' ? s.spotsLeft : null,
    }
  })

  return (
    <main>
      <Container className="pb-16 pt-8 lg:pb-24">
        <Breadcrumbs
          trail={[
            { label: 'Start', href: '/' },
            { label: 'Obozy i wyjazdy', href: '/obozy' },
            { label: camp.title, href: `/obozy/${camp.slug}` },
            { label: 'Zapis' },
          ]}
        />
        <div className="mx-auto mt-6 max-w-[640px]">
          <h1 className="text-balance text-[32px] leading-[1.1] lg:text-[40px]">
            Zapis: {camp.title}
          </h1>
          {choices.length === 0 ? (
            <p className="mt-4 text-[17px] leading-7 text-rock-600">
              Na razie nie ma otwartych turnusów tego obozu.{' '}
              <TextLink href={`/kontakt?camp=${camp.slug}`}>Napisz do nas</TextLink> — dopiszemy Cię
              do listy chętnych.
            </p>
          ) : (
            <>
              <p className="mt-3 text-[17px] leading-7 text-rock-600">
                Zapis rezerwuje miejsce. Potem dostaniesz mailem link do formularza rejestracyjnego
                (jednego dla wszystkich zapisanych dzieci), a po jego wypełnieniu — dane do przelewu
                zaliczki i umowę.
              </p>
              <div className="mt-8 rounded-2xl border border-rock-200 bg-white p-6 lg:p-8">
                <CampBookingForm
                  campId={camp.id}
                  sessions={choices}
                  preselected={Number(preselected) || null}
                  maxChildren={MAX_CHILDREN}
                  customer={
                    customer
                      ? {
                          name: `${customer.firstName} ${customer.lastName}`,
                          email: customer.email,
                          phone: customer.phone,
                        }
                      : null
                  }
                  loginHref={`/logowanie?next=/obozy/${camp.slug}/zapis`}
                />
              </div>
            </>
          )}
        </div>
      </Container>
    </main>
  )
}
