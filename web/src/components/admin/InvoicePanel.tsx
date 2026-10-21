'use client'

import { useFormFields } from '@payloadcms/ui'

import { CAMP_ORGANISER_REGISTRY } from '@/lib/campPayment'

/**
 * "Dane do faktury" on a camp booking's page — shown when the parent ticked
 * "Potrzebuję faktury" (decided 21.10.2026). The school issues the invoice
 * itself, in its own program; this puts what Krzysiek listed in one place to
 * copy from: the parent with the address, the child, the birth date, the
 * dates (the booking's label carries them) and the organiser's registry
 * number. The camp's own registration number waits for Krzysiek's answer.
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
  }))
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
  const rows: [string, string][] = [
    ['Nabywca (rodzic)', `${str(values.firstName)} ${str(values.lastName)}`.trim()],
    ['Adres', address || '— rodzic jeszcze nie podał (formularz rejestracyjny)'],
    ['Uczestnik', `${str(values.childFirstName)} ${str(values.childLastName)}`.trim()],
    ['Data urodzenia', birth || '— z formularza rejestracyjnego'],
    ['Obóz', camp],
    ['Termin', dates],
    ['Wpis do rejestru organizatorów', CAMP_ORGANISER_REGISTRY],
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
