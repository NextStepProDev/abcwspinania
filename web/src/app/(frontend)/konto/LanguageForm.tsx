'use client'

import { useActionState, useId, useState } from 'react'

import { inputClass } from '@/components/AccountFields'
import { SelectBox } from '@/components/SelectBox'
import { updateLanguage, type FormState } from './actions'

const INITIAL: FormState<never> = { status: 'idle' }

/** Which language our emails to this person are written in. */
export function LanguageForm({ current }: { current: 'pl' | 'en' }) {
  const [state, action, pending] = useActionState(updateLanguage, INITIAL)
  const id = useId()
  // "Zapisane." describes the LAST save. While the select shows something
  // else it would be untrue (reported 10.10.2026), so it hides until the
  // choice is back at the saved one or a new answer arrives — the latter
  // adjusted during render, as in Header.tsx.
  const [changed, setChanged] = useState(false)
  const [answered, setAnswered] = useState(state)
  if (answered !== state) {
    setAnswered(state)
    setChanged(false)
  }

  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-4">
      <div className="flex min-w-[220px] flex-col gap-1.5">
        <label htmlFor={`${id}-language`} className="font-medium">
          Język maili
        </label>
        {/* After a save: the saved language, and a new `key` so the select
            is drawn afresh with it (see `updateLanguage`). */}
        <SelectBox
          key={state.values?.language ?? current}
          id={`${id}-language`}
          name="language"
          defaultValue={state.values?.language ?? current}
          onChange={(e) => setChanged(e.target.value !== (state.values?.language ?? current))}
          className={inputClass}
        >
          <option value="pl">polski</option>
          <option value="en">English</option>
        </SelectBox>
      </div>
      {/* Disabled while the saved language is chosen — nothing to save
          (as in DetailsForm; asked for 18.10.2026). */}
      <button
        type="submit"
        disabled={pending || !changed}
        className="rounded-lg border border-rock-200 px-5 py-2.5 font-semibold transition-colors enabled:hover:border-rope disabled:opacity-60"
      >
        {pending ? 'Zapisuję…' : 'Zapisz'}
      </button>
      {state.message && !changed && (
        <p role="status" className="text-sm text-rock-600">
          {state.message}
        </p>
      )}
    </form>
  )
}
