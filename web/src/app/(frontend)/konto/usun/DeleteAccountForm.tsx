'use client'

import { useActionState, useId } from 'react'

import { FormAlert } from '@/components/AccountForm'
import { TextField } from '@/components/AccountFields'
import { deleteAccount, type FormState } from '../actions'

const INITIAL: FormState<{ password?: string }> = { status: 'idle' }

/** The password again, then the account is gone — see `deleteAccount`. */
export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, INITIAL)
  const id = useId()

  return (
    <div className="flex flex-col gap-5">
      {state.message && <FormAlert>{state.message}</FormAlert>}
      <form action={action} noValidate className="flex flex-col gap-5">
        <TextField
          id={`${id}-password`}
          name="password"
          label="Hasło — dla potwierdzenia, że to Ty"
          type="password"
          required
          autoComplete="current-password"
          error={state.errors?.password}
        />
        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-error px-7 py-3.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Usuwam…' : 'Usuń konto na zawsze'}
          </button>
        </div>
      </form>
    </div>
  )
}
