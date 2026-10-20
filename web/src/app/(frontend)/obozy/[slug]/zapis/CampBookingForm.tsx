'use client'

import { useActionState, useId, useState } from 'react'

import { FormAlert, FormDone, TextLink } from '@/components/AccountForm'
import {
  ConsentField,
  Honeypot,
  SubmitButton,
  TextField,
  inputClass,
  stopInvalidSubmit,
} from '@/components/AccountFields'
import { ConsentText } from '@/components/ConsentText'
import { SessionChoices, type SessionChoice } from '@/components/SessionChoices'
import { ACCOUNT_CONSENT_TEXT, CAMP_BOOKING_CONSENT_TEXT } from '@/lib/consent'
import {
  BOOKING_CONSENT_MISSING,
  checkEmail,
  checkName,
  checkPhone,
  type ChildData,
  type ChildErrors,
} from '@/lib/validation'
import { bookCamp, type CampBookingState } from './actions'

const INITIAL: CampBookingState = { status: 'idle' }

// The server's rules, shown live (lib/validation.ts).
const firstNameRule = (v: string) => checkName(v, 'Podaj imię.')
const lastNameRule = (v: string) => checkName(v, 'Podaj nazwisko.')
const childFirstNameRule = (v: string) => checkName(v, 'Podaj imię dziecka.')
const childLastNameRule = (v: string) => checkName(v, 'Podaj nazwisko dziecka.')

/**
 * The children, one row each — siblings go in one sign-up. "Dodaj kolejne
 * dziecko" needs JavaScript; without it the form takes one child, which is
 * still a whole sign-up. Rows have their own keys, and the server's errors
 * are pinned to the row they came for, so removing a row keeps what was
 * typed in the others and each error with its child — by position, the
 * error of a removed row slid onto the next child.
 */
function ChildrenFields({
  initial,
  errors,
  max,
}: {
  initial: ChildData[]
  errors: (ChildErrors | undefined)[] | undefined
  max: number
}) {
  const id = useId()
  const [rows, setRows] = useState(() =>
    (initial.length ? initial : [{ firstName: '', lastName: '' }]).map((child, i) => ({
      key: i,
      child,
      errors: errors?.[i],
    })),
  )
  const [next, setNext] = useState(rows.length)

  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-1 font-medium">
        {rows.length > 1 ? 'Dzieci, które zapisujesz' : 'Dziecko, które zapisujesz'}
      </legend>
      {rows.map((row, i) => (
        <div key={row.key} className="rounded-lg border border-rock-200 p-4">
          {/* One child needs no number — the legend already says who it is. */}
          {rows.length > 1 && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-rock-600">Dziecko {i + 1}</span>
              <button
                type="button"
                onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                className="text-sm font-medium text-rope underline-offset-4 hover:underline"
              >
                Usuń
              </button>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id={`${id}-child-${row.key}-first`}
              name="childFirstName"
              label="Imię dziecka"
              required
              defaultValue={row.child.firstName}
              validate={childFirstNameRule}
              error={row.errors?.firstName}
            />
            <TextField
              id={`${id}-child-${row.key}-last`}
              name="childLastName"
              label="Nazwisko dziecka"
              required
              defaultValue={row.child.lastName}
              validate={childLastNameRule}
              error={row.errors?.lastName}
            />
          </div>
        </div>
      ))}
      {rows.length < max && (
        <button
          type="button"
          onClick={() => {
            setRows([
              ...rows,
              { key: next, child: { firstName: '', lastName: '' }, errors: undefined },
            ])
            setNext(next + 1)
          }}
          className="self-start rounded-lg border border-rock-200 px-4 py-2 text-sm font-medium hover:border-rope"
        >
          + Dodaj kolejne dziecko
        </button>
      )}
      <p className="text-sm text-rock-600">
        Rodzeństwo zapisz tutaj razem — każde dziecko dostaje swoje miejsce i swój formularz
        rejestracyjny.
      </p>
    </fieldset>
  )
}

