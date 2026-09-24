'use client'

import { useActionState, useId } from 'react'

import { NEWSLETTER_CONSENT_TEXT } from '@/lib/consent'
import { subscribeToNewsletter, type NewsletterState } from '@/app/(frontend)/kontakt/actions'

const INITIAL_STATE: NewsletterState = { status: 'idle' }

/**
 * Newsletter sign-up in the footer.
 *
 * The consent clause sits next to the field rather than hidden behind a link —
 * the same text goes into the database alongside the address
 * (`lib/consent.ts`). The same pattern as the contact form: we store the TEXT of
 * the consent, not a bare "yes".
 *
 * Sending is not wired up yet; the addresses wait in the database for a provider
 * to be plugged in. That is why the confirmation speaks of being signed up
 * rather than of something arriving — promising an email that will not go out
 * would be worse than having no form.
 */
export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeToNewsletter, INITIAL_STATE)
  const fieldId = useId()
  const consentId = `${fieldId}-consent`

  if (state.status === 'subscribed') {
    return (
      <div role="status" className="rounded-lg border border-rock-line bg-rock-800 px-5 py-4">
        <p className="font-medium text-white">Zapisane — dzięki.</p>
        <p className="mt-1 text-sm text-rock-fg">
          Odezwiemy się, gdy ruszą zapisy albo pojawi się nowy tekst.
        </p>
      </div>
    )
  }

  return (
    <form action={action} noValidate className="flex w-full flex-col gap-3 lg:max-w-[420px]">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="grow">
          <label htmlFor={fieldId} className="sr-only">
            Adres e-mail
          </label>
          <input
            id={fieldId}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="twoj@email.pl"
            aria-describedby={state.errors?.email ? `${fieldId}-error` : undefined}
            aria-invalid={state.errors?.email ? true : undefined}
            className="w-full rounded-lg border border-rock-line bg-rock-950 px-4 py-3 text-white placeholder:text-rock-500 focus-visible:border-rope focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rope"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-banner-fill px-6 py-3 font-semibold text-white transition-colors hover:bg-banner-fill-dark disabled:opacity-60"
        >
          {pending ? 'Zapisuję…' : 'Zapisz się'}
        </button>
      </div>

      {/* The bot honeypot — the same one as in the contact form. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        hidden
      />

      <label
        htmlFor={consentId}
        className="flex items-start gap-3 text-[13px] leading-5 text-rock-fg"
      >
        <input
          id={consentId}
          name="newsletter-consent"
          type="checkbox"
          required
          aria-describedby={state.errors?.consent ? `${fieldId}-consent-error` : undefined}
          aria-invalid={state.errors?.consent ? true : undefined}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>{NEWSLETTER_CONSENT_TEXT}</span>
      </label>

      {(state.errors?.email || state.errors?.consent || state.message) && (
        <p role="alert" className="text-sm text-rope-light">
          {state.errors?.email ?? state.errors?.consent ?? state.message}
        </p>
      )}
    </form>
  )
}
