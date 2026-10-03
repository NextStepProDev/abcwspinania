'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { pluralPl } from '@/lib/format'

/**
 * The sidebar of a broadcast in the panel: who it will reach, "send a test to
 * me", "send", and the progress once it is going out. Talks to the endpoints
 * in `lib/broadcastSender.ts`.
 *
 * Everything works on the SAVED broadcast — the endpoints read the database,
 * not the form. Hence the note to save first; reading the unsaved form would
 * need `@payloadcms/ui`, which is not this project's dependency (see
 * `SessionExportLink.tsx`). The id comes from the address for the same reason.
 */

interface Summary {
  status: 'draft' | 'sending' | 'sent'
  recipients: number
  english?: number
  hasEnglish?: boolean
  sent?: number
  failed?: number
  skipped?: number
  pending?: number
  pausedUntil?: string | null
  paused?: boolean
  error?: string
}

async function fetchSummary(id: string): Promise<Summary> {
  try {
    const response = await fetch(`/api/broadcasts/${id}/summary`, { credentials: 'same-origin' })
    return (await response.json()) as Summary
  } catch {
    return { status: 'draft', recipients: 0, error: 'Nie udało się pobrać stanu wysyłki.' }
  }
}

const box = { marginBottom: 'var(--base)' }
const muted = { fontSize: 13, color: 'var(--theme-elevation-500)', margin: '6px 0 0' }

function people(n: number): string {
  return `${n} ${pluralPl(n, 'osoba', 'osoby', 'osób')}`
}

function time(iso: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(iso))
}

export function BroadcastPanel() {
  const router = useRouter()
  const id = /\/collections\/broadcasts\/(\d+)(?:\/|$)/.exec(usePathname() ?? '')?.[1]
  const [summary, setSummary] = useState<Summary | null>(null)
  const [busy, setBusy] = useState<'test' | 'send' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Bumped after an action to fetch the numbers again.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!id) return
    let current = true
    void fetchSummary(id).then((next) => current && setSummary(next))
    return () => {
      current = false
    }
  }, [id, version])

  // While it is going out, the numbers follow the queue.
  useEffect(() => {
    if (summary?.status !== 'sending') return
    const timer = setInterval(() => setVersion((v) => v + 1), 5000)
    return () => clearInterval(timer)
  }, [summary?.status])

  if (!id) {
    return (
      <div style={box}>
        <p style={muted}>Zapisz wiadomość — potem pojawi się tu wysyłka próbna i „Wyślij”.</p>
      </div>
    )
  }
  if (!summary) return <div style={box}>Sprawdzam odbiorców…</div>

  async function post(action: 'test' | 'send') {
    setBusy(action)
    setMessage(null)
    try {
      const response = await fetch(`/api/broadcasts/${id}/${action}`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      const body = (await response.json()) as {
        error?: string
        sentTo?: string
        languages?: string[]
        queued?: number
      }
      if (!response.ok) {
        setMessage(body.error ?? 'Coś poszło nie tak.')
      } else if (action === 'test') {
        setMessage(
          `Wysłano na ${body.sentTo}${body.languages?.length === 2 ? ' (po polsku i po angielsku)' : ''}.`,
        )
      } else {
        setMessage(`Wysyłka ruszyła: ${people(body.queued ?? 0)}.`)
        router.refresh()
      }
    } catch {
      setMessage('Brak połączenia z serwerem.')
    } finally {
      setBusy(null)
      setVersion((v) => v + 1)
    }
  }

  function send() {
    if (!summary) return
    const english = summary.english ?? 0
    const warning =
      english > 0 && !summary.hasEnglish
        ? `\n\nPo angielsku: ${people(english)}. Wersji angielskiej nie ma — dostaną polską.`
        : ''
    if (
      window.confirm(
        `Wysłać do: ${people(summary.recipients)}?${warning}\n\nWysyłamy ostatnią ZAPISANĄ wersję. Po wysłaniu nie da się jej zmienić ani cofnąć.`,
      )
    ) {
      void post('send')
    }
  }

  if (summary.status === 'draft') {
    const english = summary.english ?? 0
    return (
      <div style={box}>
        <p style={{ margin: 0, fontWeight: 600 }}>Odbiorcy teraz: {people(summary.recipients)}</p>
        {english > 0 && (
          <p style={muted}>
            W tym {english} po angielsku
            {summary.hasEnglish
              ? ' — dostaną wersję angielską.'
              : ' — bez wersji angielskiej dostaną polską.'}
          </p>
        )}
        <p style={muted}>Liczba odświeża się po zapisaniu zmian.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button
            type="button"
            className="btn btn--style-secondary btn--size-small"
            style={{ margin: 0 }}
            disabled={busy !== null}
            onClick={() => void post('test')}
          >
            {busy === 'test' ? 'Wysyłam…' : 'Wyślij próbnie do mnie'}
          </button>
          <button
            type="button"
            className="btn btn--style-primary btn--size-small"
            style={{ margin: 0 }}
            disabled={busy !== null || summary.recipients === 0}
            onClick={send}
          >
            {busy === 'send' ? 'Kolejkuję…' : 'Wyślij'}
          </button>
        </div>
        {(message || summary.error) && (
          <p style={{ ...muted, color: 'var(--theme-text)' }}>{message ?? summary.error}</p>
        )}
      </div>
    )
  }

  return (
    <div style={box}>
      <p style={{ margin: 0, fontWeight: 600 }}>
        {summary.status === 'sent' ? 'Wysłana' : 'Wysyłka trwa'}: {summary.sent ?? 0} z{' '}
        {summary.recipients}
      </p>
      {(summary.pending ?? 0) > 0 && <p style={muted}>Czeka: {summary.pending}</p>}
      {(summary.failed ?? 0) > 0 && (
        <p style={muted}>Nie doszło: {summary.failed} — szczegóły w tabeli „Odbiorcy”.</p>
      )}
      {(summary.skipped ?? 0) > 0 && (
        <p style={muted}>Pominięci (wypisali się w międzyczasie): {summary.skipped}</p>
      )}
      {summary.paused && summary.pausedUntil && (
        <p style={{ ...muted, color: 'var(--theme-error-500)' }}>
          Wstrzymana do {time(summary.pausedUntil)} — Brevo nie przyjmuje teraz maili (zwykle
          dzienny limit). Wznowi się sama.
        </p>
      )}
      {message && <p style={muted}>{message}</p>}
    </div>
  )
}
