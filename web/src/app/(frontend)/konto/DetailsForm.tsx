'use client'

import { useActionState, useId, useState } from 'react'

import { FormAlert, TextLink } from '@/components/AccountForm'
import { TextField, stopInvalidSubmit } from '@/components/AccountFields'
import {
  checkName,
  checkPhone,
  sameAccountDetails,
  type AccountDetailsData,
  type AccountDetailsErrors,
} from '@/lib/validation'
import { updateAccountDetails, type FormState } from './actions'

// The same rules and messages the server applies (lib/validation.ts).
const firstNameRule = (v: string) => checkName(v, 'Podaj imię.')
const lastNameRule = (v: string) => checkName(v, 'Podaj nazwisko.')

const INITIAL: FormState<AccountDetailsErrors> = { status: 'idle' }

/** The three fields out of the form's values (an action answer or the live form). */
function detailsOf(values: Record<string, string>): AccountDetailsData {
  return {
    firstName: values.firstName ?? '',
    lastName: values.lastName ?? '',
    phone: values.phone ?? '',
  }
}

/** "Twoje dane" — name and phone; the address is shown, not editable (see the action). */
export function DetailsForm({
  current,
}: {
  current: { firstName: string; lastName: string; phone: string; email: string }
}) {
  const [state, action, pending] = useActionState(updateAccountDetails, INITIAL)
  const id = useId()
  // "Zapisane." hides once something is typed again — as in LanguageForm.
  const [changed, setChanged] = useState(false)
  // What the database holds, to keep "Zapisz" disabled until the fields
  // differ from it (asked for 18.10.2026: saving nothing looked like a save).
  const [saved, setSaved] = useState<AccountDetailsData>(current)
  const [modified, setModified] = useState(false)
  const [answered, setAnswered] = useState(state)
  if (answered !== state) {
    setAnswered(state)
    setChanged(false)
    // A save: the fields now show what is stored. An error: they show what
    // was typed, still unsaved.
    if (state.status === 'done' && state.values) {
      setSaved(detailsOf(state.values))
      setModified(false)
    } else if (state.values) {
      setModified(!sameAccountDetails(saved, detailsOf(state.values)))
    }
  }
  const shown = state.values ?? current

  return (
    <form
      action={action}
      onSubmit={stopInvalidSubmit}
      onChange={(e) => {
        setChanged(true)
        const form = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
        setModified(!sameAccountDetails(saved, detailsOf(form)))
      }}
      noValidate
      className="mt-4 flex flex-col gap-5"
    >
      {state.status === 'error' && state.message && <FormAlert>{state.message}</FormAlert>}
      {/* A new `key` per answer: React resets the form after the action, and
          the fields keep their own state — drawn afresh, they show what was
          saved (or sent back with an error), not the page's first values. */}
      <div
        key={String(state.values ? JSON.stringify(state.values) : 'initial')}
        className="contents"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id={`${id}-firstName`}
            name="firstName"
            label="Imię"
            required
            autoComplete="given-name"
            defaultValue={shown.firstName}
            validate={firstNameRule}
            error={state.errors?.firstName}
          />
          <TextField
            id={`${id}-lastName`}
            name="lastName"
            label="Nazwisko"
            required
            autoComplete="family-name"
            defaultValue={shown.lastName}
            validate={lastNameRule}
            error={state.errors?.lastName}
          />
        </div>
        <TextField
          id={`${id}-phone`}
          name="phone"
          label="Telefon"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+48 600 100 200"
          defaultValue={shown.phone}
          validate={checkPhone}
          error={state.errors?.phone}
        />
      </div>
      <p className="text-sm text-rock-600">
        Adres e-mail: <span className="font-medium text-rock-900">{current.email}</span>. Zmiana
        adresu — <TextLink href="/kontakt">napisz do nas</TextLink>.
      </p>
      <p className="text-sm text-rock-600">
        Nowe dane trafią też do Twoich nadchodzących zapisów, żebyśmy mogli się z Tobą skontaktować.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || !modified}
          className="rounded-lg border border-rock-200 px-5 py-2.5 font-semibold transition-colors enabled:hover:border-rope disabled:opacity-60"
        >
          {pending ? 'Zapisuję…' : 'Zapisz'}
        </button>
        {state.status === 'done' && !changed && (
          <p role="status" className="text-sm text-rock-600">
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}
