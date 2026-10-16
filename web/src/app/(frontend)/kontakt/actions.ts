'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

import { DEFAULT_LANGUAGE } from '@/lib/email/language'
import { consentForStorage } from '@/lib/consent'
import { subscribe } from '@/lib/newsletter'
import { validateContact, validateNewsletter, isValid, looksLikeBot } from '@/lib/validation'
import type { ContactFormData, ValidationErrors, NewsletterErrors } from '@/lib/validation'
import type { Message } from '@/payload-types'

type Topic = Message['topic']

/** Whether a course with this id still exists. An error is treated as "no". */
async function courseExists(
  payload: Awaited<ReturnType<typeof getPayload>>,
  id: number,
): Promise<boolean> {
  try {
    const { totalDocs } = await payload.count({
      collection: 'courses',
      where: { id: { equals: id } },
    })
    return totalDocs > 0
  } catch {
    return false
  }
}

export interface ContactFormState {
  status: 'idle' | 'sent' | 'error'
  errors?: ValidationErrors
  message?: string
  /**
   * What the visitor typed, sent back with an error. React 19 resets a form
   * after every action, failed ones included, so without this one wrong field
   * wiped the whole message (found 02.10.2026 on the registration form,
   * which shares the pattern).
   */
  values?: Record<string, string>
}

/** The form's fields as typed, for sending back with an error. */
function valuesOf(data: ContactFormData, course: string): Record<string, string> {
  return {
    course,
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.message,
    topic: data.topic,
    preferredDate: data.preferredDate,
    consent: data.consent ? 'on' : '',
  }
}

export async function sendMessage(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const data = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    message: String(formData.get('message') ?? ''),
    topic: String(formData.get('topic') ?? ''),
    preferredDate: String(formData.get('preferredDate') ?? ''),
    consent: formData.get('consent') === 'on',
  }

  // Which course, chosen in the second field when the topic is "Kurs" (or
  // preselected from a course page). Only kept with that topic — a course left
  // selected before switching to "Inna sprawa" is not the enquiry's subject.
  // We parse cautiously: the value comes from the form, so it can be anything,
  // and a `NaN` in a relationship would break the save.
  const courseValue = String(formData.get('course') ?? '')
  const rawCourse = Number(courseValue)
  const courseId =
    data.topic === 'course' && Number.isInteger(rawCourse) && rawCourse > 0 ? rawCourse : undefined

  // The bot honeypot — we fake success and store nothing.
  if (looksLikeBot(String(formData.get('website') ?? ''))) {
    return { status: 'sent' }
  }

  // SERVER-side validation. HTML `required` attributes are a convenience for the
  // visitor, not a safeguard — they are bypassed by anyone sending a request
  // without the form.
  const errors = validateContact(data)
  if (!isValid(errors)) {
    return {
      status: 'error',
      errors,
      values: valuesOf(data, courseValue),
      message: 'Popraw zaznaczone pola.',
    }
  }

  try {
    const payload = await getPayload({ config })

    // The course assignment is METADATA, while the message is the thing we are
    // here for. Should the course disappear from the panel between the form
    // being displayed and submitted, the relationship would point at a
    // non-existent entry and Payload would reject the WHOLE save — the person
    // writing would see an error and lose their message. So we check first and,
    // if need be, save without the assignment.
    const course = courseId && (await courseExists(payload, courseId)) ? courseId : undefined

    await payload.create({
      collection: 'messages',
      data: {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || undefined,
        message: data.message.trim(),
        // An empty select is stored as no value rather than an empty string —
        // Payload would reject '' as a value outside the list of options.
        topic: (data.topic.trim() || undefined) as Topic,
        preferredDate: data.preferredDate.trim() || undefined,
        course,
        status: 'new',
        language: DEFAULT_LANGUAGE,
        consentText: consentForStorage(),
        consentDate: new Date().toISOString(),
      },
      // The form is public, so the request carries no authenticated user.
      // `overrideAccess: false` forces it through the collection's `create`
      // rule rather than bypassing it — should anyone ever tighten that rule,
      // the form will break LOUDLY instead of silently going around it.
      overrideAccess: false,
    })
    return { status: 'sent' }
  } catch (error) {
    // The visitor is not shown the error text — it sometimes contains a
    // fragment of a database query. Everything goes to the log.
    console.error('Failed to store a message from the contact form:', error)
    return {
      status: 'error',
      values: valuesOf(data, courseValue),
      message: 'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę albo zadzwoń.',
    }
  }
}

// --- Newsletter --------------------------------------------------------------

export interface NewsletterState {
  status: 'idle' | 'subscribed' | 'error'
  errors?: NewsletterErrors
  message?: string
  /** The typed address, kept after an error — see `ContactFormState.values`. */
  values?: { email: string; consent: string }
}

/**
 * Newsletter sign-up: stores the address as `pending` and emails a
 * confirmation link (`lib/newsletter.ts`). Broadcasts go only to confirmed
 * addresses.
 */
export async function subscribeToNewsletter(
  _previous: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const data = {
    email: String(formData.get('email') ?? ''),
    consent: formData.get('newsletter-consent') === 'on',
  }

  if (looksLikeBot(String(formData.get('website') ?? ''))) {
    return { status: 'subscribed' }
  }

  const errors = validateNewsletter(data)
  if (!isValid(errors)) {
    return {
      status: 'error',
      errors,
      values: { email: data.email, consent: data.consent ? 'on' : '' },
    }
  }

  const email = data.email.trim().toLowerCase()

  try {
    const payload = await getPayload({ config })
    // Double opt-in, and the same answer whether the address was new, waiting
    // or already subscribed — see `lib/newsletter.ts`.
    await subscribe(payload, email, DEFAULT_LANGUAGE)
    return { status: 'subscribed' }
  } catch (error) {
    console.error('Failed to store a newsletter subscription:', error)
    return {
      status: 'error',
      values: { email: data.email, consent: data.consent ? 'on' : '' },
      message: 'Nie udało się zapisać. Spróbuj ponownie za chwilę.',
    }
  }
}
