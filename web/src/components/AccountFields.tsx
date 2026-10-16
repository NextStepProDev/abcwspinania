'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

import { Check } from '@/components/Icons'
import { passwordLengthLabel } from '@/lib/validation'
import { ConsentText } from '@/components/ConsentText'

/**
 * Form fields of the account pages, with live validation.
 *
 * The rule a field shows is the SAME function the server runs on submit
 * (`lib/validation.ts`, `checkName` & co.), passed in as `validate`. The
 * browser only shows it earlier; the server still decides.
 *
 * When a field turns red (decided 02.10.2026): not while someone types it
 * for the first time — a half-typed email is not a mistake — but once they
 * LEAVE the field with an error, and from then on live, letter by letter,
 * until it passes (then a green tick). A field left EMPTY stays calm until
 * submit (since 16.10.2026, see `onBlur`). A server error after submit puts
 * the field into the same live mode.
 *
 * The same look as the contact form — its field class is repeated here
 * rather than imported, because that form keeps its own local `Field`. If
 * the two drift apart visually, this is the file to align.
 */

const base =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-rock-900 placeholder:text-rock-400 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 '

export const inputClass = `${base}border-rock-200 focus-visible:border-rope focus-visible:outline-rope`
const invalidClass = `${base}border-error bg-error-soft focus-visible:border-error focus-visible:outline-error`
const validClass = `${base}border-available-text focus-visible:border-rope focus-visible:outline-rope`

type Rule = (value: string) => string | undefined

/**
 * `onSubmit` for the account forms: stops a send the browser already knows
 * is wrong — a missing consent, an empty or invalid field — before it
 * reaches the server.
 *
 * Why it matters: the server never sends a password back, so every failed
 * send emptied the password field, and a forgotten consent box cost the
 * whole password (reported 10.10.2026). The forms keep `noValidate` (no
 * browser bubbles in English); validity comes from our own rules, which
 * each `TextField` mirrors into the input (`setCustomValidity`), and from
 * `required` on the consent box. A blocked send marks every invalid field
 * (their `invalid` event) and focuses the first. React does not start the
 * form's action when `onSubmit` prevents the default. The server still
 * checks everything — this only saves a round trip that cost a password.
 */
export function stopInvalidSubmit(event: FormEvent<HTMLFormElement>) {
  const form = event.currentTarget
  // Only OUR rules (customError) and empty required fields block. The
  // browser's own checks disagree with ours: `type="email"` rejects
  // `żaneta@example.pl`, which the server accepts — blocking on it stopped
  // the send with no message at all, since our rule shows nothing.
  const blocking = Array.from(form.elements).filter(
    (el): el is HTMLInputElement =>
      el instanceof HTMLInputElement && (el.validity.customError || el.validity.valueMissing),
  )
  if (blocking.length === 0) return
  event.preventDefault()
  form.checkValidity() // fires `invalid` on each field, which shows its message
  blocking[0].focus()
}

