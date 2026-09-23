'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

import { consentForStorage, newsletterConsentForStorage } from '@/lib/consent'
import { validateContact, validateNewsletter, isValid, looksLikeBot } from '@/lib/validation'
import type { ValidationErrors, NewsletterErrors } from '@/lib/validation'
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

  // The id of the course whose page the enquiry came from. The `course` field
  // in the collection exists for exactly this. We parse cautiously: the value
  // comes from the form, so it can be anything, and a `NaN` in a relationship
  // would break the save.
  const rawCourse = Number(formData.get('course'))
  const courseId = Number.isInteger(rawCourse) && rawCourse > 0 ? rawCourse : undefined

  // The bot honeypot — we fake success and store nothing.
  if (looksLikeBot(String(formData.get('website') ?? ''))) {
    return { status: 'sent' }
  }

  // SERVER-side validation. HTML `required` attributes are a convenience for the
  // visitor, not a safeguard — they are bypassed by anyone sending a request
  // without the form.
  const errors = validateContact(data)
  if (!isValid(errors)) {
    return { status: 'error', errors, message: 'Popraw zaznaczone pola.' }
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
      message: 'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę albo zadzwoń.',
    }
  }
}

// --- Newsletter --------------------------------------------------------------

export interface NewsletterState {
  status: 'idle' | 'subscribed' | 'error'
  errors?: NewsletterErrors
  message?: string
}

/**
 * Newsletter sign-up.
 *
 * Sending is not wired up yet (Brevo is a separate stage) — the address lands in
 * the database and waits there. That is deliberate: a field that stores nothing
 * loses the addresses of interested people, and those cannot be recovered.
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
    return { status: 'error', errors }
  }

  const email = data.email.trim().toLowerCase()

  try {
    const payload = await getPayload({ config })

    // The address is unique in the collection, so a repeat sign-up would fail on
    // a database constraint. For the person on the other side a repeat sign-up
    // is not an error but a confirmation — and that is how we report it. It also
    // revives someone who unsubscribed earlier and is now coming back.
    // ⚠️ `overrideAccess: true` — the only place in the code where an access
    // rule is bypassed. Reading this collection requires authentication (a list
    // of addresses is personal data), and here the request comes from an
    // anonymous visitor. It is safe because we check ONLY the address that this
    // person supplied a moment ago, and we answer identically regardless of the
    // result — so no way of probing who is on the list comes into being.
    const { docs } = await payload.find({
      collection: 'newsletter',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })

    if (docs[0]) {
      if (docs[0].status === 'unsubscribed') {
        await payload.update({
          collection: 'newsletter',
          id: docs[0].id,
          data: {
            status: 'subscribed',
            consentText: newsletterConsentForStorage(),
            consentDate: new Date().toISOString(),
          },
          overrideAccess: true,
        })
      }
      return { status: 'subscribed' }
    }

    await payload.create({
      collection: 'newsletter',
      data: {
        email,
        status: 'subscribed',
        consentText: newsletterConsentForStorage(),
        consentDate: new Date().toISOString(),
      },
      // Creation goes through the collection's `create` rule, exactly as with
      // the contact form — tightening it must break the form LOUDLY.
      overrideAccess: false,
    })

    return { status: 'subscribed' }
  } catch (error) {
    console.error('Failed to store a newsletter subscription:', error)
    return {
      status: 'error',
      message: 'Nie udało się zapisać. Spróbuj ponownie za chwilę.',
    }
  }
}