export function CampBookingForm({
  campId,
  sessions,
  preselected,
  maxChildren,
  customer,
  loginHref,
}: {
  campId: number
  sessions: SessionChoice[]
  preselected: number | null
  maxChildren: number
  /** Logged in: the parent's details come from the account. */
  customer: { name: string; email: string; phone: string } | null
  loginHref: string
}) {
  const [state, action, pending] = useActionState(bookCamp, INITIAL)
  const id = useId()

  if (state.status === 'done') {
    const booked = state.booked ?? []
    const waiting = booked.filter((b) => b.waitlist)
    const allWaiting = booked.length > 0 && waiting.length === booked.length
    return (
      <FormDone title={allWaiting ? 'Lista rezerwowa' : 'Zapis przyjęty'}>
        {booked.length > 0 && (
          <ul className="mb-2 list-disc pl-5">
            {/* By position: two children may share a name. */}
            {booked.map((b, i) => (
              <li key={i}>
                {b.name} — {b.waitlist ? 'lista rezerwowa' : 'miejsce zarezerwowane'}
              </li>
            ))}
          </ul>
        )}
        <p>
          {/* Every child on the waiting list: no registration form went out. */}
          {allWaiting
            ? 'Turnus jest pełny — potwierdzenie wysłaliśmy mailem.'
            : 'Sprawdź skrzynkę: dla każdego dziecka z miejscem wysłaliśmy osobny mail z linkiem do formularza rejestracyjnego. Po jego wypełnieniu prześlemy umowę i dane do przelewu zaliczki.'}
          {waiting.length > 0 &&
            ' Gdy zwolni się miejsce dla dziecka z listy rezerwowej, odezwiemy się od razu.'}
        </p>
        {state.accountEmail && (
          <p className="mt-2">
            <strong className="text-rock-900">Ważne:</strong> w osobnym mailu wyślemy też link do
            ustawienia hasła. Dopiero po ustawieniu hasła konto zacznie działać — link działa
            krótko.
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
      <input type="hidden" name="campId" value={campId} />
      {customer && <input type="hidden" name="asCustomer" value="1" />}

      <SessionChoices
        legend="Turnus"
        sessions={sessions}
        defaultId={defaultSession}
        error={state.errors?.sessionId}
      />

      {/* Remounted after each failed submit, so the rows match what came back. */}
      <ChildrenFields
        key={JSON.stringify(state.children ?? null)}
        initial={state.children ?? []}
        errors={state.errors?.children}
        max={maxChildren}
      />
      {state.errors?.childrenCount && (
        <p className="-mt-3 text-sm text-error">{state.errors.childrenCount}</p>
      )}

      {customer ? (
        <div className="rounded-lg bg-rock-75 px-4 py-3 text-sm text-rock-600">
          Zapisujesz jako rodzic: <strong className="text-rock-900">{customer.name}</strong> (
          {customer.email}, {customer.phone}).
        </div>
      ) : (
        <fieldset className="flex min-w-0 flex-col gap-5">
          <legend className="mb-1 font-medium">Twoje dane (rodzic lub opiekun)</legend>
          <p className="-mt-2 text-sm text-rock-600">
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
            hint="Na ten adres przyjdzie formularz rejestracyjny i umowa."
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
        </fieldset>
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
          placeholder="Np. pytania o obóz, dziecko jedzie z kolegą."
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
        text={CAMP_BOOKING_CONSENT_TEXT}
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
            <strong className="text-rock-900">Załóż mi konto z tych danych</strong> (nieobowiązkowe)
            — w koncie zobaczysz zapisy dzieci. Przyjdzie link do ustawienia hasła.{' '}
            <ConsentText text={ACCOUNT_CONSENT_TEXT} />
          </span>
        </label>
      )}

      <SubmitButton pending={pending} label="Zapisz dziecko" busyLabel="Zapisuję…" />
    </form>
  )
}
