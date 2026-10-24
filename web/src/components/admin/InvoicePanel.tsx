'use client'

import { useEffect, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'

import { CAMP_ORGANISER_REGISTRY } from '@/lib/campPayment'

/**
 * "Dane do faktury" on a camp booking's page — shown when the parent ticked
 * "Potrzebuję faktury" (decided 21.10.2026). The school issues the invoice
 * itself, in its own program; this puts what Krzysiek listed in one place to
 * copy from: the parent with the address, the child, the birth date, the
 * dates (the booking's label carries them) and the organiser's registry
 * number, and the turnus's number in the kuratorium's register (a field of
 * the turnus, read once from its REST). A company's name, NIP and address
 * replace the parent when the parent asked for an invoice to a company.
 *
 * Read from the form being edited (`useFormFields`), so it follows unsaved
 * changes too.
 */
export function InvoicePanel() {
  const values = useFormFields(([fields]) => ({
    invoiceRequested: fields.invoiceRequested?.value,
    firstName: fields.firstName?.value,
    lastName: fields.lastName?.value,
    street: fields.addressStreet?.value,
    postcode: fields.addressPostcode?.value,
    city: fields.addressCity?.value,
    childFirstName: fields.childFirstName?.value,
    childLastName: fields.childLastName?.value,
    childBirthDate: fields.childBirthDate?.value,
    label: fields.label?.value,
    session: fields.session?.value,
    companyName: fields.invoiceCompanyName?.value,
    nip: fields.invoiceNip?.value,
    companyAddress: fields.invoiceCompanyAddress?.value,
  }))
  const sessionId = typeof values.session === 'number' ? values.session : null
  const [kuratorium, setKuratorium] = useState<string | null>(null)
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/sessions/${sessionId}?depth=0`, { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { kuratoriumNumber?: string | null } | null) =>
        setKuratorium(body?.kuratoriumNumber ?? ''),
      )
      .catch(() => setKuratorium(''))
  }, [sessionId])
  if (!values.invoiceRequested) return null

  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const birth = str(values.childBirthDate)
    ? new Date(str(values.childBirthDate)).toLocaleDateString('pl-PL', {
        timeZone: 'Europe/Warsaw',
      })
    : ''
  // "Zosia Nowak · 26 cze–3 lip 2027 · Obóz …" — the dates and the camp.
  const [, dates = '', camp = ''] = str(values.label).split(' · ')
  const address = [str(values.street), `${str(values.postcode)} ${str(values.city)}`.trim()]
    .filter(Boolean)
    .join(', ')
  const parent = `${str(values.firstName)} ${str(values.lastName)}`.trim()
  const buyer: [string, string][] = str(values.nip)
    ? [
        ['Nabywca (firma)', str(values.companyName)],
        ['NIP', str(values.nip)],
        ['Adres firmy', str(values.companyAddress)],
        ['Rodzic', parent],
      ]
    : [
        ['Nabywca (rodzic)', parent],
        ['Adres', address || '— rodzic jeszcze nie podał (formularz rejestracyjny)'],
      ]
  // Missing number: straight to the turnus, where it is typed (asked for 24.10.2026).
  const enterKuratorium = sessionId ? (
    <>
      — <a href={`/admin/collections/sessions/${sessionId}`}>wpisz w terminie obozu</a>
    </>
  ) : (
    '— wpisz w terminie obozu'
  )
  const rows: [string, React.ReactNode][] = [
    ...buyer,
    ['Uczestnik', `${str(values.childFirstName)} ${str(values.childLastName)}`.trim()],
    ['Data urodzenia', birth || '— z formularza rejestracyjnego'],
    ['Obóz', camp],
    ['Termin', dates],
    ['Wpis do rejestru organizatorów', CAMP_ORGANISER_REGISTRY],
    [
      'Numer obozu w kuratorium',
      kuratorium === null ? 'Sprawdzam…' : kuratorium || enterKuratorium,
    ],
  ]

  return (
    <div
      style={{
        marginBottom: 'var(--base)',
        padding: 'calc(var(--base) * 0.75)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 4,
      }}
    >
      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Dane do faktury</p>
      <dl style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ marginBottom: 4 }}>
            <dt style={{ color: 'var(--theme-elevation-500)' }}>{label}</dt>
            <dd style={{ margin: 0, userSelect: 'all' }}>{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
