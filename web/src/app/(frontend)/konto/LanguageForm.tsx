'use client'

import { useActionState, useId } from 'react'

import { inputClass } from '@/components/AccountFields'
import { updateLanguage, type FormState } from './actions'

const INITIAL: FormState<never> = { status: 'idle' }

/** Which language our emails to this person are written in. */
export function LanguageForm({ current }: { current: 'pl' | 'en' }) {
  const [state, action, pending] = useActionState(updateLanguage, INITIAL)
  const id = useId()

  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-4">
      <div className="flex min-w-[220px] flex-col gap-1.5">
        <label htmlFor={`${id}-language`} className="font-medium">
          Język maili
        </label>
        <select id={`${id}-language`} name="language" defaultValue={current} className={inputClass}>
          <option value="pl">polski</option>
          <option value="en">English</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-rock-200 px-5 py-2.5 font-semibold transition-colors hover:border-rope disabled:opacity-60"
      >
        {pending ? 'Zapisuję…' : 'Zapisz'}
      </button>
      {state.message && (
        <p role="status" className="text-sm text-rock-600">
          {state.message}
        </p>
      )}
    </form>
  )
}
