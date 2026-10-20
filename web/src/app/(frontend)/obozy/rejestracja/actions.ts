'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

import {
  findByToken,
  registrationOpen,
  saveRegistration,
  sendRegistrationEmails,
} from '@/lib/campRegistration'
import {
  isValid,
  looksLikeBot,
  validateCampRegistration,
  type CampRegistrationErrors,
} from '@/lib/validation'

/**
 * The camp registration form (step 2) — from the link in the parent's email,
 * no account needed. The token in the form is checked again here: the page
 * that rendered the form proves nothing about the request that sends it.
 * The save itself is `saveRegistration` (one transaction); the emails come
 * after it and never undo it.
 */

export interface RegistrationState {
  status: 'idle' | 'done' | 'error'
  errors?: CampRegistrationErrors
  message?: string
  values?: Record<string, string>
  /** On success: the first save, or a correction of one sent before. */
  first?: boolean
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '')
}

export async function submitRegistration(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const token = field(formData, 'token')
  const data = {
    pesel: field(formData, 'pesel').replace(/\s+/g, ''),
    height: field(formData, 'height'),
    allergies: field(formData, 'allergies'),
    medications: field(formData, 'medications'),
    diet: field(formData, 'diet'),
    conditions: field(formData, 'conditions'),
    activitiesConsent: formData.get('activitiesConsent') === 'on',
    photoConsent: formData.get('photoConsent') === 'on',
    invoiceRequested: formData.get('invoiceRequested') === 'on',
    consent: formData.get('consent') === 'on',
  }
  const values = {
    ...data,
    activitiesConsent: data.activitiesConsent ? 'on' : '',
    photoConsent: data.photoConsent ? 'on' : '',
    invoiceRequested: data.invoiceRequested ? 'on' : '',
    consent: data.consent ? 'on' : '',
  }

  if (looksLikeBot(field(formData, 'website'))) return { status: 'done' }

  const errors = validateCampRegistration(data)
  if (!isValid(errors)) {
    return { status: 'error', errors, values, message: 'Popraw zaznaczone pola.' }
  }

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
    const saved = await saveRegistration(payload, ctx, {
      pesel: data.pesel,
      heightCm: Number(data.height.trim()),
      allergies: data.allergies,
      medications: data.medications,
      diet: data.diet,
      conditions: data.conditions,
      photoConsent: data.photoConsent,
      invoiceRequested: data.invoiceRequested,
    })
    await sendRegistrationEmails(payload, ctx, token, saved)
    return { status: 'done', first: saved.first }
  } catch (error) {
    console.error('Failed to store a camp registration form:', error)
    return {
      status: 'error',
      values,
      message: 'Nie udało się zapisać formularza. Spróbuj ponownie za chwilę albo zadzwoń.',
    }
  }
}
