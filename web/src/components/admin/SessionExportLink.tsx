'use client'

import { usePathname } from 'next/navigation'

/**
 * "Pobierz listę uczestników" on a session's page in the panel.
 *
 * The session id comes from the panel's own address
 * (`/admin/collections/sessions/<id>`) — enough here, no need for
 * `useDocumentInfo` from `@payloadcms/ui` (a dependency of the project since
 * 12.10.2026, see `BroadcastPanel.tsx`). Shown only for a saved session —
 * `/create` has no id and no bookings.
 */
export function SessionExportLink() {
  const id = /\/collections\/sessions\/(\d+)(?:\/|$)/.exec(usePathname() ?? '')?.[1]
  if (!id) return null
  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <a
        href={`/api/sessions/${id}/export`}
        className="btn btn--style-secondary btn--size-small"
        style={{ margin: 0 }}
      >
        Pobierz listę uczestników (Excel)
      </a>
      <p style={{ marginTop: 8, fontSize: 13, color: 'var(--theme-elevation-500)' }}>
        Wszyscy zapisani — także rezerwowi i rezygnacje (kolumna „Status”).
      </p>
    </div>
  )
}
