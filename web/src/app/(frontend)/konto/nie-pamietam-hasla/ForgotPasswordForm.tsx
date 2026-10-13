'use client'

import { useActionState, useId } from 'react'

import { FormDone } from '@/components/AccountForm'
import { Honeypot, SubmitButton, TextField } from '@/components/AccountFields'
import { checkEmail } from '@/lib/validation'
import { requestPasswordReset, type FormState } from '../actions'

const INITIAL: FormState<{ email?: string }> = { status: 'idle' }

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, INITIAL)
  const id = useId()

  if (state.status === 'done') {
    return <FormDone title="Sprawdź skrzynkę">{state.message}</FormDone>
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
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
      <Honeypot />
      <SubmitButton pending={pending} label="Wyślij link" busyLabel="Wysyłam…" />
    </form>
  )
}
