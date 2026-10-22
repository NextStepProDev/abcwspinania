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
  checkCity,
  checkCompanyAddress,
  checkCompanyName,
  checkHeight,
  checkNip,
  checkPostcode,
  checkStreet,
} from '@/lib/validation'
import { submitRegistration, type RegistrationState } from './actions'

const INITIAL: RegistrationState = { status: 'idle' }

// The server's rules, shown live (lib/pesel.ts, lib/validation.ts).
const peselRule = (v: string) => checkPesel(v.replace(/\s+/g, ''))

/** One child in the form, with the answers saved before (when the parent comes back). */
export interface RegistrationFormChild {
  id: number
  name: string
  saved: {
    pesel: string
    height: string
    allergies: string
    medications: string
    diet: string
    conditions: string
    photoConsent: boolean
  } | null
}

/** The sign-up's shared answers saved before. */
export interface RegistrationFormShared {
  street: string
  postcode: string
  city: string
  invoiceRequested: boolean
  invoiceCompanyName: string
  invoiceNip: string
  invoiceCompanyAddress: string
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

/**
 * The registration form for a whole sign-up: a part per child (PESEL,
 * height, health, photo consent), then once for all of them the parent's
 * address, the invoice request and the two required consents. Field names
 * carry the booking id (`pesel_12`) — see `actions.ts`.
 */
export function RegistrationForm({
  token,
  childrenToFill,
  shared,
}: {
  token: string
  childrenToFill: RegistrationFormChild[]
  /** Null until the form was sent once. */
  shared: RegistrationFormShared | null
}) {
  const [state, action, pending] = useActionState(submitRegistration, INITIAL)
  const id = useId()
  const many = childrenToFill.length > 1

  if (state.status === 'done') {
    return (
      <FormDone title={state.first === false ? 'Zmiany zapisane' : 'Formularz przyjęty'}>
        <p>
          {state.first === false
            ? 'Dziękujemy — szkoła widzi już poprawione dane.'
            : state.contractAttached
              ? 'Dziękujemy! Dane do przelewu zaliczki i umowę wysłaliśmy mailem.'
              : 'Dziękujemy! Dane do przelewu zaliczki wysłaliśmy mailem, a umowę prześlemy osobno.'}{' '}
          Gdyby coś się zmieniło przed obozem, wróć tym samym linkiem z maila i popraw formularz.
        </p>
      </FormDone>
    )
  }

  // After a failed send what was typed; otherwise what was saved before.
  const v = state.values
  const text = (name: string, saved: string | undefined) => (v ? (v[name] ?? '') : (saved ?? ''))
  const ticked = (name: string, saved: boolean | undefined) =>
    v ? v[name] === 'on' : Boolean(saved)

  return (
    <form action={action} onSubmit={stopInvalidSubmit} noValidate className="flex flex-col gap-8">
      {state.message && <FormAlert>{state.message}</FormAlert>}
      <input type="hidden" name="token" value={token} />

      {childrenToFill.map((child) => {
        const errors = state.childErrors?.[child.id]
        const f = (name: string) => `${name}_${child.id}`
        return (
          <fieldset
            key={child.id}
            className="flex min-w-0 flex-col gap-5 rounded-xl border border-rock-200 p-5"
          >
            <legend className="px-1 text-[17px] font-semibold">{child.name}</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                id={`${id}-${f('pesel')}`}
                name={f('pesel')}
                label="PESEL"
                required
                hint="Do umowy i ubezpieczenia. Datę urodzenia odczytamy z niego."
                defaultValue={text(f('pesel'), child.saved?.pesel)}
                validate={peselRule}
                error={errors?.pesel}
              />
              <TextField
                id={`${id}-${f('height')}`}
                name={f('height')}
                label="Wzrost (cm)"
                required
                hint="Do zamówienia koszulek."
                placeholder="np. 142"
                defaultValue={text(f('height'), child.saved?.height)}
                validate={checkHeight}
                error={errors?.height}
              />
            </div>
            <p className="-mb-1 text-sm text-rock-600">
              Nie ma czego wpisać? Zostaw pole puste. Te informacje widzi tylko szkoła (nie idą
              mailem), a usuwamy je miesiąc po zakończeniu obozu.
            </p>
            <HealthField
              id={`${id}-${f('allergies')}`}
              name={f('allergies')}
              label="Uczulenia"
              hint="Np. orzechy, użądlenia, leki."
              defaultValue={text(f('allergies'), child.saved?.allergies)}
              error={errors?.allergies}
            />
            <HealthField
              id={`${id}-${f('medications')}`}
              name={f('medications')}
              label="Przyjmowane leki"
              hint="Nazwa, dawka i pora — także leki doraźne."
              defaultValue={text(f('medications'), child.saved?.medications)}
              error={errors?.medications}
            />
            <HealthField
              id={`${id}-${f('diet')}`}
              name={f('diet')}
              label="Dieta"
              hint="Np. wegetariańska, bez glutenu."
              defaultValue={text(f('diet'), child.saved?.diet)}
              error={errors?.diet}
            />
            <HealthField
              id={`${id}-${f('conditions')}`}
              name={f('conditions')}
              label="Choroby i przeciwwskazania"
              hint="Wszystko, co może mieć wpływ na bezpieczeństwo albo zachowanie dziecka."
              defaultValue={text(f('conditions'), child.saved?.conditions)}
              error={errors?.conditions}
            />
            <label className="flex items-start gap-3 text-sm leading-6 text-rock-600">
              <input
                name={f('photoConsent')}
                type="checkbox"
                defaultChecked={ticked(f('photoConsent'), child.saved?.photoConsent)}
                className="mt-1 size-4 shrink-0"
              />
              <span>
                <strong className="text-rock-900">Nieobowiązkowe.</strong>{' '}
                <ConsentText text={PHOTO_CONSENT_TEXT} />
              </span>
            </label>
          </fieldset>
        )
      })}

      <fieldset className="flex min-w-0 flex-col gap-5">
        <legend className="mb-1 font-medium">
          Twój adres zamieszkania{many ? ' (jeden dla wszystkich dzieci)' : ''}
        </legend>
        <p className="-mt-2 text-sm text-rock-600">Do umowy i faktury.</p>
        <TextField
          id={`${id}-street`}
          name="street"
          label="Ulica i numer"
          required
          autoComplete="street-address"
          defaultValue={text('street', shared?.street)}
          validate={checkStreet}
          error={state.errors?.street}
        />
        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
          <TextField
            id={`${id}-postcode`}
            name="postcode"
            label="Kod pocztowy"
            required
            autoComplete="postal-code"
            placeholder="42-421"
            defaultValue={text('postcode', shared?.postcode)}
            validate={checkPostcode}
            error={state.errors?.postcode}
          />
          <TextField
            id={`${id}-city`}
            name="city"
            label="Miejscowość"
            required
            autoComplete="address-level2"
            defaultValue={text('city', shared?.city)}
            validate={checkCity}
            error={state.errors?.city}
          />
        </div>
      </fieldset>

      {/* The company part opens with its checkbox by CSS alone (`has-[]`),
          so it works before — or without — JavaScript. */}
      <div className="group/invoice flex flex-col gap-4">
        <label className="flex items-start gap-3 text-sm leading-6 text-rock-600">
          <input
            name="invoiceRequested"
            type="checkbox"
            defaultChecked={ticked('invoiceRequested', shared?.invoiceRequested)}
            className="mt-1 size-4 shrink-0"
          />
          <span>
            <strong className="text-rock-900">Potrzebuję faktury</strong> — wystawimy ją na rodzica,
            na podany adres, albo na firmę.
          </span>
        </label>
        <div className="hidden flex-col gap-4 pl-7 group-has-[input[name=invoiceRequested]:checked]/invoice:flex">
          <label className="flex items-start gap-3 text-sm leading-6 text-rock-600">
            <input
              name="invoiceCompany"
              type="checkbox"
              defaultChecked={ticked('invoiceCompany', Boolean(shared?.invoiceNip))}
              className="mt-1 size-4 shrink-0"
            />
            <span>
              <strong className="text-rock-900">Na firmę</strong> — z NIP-em.
            </span>
          </label>
          <div className="hidden flex-col gap-5 group-has-[input[name=invoiceCompany]:checked]/invoice:flex">
            <TextField
              id={`${id}-company`}
              name="invoiceCompanyName"
              label="Nazwa firmy"
              autoComplete="organization"
              defaultValue={text('invoiceCompanyName', shared?.invoiceCompanyName)}
              validate={checkCompanyName}
              error={state.errors?.invoiceCompanyName}
            />
            <TextField
              id={`${id}-nip`}
              name="invoiceNip"
              label="NIP"
              placeholder="631-172-65-35"
              defaultValue={text('invoiceNip', shared?.invoiceNip)}
              validate={checkNip}
              error={state.errors?.invoiceNip}
            />
            <TextField
              id={`${id}-company-address`}
              name="invoiceCompanyAddress"
              label="Adres firmy"
              autoComplete="off"
              placeholder="ul. Skalna 1, 42-421 Rzędkowice"
              defaultValue={text('invoiceCompanyAddress', shared?.invoiceCompanyAddress)}
              validate={checkCompanyAddress}
              error={state.errors?.invoiceCompanyAddress}
            />
          </div>
        </div>
      </div>

      <Honeypot />
      <ConsentField
        id={`${id}-activities`}
        name="activitiesConsent"
        text={CAMP_ACTIVITIES_CONSENT_TEXT}
        error={state.errors?.activitiesConsent}
        missing={ACTIVITIES_CONSENT_MISSING}
        defaultChecked={v ? v.activitiesConsent === 'on' : Boolean(shared)}
      />
      <ConsentField
        id={`${id}-consent`}
        text={CAMP_REGISTRATION_CONSENT_TEXT}
        error={state.errors?.consent}
        missing={REGISTRATION_CONSENT_MISSING}
        defaultChecked={v ? v.consent === 'on' : Boolean(shared)}
      />

      <SubmitButton
        pending={pending}
        label={shared ? 'Zapisz zmiany' : 'Wyślij formularz'}
        busyLabel="Zapisuję…"
      />
    </form>
  )
}
