'use client'

import { useActionState, useId } from 'react'

import { FormAlert, FormDone, TextLink } from '@/components/AccountForm'
import {
  ConsentField,
  Honeypot,
  SubmitButton,
  TextField,
  inputClass,
  stopInvalidSubmit,
} from '@/components/AccountFields'
import { ACCOUNT_CONSENT_TEXT, BOOKING_CONSENT_TEXT } from '@/lib/consent'
import { BOOKING_CONSENT_MISSING, checkEmail, checkName, checkPhone } from '@/lib/validation'
import { bookCourse, type BookingState } from './actions'
import { ConsentText } from '@/components/ConsentText'

export interface SessionChoice {
  id: number
  dates: string
  /** "3 wolne", "brak miejsc — lista rezerwowa", "zapytaj o miejsca". */
  spots: string
  full: boolean
  note: string | null
}

const INITIAL: BookingState = { status: 'idle' }

// The server's rules, shown live (lib/validation.ts).
const firstNameRule = (v: string) => checkName(v, 'Podaj imię.')
const lastNameRule = (v: string) => checkName(v, 'Podaj nazwisko.')

export function BookingForm({
  courseId,
  sessions,
  preselected,
  customer,
  loginHref,
}: {
  courseId: number
  sessions: SessionChoice[]
  preselected: number | null
  /** Logged in: the contact details come from the account. */
  customer: { name: string; email: string; phone: string } | null
  loginHref: string
}) {
  const [state, action, pending] = useActionState(bookCourse, INITIAL)
  const id = useId()

  if (state.status === 'done') {
    return (
      <FormDone title={state.waitlist ? 'Jesteś na liście rezerwowej' : 'Zgłoszenie przyjęte'}>
        <p>
          {state.waitlist
            ? 'Ten termin jest pełny. Gdy zwolni się miejsce, odezwiemy się od razu.'
            : 'Dziękujemy! Potwierdzimy miejsce i prześlemy szczegóły — zwykle tego samego dnia.'}{' '}
          Potwierdzenie wysłaliśmy mailem.
        </p>
        {state.accountEmail && (
          // Read as an aside ("a link to the account"), it got skipped — yet
          // without that email the account never works (reported 17.10.2026).
          <p className="mt-2">
            <strong className="text-rock-900">Ważne: sprawdź skrzynkę.</strong> W osobnym mailu
            wyślemy link do ustawienia hasła. Dopiero po ustawieniu hasła konto zacznie działać i
            zobaczysz w nim ten zapis — nie odkładaj tego, link działa krótko.
          </p>
        )}
        {customer && (
          <p className="mt-2">
            <TextLink href="/konto">Przejdź do Mojego konta</TextLink>
          </p>
        )}
      </FormDone>
    )
  }

  const chosen = state.values?.sessionId ? Number(state.values.sessionId) : preselected
  const defaultSession = sessions.some((s) => s.id === chosen) ? chosen : sessions[0]?.id

  return (
    <form action={action} onSubmit={stopInvalidSubmit} noValidate className="flex flex-col gap-6">
      {state.message && (
        <FormAlert>
          {state.message} {state.loginExpired && <TextLink href={loginHref}>Zaloguj się</TextLink>}
        </FormAlert>
      )}
      <input type="hidden" name="courseId" value={courseId} />
      {/* Tells the server this form had no contact fields — see `loginExpired`. */}
      {customer && <input type="hidden" name="asCustomer" value="1" />}

      {/* `min-w-0`: a fieldset is as wide as its content by default, so one
          long "brak miejsc — lista rezerwowa" pushed the whole form off a
          phone's screen (found in testing 12.10.2026). */}
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 font-medium">
          Termin <span aria-hidden="true">*</span>
        </legend>
        {sessions.map((s) => (
          <label
            key={s.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-rock-200 px-4 py-3 has-[:checked]:border-rope has-[:checked]:bg-rope-soft"
          >
            <input
              type="radio"
              name="sessionId"
              value={s.id}
              defaultChecked={s.id === defaultSession}
              className="size-4 shrink-0"
            />
            {/* On a phone the places go under the date — beside it, "1 wolne"
                broke into two lines and the date into three. */}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span>
                <span className="font-medium tabular-nums">{s.dates}</span>
                {s.note && <span className="block text-sm text-rock-600">{s.note}</span>}
              </span>
              <span
                className={`text-sm sm:shrink-0 sm:text-right ${s.full ? 'text-rock-400' : 'text-available-text'}`}
              >
                {s.spots}
              </span>
            </span>
          </label>
        ))}
        {state.errors?.sessionId && <p className="text-sm text-error">{state.errors.sessionId}</p>}
      </fieldset>

      {customer ? (
        <div className="rounded-lg bg-rock-75 px-4 py-3 text-sm text-rock-600">
          Zapisujesz się jako <strong className="text-rock-900">{customer.name}</strong> (
          {customer.email}, {customer.phone}).
        </div>
      ) : (
        <>
          <p className="text-sm text-rock-600">
            Masz konto? <TextLink href={loginHref}>Zaloguj się</TextLink> — nie trzeba będzie
            wpisywać danych.
          </p>
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
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-notes`} className="font-medium">
          Uwagi
        </label>
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="Np. doświadczenie, własny sprzęt, pytania."
          defaultValue={state.values?.notes}
          aria-describedby={state.errors?.notes ? `${id}-notes-error` : undefined}
          aria-invalid={state.errors?.notes ? true : undefined}
          className={inputClass}
        />
        {state.errors?.notes && (
          <p id={`${id}-notes-error`} className="text-sm text-error">
            {state.errors.notes}
          </p>
        )}
      </div>

      <Honeypot />
      <ConsentField
        id={`${id}-consent`}
        text={BOOKING_CONSENT_TEXT}
        error={state.errors?.consent}
        missing={BOOKING_CONSENT_MISSING}
        defaultChecked={state.values?.consent === 'on'}
      />

      {!customer && (
        <label className="flex items-start gap-3 text-sm leading-6 text-rock-600">
          <input
            name="createAccount"
            type="checkbox"
            defaultChecked={state.values?.createAccount === 'on'}
            className="mt-1 size-4 shrink-0"
          />
          <span>
            <strong className="text-rock-900">Załóż mi konto z tych danych</strong> — przyjdzie link
            do ustawienia hasła. <ConsentText text={ACCOUNT_CONSENT_TEXT} />
          </span>
        </label>
      )}

      <SubmitButton pending={pending} label="Zapisz się" busyLabel="Zapisuję…" />
    </form>
  )
}
