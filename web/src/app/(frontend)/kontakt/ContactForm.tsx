'use client'

import { useActionState, useId } from 'react'

import { CONSENT_TEXT } from '@/lib/consent'
import { TOPICS } from '@/lib/topics'
import { sendMessage, type ContactFormState } from './actions'

const INITIAL_STATE: ContactFormState = { status: 'idle' }

const pole =
  'w-full rounded-lg border border-rock-200 bg-white px-3.5 py-2.5 text-rock-900 ' +
  'placeholder:text-rock-400 focus-visible:border-rope focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-rope'

export function ContactForm({
  topic,
  course,
}: {
  topic?: string
  /** The course whose page the visitor came from — attached to the enquiry. */
  course?: { id: number; title: string }
}) {
  const [state, action, pending] = useActionState(sendMessage, INITIAL_STATE)
  // ⚠️ Field ids MUST be unique across the whole document, not just the form.
  // This used to read `id="message"` — exactly the name of the content
  // container in the layout (the target of the skip link).
  // Measured: the label "Wiadomość" then bound to NO field at all, because
  // `label[for]` resolves to the first element with that id in the document,
  // and that was a <div>. Clicking the label set no focus and the screen reader
  // had nothing to announce. `useId()` takes the burden of watching for this
  // off us on every new field name.
  const prefix = useId()
  const fieldId = (name: string) => `${prefix}-${name}`

  if (state.status === 'sent') {
    return (
      // role="status" makes the screen reader announce the confirmation —
      // without it a blind visitor never learns anything happened.
      <div role="status" className="rounded-2xl border border-rock-200 bg-white p-8">
        <h2 className="text-xl font-semibold">Dziękujemy, wiadomość dotarła.</h2>
        <p className="mt-2 text-rock-600">
          Odpowiadamy zwykle tego samego dnia. Jeśli sprawa jest pilna, zadzwoń albo wyślij SMS.
        </p>
      </div>
    )
  }

  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-rock-200 bg-white p-6 lg:p-8"
    >
      <h2 className="text-[24px] leading-tight">Napisz do nas</h2>

      {course && (
        <>
          <p className="rounded-lg bg-rope-soft px-4 py-3 text-sm text-rope-dark">
            Zapytanie dotyczy kursu <strong>{course.title}</strong>.
          </p>
          <input type="hidden" name="course" value={course.id} />
        </>
      )}

      {state.message && (
        <p
          role="alert"
          className="rounded-lg border border-rope bg-rope-soft px-4 py-3 text-rope-dark"
        >
          {state.message}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={fieldId('name')}
          name="name"
          label="Imię i nazwisko"
          wymagane
          autoComplete="name"
          placeholder="Anna Kowalska"
          blad={state.errors?.name}
        />
        <Field
          id={fieldId('phone')}
          name="phone"
          label="Telefon"
          kind="tel"
          autoComplete="tel"
          placeholder="600 000 000"
          podpowiedz="Nieobowiązkowy — ułatwia szybki kontakt."
          blad={state.errors?.phone}
        />
      </div>

      <Field
        id={fieldId('email')}
        name="email"
        label="Adres e-mail"
        kind="email"
        wymagane
        autoComplete="email"
        placeholder="anna@example.com"
        blad={state.errors?.email}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId('topic')} className="font-medium">
          Czego dotyczy zapytanie
        </label>
        <select
          id={fieldId('topic')}
          name="topic"
          // Preselected when the visitor arrived from a course or camp page.
          defaultValue={topic ?? ''}
          aria-describedby={state.errors?.topic ? fieldId('temat-blad') : undefined}
          aria-invalid={state.errors?.topic ? true : undefined}
          className={pole}
        >
          <option value="">— wybierz —</option>
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {state.errors?.topic && (
          <p id={fieldId('temat-blad')} className="text-sm text-rope">
            {state.errors.topic}
          </p>
        )}
      </div>

      <Field
        id={fieldId('preferredDate')}
        name="preferredDate"
        label="Preferowany termin"
        podpowiedz="Nieobowiązkowe — np. „pierwsza połowa czerwca”."
        placeholder="np. pierwsza połowa czerwca"
        blad={state.errors?.preferredDate}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId('message')} className="font-medium">
          Wiadomość <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={fieldId('message')}
          name="message"
          rows={5}
          required
          placeholder="Napisz, ile masz doświadczenia i czego oczekujesz od kursu."
          aria-describedby={state.errors?.message ? fieldId('tresc-blad') : undefined}
          aria-invalid={state.errors?.message ? true : undefined}
          className={pole}
        />
        {state.errors?.message && (
          <p id={fieldId('tresc-blad')} className="text-sm text-rope">
            {state.errors.message}
          </p>
        )}
      </div>

      {/* Pułapka na roboty. `hidden` zamiast `display:none` w CSS — część botów
          czyta arkusze stylów i omija pola ukryte stylem. tabIndex i autoComplete
          trzymają ją poza zasięgiem klawiatury i menedżerów haseł. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        hidden
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={fieldId('consent')}
          className="flex items-start gap-3 text-sm leading-6 text-rock-600"
        >
          <input
            id={fieldId('consent')}
            name="consent"
            type="checkbox"
            required
            aria-describedby={state.errors?.consent ? fieldId('zgoda-blad') : undefined}
            aria-invalid={state.errors?.consent ? true : undefined}
            className="mt-1 size-4 shrink-0"
          />
          {/* Pełna treść klauzuli jest widoczna przy polu, a nie schowana pod
              linkiem. Ta sama treść trafia do bazy razem ze zgłoszeniem. */}
          <span>{CONSENT_TEXT}</span>
        </label>
        {state.errors?.consent && (
          <p id={fieldId('zgoda-blad')} className="text-sm text-rope">
            {state.errors.consent}
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-banner-fill px-7 py-3.5 font-semibold text-white transition-colors hover:bg-banner-fill-dark disabled:opacity-60"
        >
          {pending ? 'Wysyłam…' : 'Wyślij zapytanie'}
        </button>
      </div>
    </form>
  )
}

function Field({
  id,
  name,
  label,
  kind = 'text',
  wymagane = false,
  autoComplete,
  podpowiedz,
  placeholder,
  blad,
}: {
  /** Unique across the document — see the `useId()` comment above. */
  id: string
  name: string
  label: string
  kind?: string
  wymagane?: boolean
  autoComplete?: string
  podpowiedz?: string
  placeholder?: string
  blad?: string
}) {
  const idBledu = `${id}-blad`
  const idPodpowiedzi = `${id}-podpowiedz`
  const opisy = [blad ? idBledu : null, podpowiedz ? idPodpowiedzi : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label} {wymagane && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={kind}
        required={wymagane}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={opisy || undefined}
        aria-invalid={blad ? true : undefined}
        className={pole}
      />
      {podpowiedz && (
        <p id={idPodpowiedzi} className="text-sm text-rock-600">
          {podpowiedz}
        </p>
      )}
      {blad && (
        <p id={idBledu} className="text-sm text-rope">
          {blad}
        </p>
      )}
    </div>
  )
}