export function TextField({
  id,
  name,
  label,
  type = 'text',
  required = false,
  autoComplete,
  hint,
  placeholder,
  error,
  defaultValue,
  validate,
  minLength,
}: {
  /** Unique across the document — use `useId()` (see ContactForm). */
  id: string
  name: string
  label: string
  type?: string
  required?: boolean
  autoComplete?: string
  hint?: string
  placeholder?: string
  /** The server's message for this field after a failed submit. */
  error?: string
  defaultValue?: string
  /** The field's rule from `lib/validation.ts` — shown live, see above. */
  validate?: Rule
  /** Shows "7 / 10 znaków" under the field while typing — for passwords. */
  minLength?: number
}) {
  const [value, setValue] = useState(defaultValue ?? '')
  const [touched, setTouched] = useState(Boolean(error))
  const [serverError, setServerError] = useState(error)
  const [previousError, setPreviousError] = useState(error)
  const inputRef = useRef<HTMLInputElement>(null)

  // React resets the whole form after every action (`form.reset()` in
  // react-dom), which puts the input back to its default WITHOUT an input
  // event — `value` here would keep the old text, and the password counter
  // would count characters no longer in the field. The reset event fires
  // BEFORE the values change, hence reading them on the next tick.
  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return
    const onReset = () =>
      setTimeout(() => {
        if (inputRef.current) setValue(inputRef.current.value)
      })
    form.addEventListener('reset', onReset)
    return () => form.removeEventListener('reset', onReset)
  }, [])
  // A new server error (another failed submit) takes over the field and puts
  // it in live mode — adjusted during render, the pattern Header.tsx uses.
  if (previousError !== error) {
    setPreviousError(error)
    setServerError(error)
    if (error) setTouched(true)
  }

  // Our rule, not the browser's, decides validity — see `stopInvalidSubmit`.
  useEffect(() => {
    inputRef.current?.setCustomValidity(validate?.(value) ?? '')
  }, [validate, value])

  const liveError = touched && validate ? validate(value) : undefined
  // The server's message stays until the person changes the field; after
  // that the live rule speaks, so a fixed field does not stay red.
  const shownError = serverError ?? liveError
  const passes = touched && Boolean(validate) && !shownError && value !== ''

  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const counterId = `${id}-counter`
  const describedBy = [
    shownError ? errorId : null,
    hint ? hintId : null,
    minLength ? counterId : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChange={(e) => {
            setValue(e.target.value)
            setServerError(undefined)
          }}
          // Leaving an EMPTY field is not a mistake yet — "Podaj adres e-mail"
          // under it pushed the links below down by a line, so a click on
          // "Nie pamiętam hasła" right after Safari's autofocus landed on
          // nothing (reported 16.10.2026). Empty counts on submit — `onInvalid`
          // where the form uses `stopInvalidSubmit`, the server's `error`
          // elsewhere (login) — or once something was typed.
          onBlur={(e) => {
            if (e.target.value !== '') setTouched(true)
          }}
          onInvalid={() => setTouched(true)}
          aria-describedby={describedBy || undefined}
          aria-invalid={shownError ? true : undefined}
          className={`${shownError ? invalidClass : passes ? validClass : inputClass} ${passes ? 'pr-10' : ''}`}
        />
        {passes && (
          <Check
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-available-text"
          />
        )}
      </div>
      {minLength !== undefined && (
        // Not red while typing: a counter is progress, not a mistake.
        <p
          id={counterId}
          aria-live="polite"
          className={`text-sm ${value.length >= minLength ? 'text-available-text' : 'text-rock-600'}`}
        >
          {passwordLengthLabel(value.length, minLength)}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-sm text-rock-600">
          {hint}
        </p>
      )}
      {shownError && (
        <p id={errorId} className="text-sm text-error">
          {shownError}
        </p>
      )}
    </div>
  )
}

/** The clause sits next to the box in full, never behind a link (lib/consent.ts). */
export function ConsentField({
  id,
  text,
  error,
  missing,
  defaultChecked,
}: {
  id: string
  text: string
  error?: string
  /** Shown when a send is stopped in the browser — the server's own message. */
  missing: string
  /** Kept ticked after a failed send — see `values` in `konto/actions.ts`. */
  defaultChecked?: boolean
}) {
  const [checked, setChecked] = useState(Boolean(defaultChecked))
  const [blocked, setBlocked] = useState(false)
  // Ticking the box clears its error at once, without waiting for a submit.
  const shownError = checked ? undefined : (error ?? (blocked ? missing : undefined))

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-start gap-3 text-sm leading-6 text-rock-600">
        <input
          id={id}
          name="consent"
          type="checkbox"
          required
          defaultChecked={defaultChecked}
          onChange={(e) => setChecked(e.target.checked)}
          onInvalid={() => setBlocked(true)}
          aria-describedby={shownError ? `${id}-error` : undefined}
          aria-invalid={shownError ? true : undefined}
          className="mt-1 size-4 shrink-0"
        />
        <span>
          <ConsentText text={text} />
        </span>
      </label>
      {shownError && (
        <p id={`${id}-error`} className="text-sm text-error">
          {shownError}
        </p>
      )}
    </div>
  )
}

/**
 * The bot trap. `hidden` rather than `display:none` in CSS — some bots read
 * stylesheets and skip fields hidden by style; tabIndex and autoComplete keep
 * it away from the keyboard and password managers.
 */
export function Honeypot() {
  return (
    <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" hidden />
  )
}

export function SubmitButton({
  pending,
  label,
  busyLabel,
}: {
  pending: boolean
  label: string
  busyLabel: string
}) {
  return (
    <div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-rope px-7 py-3.5 font-semibold text-white transition-colors hover:bg-rope-dark disabled:opacity-60"
      >
        {pending ? busyLabel : label}
      </button>
    </div>
  )
}
