'use client'

import { useFormStatus } from 'react-dom'

/** The one button on the newsletter pages — disabled while the action runs. */
export function NewsletterButton({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-rope px-7 py-3.5 font-semibold text-white transition-colors hover:bg-rope-dark disabled:opacity-60"
    >
      {pending ? busyLabel : label}
    </button>
  )
}
