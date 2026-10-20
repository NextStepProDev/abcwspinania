'use client'

import { useActionState, useId } from 'react'

import { FormAlert, FormDone } from '@/components/AccountForm'
import {
  ConsentField,
  Honeypot,
  SubmitButton,
  TextField,
  inputClass,
  stopInvalidSubmit,
} from '@/components/AccountFields'
import { ConsentText } from '@/components/ConsentText'
import {
  CAMP_ACTIVITIES_CONSENT_TEXT,
  CAMP_REGISTRATION_CONSENT_TEXT,
  PHOTO_CONSENT_TEXT,
} from '@/lib/consent'
import { checkPesel } from '@/lib/pesel'
import {
  ACTIVITIES_CONSENT_MISSING,
  HEALTH_TEXT_MAX,
  REGISTRATION_CONSENT_MISSING,
  checkHeight,
} from '@/lib/validation'
import { submitRegistration, type RegistrationState } from './actions'

const INITIAL: RegistrationState = { status: 'idle' }

// The server's rules, shown live (lib/pesel.ts, lib/validation.ts).
const peselRule = (v: string) => checkPesel(v.replace(/\s+/g, ''))

/** What the form opens with: the saved answers when the parent comes back to correct them. */
export interface RegistrationDefaults {
  pesel: string
  height: string
  allergies: string
  medications: string
  diet: string
  conditions: string
  photoConsent: boolean
  invoiceRequested: boolean
}

function HealthField({
  id,
  name,
  label,
  hint,
  defaultValue,
  error,
}: {
  id: string
  name: string
  label: string
  hint: string
  defaultValue?: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={2}
        maxLength={HEALTH_TEXT_MAX}
        placeholder={hint}
        defaultValue={defaultValue}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        className={inputClass}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
}

export function RegistrationForm({
  token,
  childName,
  defaults,
}: {
  token: string
  childName: string
  defaults: RegistrationDefaults | null
}) {
  const [state, action, pending] = useActionState(submitRegistration, INITIAL)
  const id = useId()

  if (state.status === 'done') {
    return (
      <FormDone title={state.first === false ? 'Zmiany zapisane' : 'Formularz przyjęty'}>
        <p>
          {state.first === false
            ? 'Dziękujemy — szkoła widzi już poprawione dane.'
            : 'Dziękujemy! Dane do przelewu zaliczki wysłaliśmy mailem, a umowę prześlemy osobno.'}{' '}
          Gdyby coś się zmieniło przed obozem, wróć tym samym linkiem z maila i popraw formularz.
        </p>
      </FormDone>
    )
  }

  // After a failed send the typed values; otherwise what was saved before.
  const v = state.values
  const value = (key: keyof RegistrationDefaults) =>
    v ? v[key] : typeof defaults?.[key] === 'string' ? (defaults[key] as string) : ''
  const ticked = (key: 'photoConsent' | 'invoiceRequested') =>
    v ? v[key] === 'on' : Boolean(defaults?.[key])

  return (
    <form action={action} onSubmit={stopInvalidSubmit} noValidate className="flex flex-col gap-6">
      {state.message && <FormAlert>{state.message}</FormAlert>}
      <input type="hidden" name="token" value={token} />

      <fieldset className="flex min-w-0 flex-col gap-5">
        <legend className="mb-1 font-medium">Dane dziecka: {childName}</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id={`${id}-pesel`}
            name="pesel"
            label="PESEL"
            required
            hint="Potrzebny do umowy i ubezpieczenia. Datę urodzenia odczytamy z niego."
            defaultValue={value('pesel')}
            validate={peselRule}
            error={state.errors?.pesel}
          />
          <TextField
            id={`${id}-height`}
            name="height"
            label="Wzrost (cm)"
            required
            hint="Do zamówienia koszulek."
            placeholder="np. 142"
            defaultValue={value('height')}
            validate={checkHeight}
            error={state.errors?.height}
          />
        </div>
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-5">
        <legend className="mb-1 font-medium">Zdrowie</legend>
        <p className="-mt-2 text-sm text-rock-600">
          Nie ma czego wpisać? Zostaw pole puste. Te informacje widzi tylko szkoła (nie idą mailem),
          a usuwamy je miesiąc po jego zakończeniu.
        </p>
        <HealthField
          id={`${id}-allergies`}
          name="allergies"
          label="Uczulenia"
          hint="Np. orzechy, użądlenia, leki."
          defaultValue={value('allergies')}
          error={state.errors?.allergies}
        />
        <HealthField
          id={`${id}-medications`}
          name="medications"
          label="Przyjmowane leki"
          hint="Nazwa, dawka i pora — także leki doraźne."
          defaultValue={value('medications')}
          error={state.errors?.medications}
        />
        <HealthField
          id={`${id}-diet`}
          name="diet"
          label="Dieta"
          hint="Np. wegetariańska, bez glutenu."
          defaultValue={value('diet')}
          error={state.errors?.diet}
        />
        <HealthField
          id={`${id}-conditions`}
          name="conditions"
          label="Choroby i przeciwwskazania"
          hint="Wszystko, co może mieć wpływ na bezpieczeństwo albo zachowanie dziecka."
          defaultValue={value('conditions')}
          error={state.errors?.conditions}
        />
      </fieldset>

      <label className="flex items-start gap-3 text-sm leading-6 text-rock-600">
        <input
          name="invoiceRequested"
          type="checkbox"
          defaultChecked={ticked('invoiceRequested')}
          className="mt-1 size-4 shrink-0"
        />
        <span>
          <strong className="text-rock-900">Potrzebuję faktury</strong> — skontaktujemy się w
          sprawie danych do faktury.
        </span>
      </label>

      <Honeypot />
      <ConsentField
        id={`${id}-activities`}
        name="activitiesConsent"
        text={CAMP_ACTIVITIES_CONSENT_TEXT}
        error={state.errors?.activitiesConsent}
        missing={ACTIVITIES_CONSENT_MISSING}
        defaultChecked={v ? v.activitiesConsent === 'on' : Boolean(defaults)}
      />
      <label className="flex items-start gap-3 text-sm leading-6 text-rock-600">
        <input
          name="photoConsent"
          type="checkbox"
          defaultChecked={ticked('photoConsent')}
          className="mt-1 size-4 shrink-0"
        />
        <span>
          <strong className="text-rock-900">Nieobowiązkowe.</strong>{' '}
          <ConsentText text={PHOTO_CONSENT_TEXT} />
        </span>
      </label>
      <ConsentField
        id={`${id}-consent`}
        text={CAMP_REGISTRATION_CONSENT_TEXT}
        error={state.errors?.consent}
        missing={REGISTRATION_CONSENT_MISSING}
        defaultChecked={v ? v.consent === 'on' : Boolean(defaults)}
      />

      <SubmitButton
        pending={pending}
        label={defaults ? 'Zapisz zmiany' : 'Wyślij formularz'}
        busyLabel="Zapisuję…"
      />
    </form>
  )
}
