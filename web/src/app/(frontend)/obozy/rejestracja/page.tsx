import { getPayload } from 'payload'
import config from '@payload-config'

import { TextLink } from '@/components/AccountForm'
import { Container } from '@/components/Ui'
import { accountPageMetadata } from '@/lib/auth'
import { joinNames } from '@/lib/campPayment'
import { childName, findByToken, openChildren, registrationOpen } from '@/lib/campRegistration'
import { formatDateRange } from '@/lib/format'
import { RegistrationForm } from './RegistrationForm'

/** Reached only from an email link — nothing for a search engine. */
export function generateMetadata() {
  return accountPageMetadata('Formularz rejestracyjny')
}

type Props = { searchParams: Promise<{ token?: string }> }

/**
 * The camp registration form, opened from the link in the parent's email
 * (step 2 of the school's procedure, 20.10.2026) — one form for the
 * children signed up together (21.10.2026). The token in the address is the
 * key — no account. It works from the sign-up until the camp starts,
 * so the parent can come back and correct the form (new medication the week
 * before); the saved answers are filled in again.
 *
 * Read with the database directly, never cached: the page shows a child's
 * health data to whoever holds the link, and only to them.
 */
export const dynamic = 'force-dynamic'

export default async function RegistrationPage({ searchParams }: Props) {
  const { token = '' } = await searchParams
  const payload = await getPayload({ config })
  const ctx = await findByToken(payload, token).catch(() => null)
  const state = ctx ? registrationOpen(ctx) : null
  const open = ctx ? openChildren(ctx) : []
  // The shared answers (address, invoice) are copied onto each child; any one carries them.
  const lead = open.find((c) => c.booking.registeredAt)?.booking

  return (
    <main>
      <Container className="pb-16 pt-8 lg:pb-24">
        <div className="mx-auto mt-6 max-w-[640px]">
          <h1 className="text-balance text-[32px] leading-[1.1] lg:text-[40px]">
            Formularz rejestracyjny
          </h1>
          {!ctx ? (
            <p className="mt-4 text-[17px] leading-7 text-rock-600">
              Ten link nie działa — mógł zostać skopiowany niecały. Otwórz go jeszcze raz z maila
              albo <TextLink href="/kontakt">napisz do nas</TextLink>, a wyślemy nowy.
            </p>
          ) : (
            <>
              <p className="mt-3 text-[17px] leading-7 text-rock-600">
                {joinNames(
                  'pl',
                  (open.length ? open : ctx.children).map((c) => childName(c.booking)),
                )}{' '}
                · {ctx.camp?.title} · {formatDateRange(ctx.session.startDate, ctx.session.endDate)}
              </p>
              {state === 'open' ? (
                <div className="mt-8 rounded-2xl border border-rock-200 bg-white p-6 lg:p-8">
                  <RegistrationForm
                    token={token}
                    childrenToFill={open.map(({ booking, registration }) => ({
                      id: booking.id,
                      name: childName(booking),
                      saved: registration
                        ? {
                            pesel: registration.pesel,
                            height: registration.heightCm ? String(registration.heightCm) : '',
                            allergies: registration.allergies ?? '',
                            medications: registration.medications ?? '',
                            diet: registration.diet ?? '',
                            conditions: registration.conditions ?? '',
                            photoConsent: Boolean(booking.photoConsent),
                          }
                        : null,
                    }))}
                    shared={
                      lead?.registeredAt
                        ? {
                            street: lead.addressStreet ?? '',
                            postcode: lead.addressPostcode ?? '',
                            city: lead.addressCity ?? '',
                            invoiceRequested: Boolean(lead.invoiceRequested),
                            invoiceCompanyName: lead.invoiceCompanyName ?? '',
                            invoiceNip: lead.invoiceNip ?? '',
                            invoiceCompanyAddress: lead.invoiceCompanyAddress ?? '',
                          }
                        : null
                    }
                  />
                </div>
              ) : (
                <p className="mt-6 text-[17px] leading-7 text-rock-600">
                  {state === 'waitlist'
                    ? 'Dziecko jest na liście rezerwowej. Gdy zwolni się miejsce, wyślemy mail — wtedy formularz się otworzy.'
                    : state === 'cancelled'
                      ? 'Ten zapis został anulowany, więc formularza nie trzeba już wypełniać.'
                      : 'Obóz już się zaczął — formularza nie można już zmienić. Ważna jest karta kwalifikacyjna przywieziona na obóz.'}{' '}
                  Pytania? <TextLink href="/kontakt">Napisz do nas</TextLink>.
                </p>
              )}
            </>
          )}
        </div>
      </Container>
    </main>
  )
}
