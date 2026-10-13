'use client'

import { useActionState, useId } from 'react'

import { NEWSLETTER_CONSENT_TEXT } from '@/lib/consent'
import { subscribeToNewsletter, type NewsletterState } from '@/app/(frontend)/kontakt/actions'
import { ConsentText } from '@/components/ConsentText'

const INITIAL_STATE: NewsletterState = { status: 'idle' }

/**
 * Newsletter sign-up in the footer.
 *
 * The consent clause sits next to the field rather than hidden behind a link —
 * the same text goes into the database alongside the address
 * (`lib/consent.ts`). The same pattern as the contact form: we store the TEXT of
 * the consent, not a bare "yes".
 *
 * Double opt-in: the answer asks to check the inbox for the confirmation
 * link, worded so it fits an address that was already subscribed too — the
 * form must not tell anyone whether an address is on the list.
 */
export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeToNewsletter, INITIAL_STATE)
  const fieldId = useId()
  const consentId = `${fieldId}-consent`

  if (state.status === 'subscribed') {
    return (
      <div role="status" className="rounded-lg border border-rock-line bg-rock-800 px-5 py-4">
        <p className="font-medium text-white">Sprawdź skrzynkę.</p>
        <p className="mt-1 text-sm text-rock-fg">
          Wysłaliśmy link — kliknij go, żeby potwierdzić zapis. Jeśli ten adres był już zapisany,
          nic nie musisz robić.
        </p>
      </div>
    )
  }

  return (
    <form
      action={action}
      noValidate
      className="flex w-full flex-col gap-3 lg:min-w-[460px] lg:max-w-[500px]"
    >
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
            defaultValue={state.values?.email}
            aria-describedby={state.errors?.email ? `${fieldId}-error` : undefined}
            aria-invalid={state.errors?.email ? true : undefined}
            className="w-full rounded-lg border border-rock-line bg-rock-950 px-4 py-3 text-white placeholder:text-rock-500 focus-visible:border-rope focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rope"
          />
        </div>
        {/* The label names the newsletter on its own: the heading next to the
            form reads as a separate block, so a bare "Zapisz się" said nothing.
            Both labels share one grid cell, so the button keeps the width of
            the longer one and the field does not jump while sending;
            `invisible` also hides the inactive label from screen readers. */}
        <button
          type="submit"
          disabled={pending}
          className="grid shrink-0 justify-items-center whitespace-nowrap rounded-lg bg-rope px-6 py-3 font-semibold text-white transition-colors hover:bg-rope-dark disabled:opacity-60"
        >
          <span className={`col-start-1 row-start-1 ${pending ? 'invisible' : ''}`}>
            Zapisz się na newsletter
          </span>
          <span className={`col-start-1 row-start-1 ${pending ? '' : 'invisible'}`}>Zapisuję…</span>
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
          defaultChecked={state.values?.consent === 'on'}
          aria-describedby={state.errors?.consent ? `${fieldId}-consent-error` : undefined}
          aria-invalid={state.errors?.consent ? true : undefined}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>
          <ConsentText text={NEWSLETTER_CONSENT_TEXT} />
        </span>
      </label>

      {(state.errors?.email || state.errors?.consent || state.message) && (
        <p role="alert" className="text-sm text-rope-light">
          {state.errors?.email ?? state.errors?.consent ?? state.message}
        </p>
      )}
    </form>
  )
}
