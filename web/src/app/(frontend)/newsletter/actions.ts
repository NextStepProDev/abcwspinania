'use server'

import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { confirmSubscription, unsubscribeByToken } from '@/lib/newsletter'

/**
 * The two buttons behind the newsletter links. Plain form actions that end
 * in a redirect, so they work without JavaScript; the result travels in the
 * address (`?result=`), not the token — the page after it has nothing to
 * leak if it is shared.
 *
 * A BUTTON, not the link itself: mail scanners open every link in an email
 * before the person does. For an account that only proves the address
 * (`konto/potwierdz` confirms on opening); here a scanner would give consent
 * on someone's behalf, or withdraw it.
 */

function tokenOf(formData: FormData): string {
  return String(formData.get('token') ?? '')
}

export async function confirmNewsletter(formData: FormData): Promise<void> {
  let result = 'invalid'
  try {
    const payload = await getPayload({ config })
    result = await confirmSubscription(payload, tokenOf(formData))
  } catch (error) {
    console.error('Failed to confirm a newsletter subscription:', error)
    result = 'error'
  }
  redirect(`/newsletter/potwierdz?result=${result}`)
}

export async function unsubscribeNewsletter(formData: FormData): Promise<void> {
  let result = 'invalid'
  try {
    const payload = await getPayload({ config })
    result = (await unsubscribeByToken(payload, tokenOf(formData))) ? 'done' : 'invalid'
  } catch (error) {
    console.error('Failed to unsubscribe from the newsletter:', error)
    result = 'error'
  }
  redirect(`/newsletter/wypisz?result=${result}`)
}
