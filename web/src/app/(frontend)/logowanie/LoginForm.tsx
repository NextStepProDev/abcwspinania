'use client'

import { useActionState, useId } from 'react'

import { FormAlert } from '@/components/AccountForm'
import { SubmitButton, TextField } from '@/components/AccountFields'
import { logIn, type FormState } from '../konto/actions'
import { ResendLinkForm } from '../konto/ResendLinkForm'
import { checkEmail, type LoginErrors } from '@/lib/validation'

const INITIAL: FormState<LoginErrors> = { status: 'idle' }

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(logIn, INITIAL)
  const id = useId()

  return (
    <div className="flex flex-col gap-5">
      {state.message && <FormAlert>{state.message}</FormAlert>}
      {/* Outside the login form: forms cannot nest in HTML. */}
      {state.unverified && state.values?.email && <ResendLinkForm email={state.values.email} />}
      <form action={action} noValidate className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />
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
          id={`${id}-password`}
          name="password"
          label="Hasło"
          type="password"
          required
          autoComplete="current-password"
          error={state.errors?.password}
        />
        <SubmitButton pending={pending} label="Zaloguj się" busyLabel="Loguję…" />
      </form>
    </div>
  )
}
