'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * A camp booking's registration form, in the sidebar of the booking's page:
 * whether the parent filled it in, a link to its data (PESEL, health — a
 * collection of its own, `CampRegistrations`), and "Wyślij link" — for a
 * booking added in the panel (no email went out), a lost email, or a child
 * the school moved up from the waiting list by hand.
 *
 * The booking id comes from the address, as in `SessionExportLink`. Shown
 * only for a saved booking.
 */
export function RegistrationPanel() {
  const id = /\/collections\/bookings\/(\d+)(?:\/|$)/.exec(usePathname() ?? '')?.[1]
  const [registration, setRegistration] = useState<
    { id: number; updatedAt: string } | null | undefined
  >(undefined)
  const [message, setMessage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    const query = new URLSearchParams({
      'where[booking][equals]': id,
      limit: '1',
      depth: '0',
    })
    fetch(`/api/camp-registrations?${query.toString()}`, { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { docs?: { id: number; updatedAt: string }[] } | null) =>
        setRegistration(body?.docs?.[0] ?? null),
      )
      .catch(() => setRegistration(null))
  }, [id])

  if (!id) return null

  const send = async () => {
    if (!window.confirm('Wysłać rodzicowi link do formularza rejestracyjnego?')) return
    setSending(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/bookings/${id}/registration-link`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      const body = (await response.json().catch(() => ({}))) as { email?: string; error?: string }
      setMessage(
        response.ok ? `Wysłano na ${body.email}.` : (body.error ?? 'Nie udało się wysłać.'),
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Formularz rejestracyjny</p>
      {registration === undefined ? (
        <p style={{ margin: '0 0 8px', fontSize: 13 }}>Sprawdzam…</p>
      ) : registration ? (
        <p style={{ margin: '0 0 8px', fontSize: 13 }}>
          Wypełniony{' '}
          {new Date(registration.updatedAt).toLocaleDateString('pl-PL', {
            timeZone: 'Europe/Warsaw',
          })}{' '}
          —{' '}
          <a href={`/admin/collections/camp-registrations/${registration.id}`}>
            zobacz dane (PESEL, zdrowie)
          </a>
        </p>
      ) : (
        <p style={{ margin: '0 0 8px', fontSize: 13 }}>Rodzic jeszcze go nie wypełnił.</p>
      )}
      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="btn btn--style-secondary btn--size-small"
        style={{ margin: 0 }}
      >
        {sending ? 'Wysyłam…' : 'Wyślij rodzicowi link do formularza'}
      </button>
      {message && (
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--theme-elevation-500)' }}>{message}</p>
      )}
    </div>
  )
}
