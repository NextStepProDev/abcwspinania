import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { TextLink } from '@/components/AccountForm'
import { Container } from '@/components/Ui'
import { accountPageMetadata, getCurrentCustomer } from '@/lib/auth'
import { getCourse, getSessionsForCourse } from '@/lib/content'
import { formatDateRange, formatSpotsLeft } from '@/lib/format'
import type { SessionChoice } from '@/components/SessionChoices'
import { BookingForm } from './BookingForm'

/** A form page — nothing for a search engine; the course page is indexed. */
export function generateMetadata() {
  return accountPageMetadata('Zapis na kurs')
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session?: string }>
}

/**
 * The course booking form (ZAKRES 4b, "zapis w 10 sekund"). Logged in, it is
 * the session and one tick; without an account, the contact fields too, with
 * an option to create one from them.
 */
export default async function BookingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course) notFound()

  const [sessions, customer, { session: preselected }] = await Promise.all([
    getSessionsForCourse(course.id),
    getCurrentCustomer(),
    searchParams,
  ])

  // `spotsLeft` is already counted from the bookings (lib/bookingEffects.ts).
  const choices: SessionChoice[] = sessions.map((s) => {
    const full = s.status === 'waitlist' || (typeof s.spotsLeft === 'number' && s.spotsLeft <= 0)
    return {
      id: s.id,
      dates: formatDateRange(s.startDate, s.endDate),
      spots: full ? 'brak miejsc — lista rezerwowa' : formatSpotsLeft(s.spotsLeft),
      full,
      note: s.note ?? null,
    }
  })

  return (
    <main>
      <Container className="pb-16 pt-8 lg:pb-24">
        <Breadcrumbs
          trail={[
            { label: 'Start', href: '/' },
            { label: 'Kursy', href: '/kursy' },
            { label: course.title, href: `/kursy/${course.slug}` },
            { label: 'Zapis' },
          ]}
        />
        <div className="mx-auto mt-6 max-w-[640px]">
          <h1 className="text-balance text-[32px] leading-[1.1] lg:text-[40px]">
            Zapis: {course.title}
          </h1>
          {choices.length === 0 ? (
            <p className="mt-4 text-[17px] leading-7 text-rock-600">
              Na razie nie ma otwartych terminów tego kursu.{' '}
              <TextLink href={`/kontakt?course=${course.slug}`}>Napisz do nas</TextLink> — dopiszemy
              Cię do listy chętnych na kolejny.
            </p>
          ) : (
            <>
              <p className="mt-3 text-[17px] leading-7 text-rock-600">
                Zgłoszenie nie jest wiążące. Potwierdzimy miejsce i prześlemy szczegóły płatności.
              </p>
              <div className="mt-8 rounded-2xl border border-rock-200 bg-white p-6 lg:p-8">
                <BookingForm
                  courseId={course.id}
                  sessions={choices}
                  preselected={Number(preselected) || null}
                  customer={
                    customer
                      ? {
                          name: `${customer.firstName} ${customer.lastName}`,
                          email: customer.email,
                          phone: customer.phone,
                        }
                      : null
                  }
                  loginHref={`/logowanie?next=/kursy/${course.slug}/zapis`}
                />
              </div>
            </>
          )}
        </div>
      </Container>
    </main>
  )
}
