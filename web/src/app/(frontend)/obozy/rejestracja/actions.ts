'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

import {
  findByToken,
  openChildren,
  registrationOpen,
  saveRegistration,
  sendRegistrationEmails,
  type RegistrationChildInput,
} from '@/lib/campRegistration'
import {
  isValid,
  looksLikeBot,
  normalizeNip,
  validateRegistrationChild,
  validateRegistrationShared,
  type RegistrationChildData,
  type RegistrationChildErrors,
  type RegistrationSharedErrors,
} from '@/lib/validation'

/**
 * The camp registration form (step 2) — from the link in the parent's email,
 * no account needed; one form for the children signed up together, a part
 * per child (decided 21.10.2026). The token in the form is checked again
 * here: the page that rendered the form proves nothing about the request
 * that sends it, and the children come from the token, never from the form.
 * The save is `saveRegistration` (one transaction); the emails come after it
 * and never undo it.
 */

export interface RegistrationState {
  status: 'idle' | 'done' | 'error'
  /** The shared part's errors (address, consents). */
  errors?: RegistrationSharedErrors
  /** Each child's errors, by booking id. */
  childErrors?: Record<number, RegistrationChildErrors>
  message?: string
  /** What was typed, sent back on an error — field names as in the form. */
  values?: Record<string, string>
  /** On success: the first save, or a correction of one sent before. */
  first?: boolean
  /** The first save's email carried the contract (not without a price). */
  contractAttached?: boolean
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '')
}

/** One child's fields: `<name>_<booking id>`, so the parts never mix. */
function childOf(formData: FormData, id: number): RegistrationChildData {
  return {
    pesel: field(formData, `pesel_${id}`).replace(/\s+/g, ''),
    height: field(formData, `height_${id}`),
    allergies: field(formData, `allergies_${id}`),
    medications: field(formData, `medications_${id}`),
    diet: field(formData, `diet_${id}`),
    conditions: field(formData, `conditions_${id}`),
    photoConsent: formData.get(`photoConsent_${id}`) === 'on',
  }
}

export async function submitRegistration(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const token = field(formData, 'token')
  const shared = {
    street: field(formData, 'street'),
    postcode: field(formData, 'postcode'),
    city: field(formData, 'city'),
    invoiceRequested: formData.get('invoiceRequested') === 'on',
    invoiceCompany: formData.get('invoiceCompany') === 'on',
    invoiceCompanyName: field(formData, 'invoiceCompanyName'),
    invoiceNip: field(formData, 'invoiceNip'),
    invoiceCompanyAddress: field(formData, 'invoiceCompanyAddress'),
    activitiesConsent: formData.get('activitiesConsent') === 'on',
    consent: formData.get('consent') === 'on',
  }
  // Everything typed, by its form name, to put back on an error.
  const values: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && key !== 'token' && !key.startsWith('$')) values[key] = value
  }

  if (looksLikeBot(field(formData, 'website'))) return { status: 'done' }

  try {
    const payload = await getPayload({ config })
    const ctx = await findByToken(payload, token)
    // Closed between rendering and sending (the camp began, the school
    // cancelled the booking): the page says why on the next load.
    if (!ctx || registrationOpen(ctx) !== 'open') {
      return {
        status: 'error',
        values,
        message: 'Tego formularza nie można już wysłać. Odśwież stronę, żeby zobaczyć dlaczego.',
      }
    }

    const open = openChildren(ctx)
    const children = Object.fromEntries(
      open.map((c) => [c.booking.id, childOf(formData, c.booking.id)]),
    )
    const errors = validateRegistrationShared(shared)
    const childErrors: Record<number, RegistrationChildErrors> = {}
    for (const { booking } of open) {
      const e = validateRegistrationChild(children[booking.id]!)
      if (!isValid(e)) childErrors[booking.id] = e
    }
    if (!isValid(errors) || !isValid(childErrors)) {
      return { status: 'error', errors, childErrors, values, message: 'Popraw zaznaczone pola.' }
    }

    const saved = await saveRegistration(payload, ctx, {
      address: { street: shared.street, postcode: shared.postcode, city: shared.city },
      invoiceRequested: shared.invoiceRequested,
      invoiceCompany:
        shared.invoiceRequested && shared.invoiceCompany
          ? {
              name: shared.invoiceCompanyName,
              nip: normalizeNip(shared.invoiceNip),
              address: shared.invoiceCompanyAddress,
            }
          : null,
      children: Object.fromEntries(
        Object.entries(children).map(([id, c]): [string, RegistrationChildInput] => [
          id,
          {
            pesel: c.pesel,
            heightCm: Number(c.height.trim()),
            allergies: c.allergies,
            medications: c.medications,
            diet: c.diet,
            conditions: c.conditions,
            photoConsent: c.photoConsent,
          },
        ]),
      ),
    })
    const sent = await sendRegistrationEmails(payload, ctx, saved)
    return { status: 'done', first: saved.first, contractAttached: sent.contractAttached }
  } catch (error) {
    console.error('Failed to store a camp registration form:', error)
    return {
      status: 'error',
      values,
      message: 'Nie udało się zapisać formularza. Spróbuj ponownie za chwilę albo zadzwoń.',
    }
  }
}
