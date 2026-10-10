'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { pluralPl } from '@/lib/format'

/**
 * "Usuń wszystkie dane osoby" above the list of participants — a request to
 * be forgotten, handled by the school alone (`lib/personErasure.ts`).
 *
 * Closed by default, and two deliberate steps: first "what do we have on
 * this address" (nothing is deleted), then the address typed AGAIN before the
 * red button wakes up. The server checks the same confirmation.
 */

interface Summary {
  email: string
  account: { email: string; name: string; verified: boolean } | null
  bookings: number
  upcomingBookings: string[]
  messages: number
  newsletter: number
  deliveries: number
  error?: string
}

const muted = { margin: '4px 0 0', color: 'var(--theme-elevation-600)', fontSize: 13 }

export function ErasePersonPanel() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const found = summary
    ? Boolean(summary.account) ||
      summary.bookings + summary.messages + summary.newsletter + summary.deliveries > 0
    : false
  const confirmed = summary !== null && confirm.trim().toLowerCase() === summary.email

  async function check() {
    setBusy(true)
    setMessage(null)
    setSummary(null)
    setConfirm('')
    try {
      const response = await fetch(`/api/customers/erase?email=${encodeURIComponent(email)}`, {
        credentials: 'same-origin',
      })
      const body = (await response.json()) as Summary
      if (!response.ok) setMessage(body.error ?? 'Nie udało się sprawdzić adresu.')
      else setSummary(body)
    } catch {
      setMessage('Brak połączenia z serwerem.')
    } finally {
      setBusy(false)
    }
  }

  async function erase() {
    if (!summary || !confirmed) return
    setBusy(true)
    try {
      const response = await fetch('/api/customers/erase', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: summary.email, confirm }),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        setMessage(body.error ?? 'Nie udało się usunąć danych.')
        return
      }
      setMessage(`Usunięto wszystkie dane osoby ${summary.email}.`)
      setSummary(null)
      setEmail('')
      setConfirm('')
      router.refresh()
    } catch {
      setMessage('Brak połączenia z serwerem — nic nie usunięto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details
      style={{
        margin: '0 0 24px',
        padding: '12px 16px',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 4,
      }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
        Usuń wszystkie dane osoby (prośba o usunięcie danych)
      </summary>
      <p style={muted}>
        Wpisz adres e-mail osoby. Najpierw zobaczysz, co mamy — nic się jeszcze nie usunie.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void check()
        }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="adres@przyklad.pl"
          aria-label="Adres e-mail osoby"
          style={{ minWidth: 280, padding: '6px 10px' }}
        />
        <button
          type="submit"
          className="btn btn--style-secondary btn--size-small"
          style={{ margin: 0 }}
          disabled={busy || email.trim() === ''}
        >
          Sprawdź, co mamy
        </button>
      </form>

      {message && <p style={{ ...muted, color: 'var(--theme-text)' }}>{message}</p>}

      {summary && !found && (
        <p style={{ ...muted, color: 'var(--theme-text)' }}>
          Nie mamy żadnych danych z adresem {summary.email}.
        </p>
      )}

      {summary && found && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Dla {summary.email} usuniemy:</p>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            <li>
              {summary.account
                ? `konto: ${summary.account.name || 'bez imienia'}${summary.account.verified ? '' : ' (niepotwierdzone)'}`
                : 'konta brak'}
            </li>
            <li>
              zapisy na kursy: {summary.bookings}
              {summary.upcomingBookings.length > 0 &&
                ` — w tym nadchodzące: ${summary.upcomingBookings.join('; ')}`}
            </li>
            <li>wiadomości z formularza: {summary.messages}</li>
            <li>newsletter: {summary.newsletter ? 'tak' : 'nie'}</li>
            <li>na listach odbiorców wysłanych wiadomości: {summary.deliveries}</li>
          </ul>
          <p
            style={{
              margin: '12px 0 0',
              padding: '8px 12px',
              borderLeft: '4px solid var(--theme-error-500)',
              background: 'var(--theme-error-50)',
            }}
          >
            Tego nie da się cofnąć.
            {summary.upcomingBookings.length > 0 &&
              ` ${pluralPl(summary.upcomingBookings.length, 'Nadchodzący zapis zniknie', 'Nadchodzące zapisy znikną', 'Nadchodzące zapisy znikną')} bez maila do tej osoby, a miejsca się zwolnią.`}{' '}
            Zaszyfrowane kopie zapasowe znikną same po 40 dniach.
          </p>
          <label style={{ display: 'block', marginTop: 12 }}>
            Żeby potwierdzić, wpisz adres jeszcze raz:
            <input
              type="email"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              style={{ display: 'block', minWidth: 280, marginTop: 4, padding: '6px 10px' }}
            />
          </label>
          <button
            type="button"
            className="btn btn--style-primary btn--size-small"
            style={{
              margin: '12px 0 0',
              background: confirmed ? 'var(--theme-error-500)' : undefined,
              borderColor: confirmed ? 'var(--theme-error-500)' : undefined,
            }}
            disabled={busy || !confirmed}
            onClick={() => void erase()}
          >
            Usuń wszystkie dane tej osoby na zawsze
          </button>
        </div>
      )}
    </details>
  )
}
