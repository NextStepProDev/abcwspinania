'use client'

import { useActionState, useId } from 'react'

import { FormAlert } from '@/components/AccountForm'
import { SubmitButton, TextField } from '@/components/AccountFields'
import { PASSWORD_MIN, checkNewPassword } from '@/lib/validation'
import { setNewPassword, type FormState } from '../actions'

const INITIAL: FormState<{ password?: string }> = { status: 'idle' }

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setNewPassword, INITIAL)
  const id = useId()

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && <FormAlert>{state.message}</FormAlert>}
      <input type="hidden" name="token" value={token} />
      <TextField
        id={`${id}-password`}
        name="password"
        label="Nowe hasło"
        type="password"
        required
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        hint="Użyj hasła, którego nie masz w żadnym innym serwisie."
        validate={checkNewPassword}
        error={state.errors?.password}
      />
      <SubmitButton pending={pending} label="Ustaw hasło i zaloguj" busyLabel="Zapisuję…" />
    </form>
  )
}
