'use client'

import { useActionState, useId } from 'react'

import { FormAlert, FormDone, TextLink } from '@/components/AccountForm'
import { ConsentField, Honeypot, SubmitButton, TextField } from '@/components/AccountFields'
import { ACCOUNT_CONSENT_TEXT } from '@/lib/consent'
import {
  PASSWORD_MIN,
  checkEmail,
  checkName,
  checkNewPassword,
  checkPhone,
  type RegistrationErrors,
} from '@/lib/validation'

// The same rules and messages the server applies (lib/validation.ts).
const firstNameRule = (v: string) => checkName(v, 'Podaj imię.')
const lastNameRule = (v: string) => checkName(v, 'Podaj nazwisko.')
import { registerAccount, type FormState } from '../konto/actions'

const INITIAL: FormState<RegistrationErrors> = { status: 'idle' }

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAccount, INITIAL)
  const id = useId()

  if (state.status === 'done') {
    // The same message whether the address was new or already registered —
    // see the note at the top of `konto/actions.ts`.
    return (
      <FormDone title="Sprawdź skrzynkę">
        Wysłaliśmy maila z linkiem. Kliknij go, a potem zaloguj się. Jeśli nic nie przyszło w kilka
        minut, zajrzyj do spamu albo{' '}
        <TextLink href="/konto/wyslij-link">wyślij link ponownie</TextLink>.
      </FormDone>
    )
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && <FormAlert>{state.message}</FormAlert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={`${id}-firstName`}
          name="firstName"
          label="Imię"
          required
          autoComplete="given-name"
          defaultValue={state.values?.firstName}
          validate={firstNameRule}
          error={state.errors?.firstName}
        />
        <TextField
          id={`${id}-lastName`}
          name="lastName"
          label="Nazwisko"
          required
          autoComplete="family-name"
          defaultValue={state.values?.lastName}
          validate={lastNameRule}
          error={state.errors?.lastName}
        />
      </div>
      <TextField
        id={`${id}-email`}
        name="email"
        label="Adres e-mail"
        type="email"
        required
        autoComplete="email"
        defaultValue={state.values?.email}
        validate={checkEmail}
        error={state.errors?.email}
      />
      <TextField
        id={`${id}-phone`}
        name="phone"
        label="Telefon"
        type="tel"
        required
        autoComplete="tel"
        placeholder="+48 600 100 200"
        defaultValue={state.values?.phone}
        validate={checkPhone}
        error={state.errors?.phone}
      />
      <TextField
        id={`${id}-password`}
        name="password"
        label="Hasło"
        type="password"
        required
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        hint="Użyj hasła, którego nie masz w żadnym innym serwisie."
        validate={checkNewPassword}
        error={state.errors?.password}
      />
      <Honeypot />
      <ConsentField
        id={`${id}-consent`}
        text={ACCOUNT_CONSENT_TEXT}
        error={state.errors?.consent}
        defaultChecked={state.values?.consent === 'on'}
      />
      <SubmitButton pending={pending} label="Załóż konto" busyLabel="Zakładam…" />
    </form>
  )
}
