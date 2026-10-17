'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { getPayload, AuthenticationError, LockedAuth, UnverifiedEmail, type Where } from 'payload'
import config from '@payload-config'

import { VERIFY_LINK_HOURS } from '@/collections/Customers'
import { sendAccountExistsEmail, sendPasswordLink, sendVerificationLink } from '@/lib/accountEmails'
import { clearLoginCookie, getCurrentCustomer, setLoginCookie } from '@/lib/auth'
import { claimBookings } from '@/lib/bookingEffects'
import { saveAccountDetails } from '@/lib/accountDetails'
import { accountConsentForStorage } from '@/lib/consent'
import { DEFAULT_LANGUAGE } from '@/lib/email/language'
import { accountDeletedEmail } from '@/lib/email/templates'
import {
  isValid,
  normalizePhone,
  looksLikeBot,
  safeNextPath,
  validateAccountDetails,
  validateEmailOnly,
  validateLogin,
  validateNewPassword,
  validateRegistration,
  type AccountDetailsErrors,
  type LoginErrors,
  type RegistrationErrors,
} from '@/lib/validation'

/**
 * Participant account actions.
 *
 * ⚠️ These are the only places that write to `customers` (its REST create and
 * update are closed — see `collections/Customers.ts`), so they use
 * `overrideAccess: true` AFTER doing the checks the access rule cannot: the
 * form's validation, the consent text, and for updates, that the change is
 * to the logged-in person's own account. Rate limiting is nginx's job
 * (`deploy/nginx.conf`, POST to the account pages).
 *
 * None of the answers reveal whether an address has an account. Registration
 * with a taken address, a reset request for an unknown one — the visitor sees
 * the same "check your inbox" either way, or the forms become a way to learn
 * who studies climbing here.
 */

const LOGIN_FAILED_MESSAGE =
  'Nieprawidłowy adres e-mail lub hasło. Po 5 nieudanych próbach logowanie blokuje się na 15 minut.'

const EMAIL_SENT_MESSAGE =
  'Jeśli adres jest poprawny, za chwilę przyjdzie mail z linkiem. Sprawdź też folder spam.'

export interface FormState<E> {
  status: 'idle' | 'done' | 'error'
  errors?: E
  message?: string
  /**
   * What the person typed, sent back with an error. React 19 resets a form
   * after every action, failed ones included — without this, one wrong field
   * wiped the whole form and "Popraw zaznaczone pola" pointed at empty
   * fields (reported 02.10.2026). Passwords are never sent back.
   */
  values?: Record<string, string>
  /**
   * Login only: the password was right but the address is not confirmed yet.
   * The form then offers "send the link again". Safe to tell, because Payload
   * reports it only after the password check (`auth/operations/login.js`).
   */
  unverified?: boolean
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '')
}

// --- Registration ------------------------------------------------------------

export async function registerAccount(
  _previous: FormState<RegistrationErrors>,
  formData: FormData,
): Promise<FormState<RegistrationErrors>> {
  const data = {
    firstName: field(formData, 'firstName'),
    lastName: field(formData, 'lastName'),
    email: field(formData, 'email'),
    phone: field(formData, 'phone'),
    password: field(formData, 'password'),
    consent: formData.get('consent') === 'on',
  }

  if (looksLikeBot(field(formData, 'website'))) return { status: 'done' }

  const values = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    consent: data.consent ? 'on' : '',
  }

  const errors = validateRegistration(data)
  if (!isValid(errors))
    return { status: 'error', errors, values, message: 'Popraw zaznaczone pola.' }

  const email = data.email.trim().toLowerCase()

  try {
    const payload = await getPayload({ config })

    // ⚠️ `overrideAccess: true` — reading an account is closed to anonymous
    // visitors. Safe: only this address is checked, and the answer is the
    // same either way.
    const { docs: existing } = await payload.find({
      collection: 'customers',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing[0]) {
      // The address already has an account. The PAGE says what it always
      // says — whoever typed the form learns nothing. The OWNER is told by
      // email: an unconfirmed account gets a fresh confirmation link, a
      // confirmed one a "you already have an account" email with a login
      // button (a plain reset email, used until 02.10.2026, read as a bug).
      if (existing[0]._verified) await sendAccountExistsEmail(payload, existing[0])
      else await sendVerificationLink(payload, existing[0])
      return { status: 'done' }
    }

    // Payload's own confirmation email is switched off — it is HTML only
    // (see `lib/accountEmails.ts`); ours goes out right after, in the
    // language picked here.
    const customer = await payload.create({
      collection: 'customers',
      data: {
        email,
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: normalizePhone(data.phone),
        language: DEFAULT_LANGUAGE,
        consentText: accountConsentForStorage(),
        consentDate: new Date().toISOString(),
      },
      overrideAccess: true,
      disableVerificationEmail: true,
    })
    await sendVerificationLink(payload, customer)
    return { status: 'done' }
  } catch (error) {
    console.error('Failed to register a participant account:', error)
    return {
      status: 'error',
      values,
      message: 'Nie udało się założyć konta. Spróbuj ponownie za chwilę albo zadzwoń.',
    }
  }
}

// --- Login -------------------------------------------------------------------

export async function logIn(
  _previous: FormState<LoginErrors>,
  formData: FormData,
): Promise<FormState<LoginErrors>> {
  const data = { email: field(formData, 'email'), password: field(formData, 'password') }
  const values = { email: data.email }
  const errors = validateLogin(data)
  if (!isValid(errors)) return { status: 'error', errors, values }

  let target: string
  try {
    const payload = await getPayload({ config })
    const { token, exp, user } = await payload.login({
      collection: 'customers',
      data: { email: data.email.trim().toLowerCase(), password: data.password },
    })
    if (!token) throw new Error('Payload returned no token')
    await setLoginCookie(token, exp)
    // A correct password proves the address: bookings made with it without
    // logging in now join the account. A failure here must not fail the login.
    if (user) await claimBookings(payload, user).catch((e) => console.error('claim failed:', e))
    target = safeNextPath(formData.get('next'))
  } catch (error) {
    if (error instanceof UnverifiedEmail) {
      return {
        status: 'error',
        values,
        unverified: true,
        message:
          'Najpierw potwierdź adres e-mail — kliknij link z maila, który wysłaliśmy po założeniu konta. Nie ma go albo wygasł? Wyślij nowy poniżej.',
      }
    }
    // ONE message for a wrong password and a locked account. Payload checks
    // the lock BEFORE the password (`checkLoginPermission` in
    // `auth/operations/login.js`), so a separate "locked" message would let
    // anyone confirm an address has an account: five wrong guesses, then
    // see whether the sixth says "locked". The lock is mentioned every time
    // instead, so a real participant still learns why it stopped working.
    if (error instanceof LockedAuth || error instanceof AuthenticationError) {
      return { status: 'error', values, message: LOGIN_FAILED_MESSAGE }
    }
    console.error('Failed to log a participant in:', error)
    return {
      status: 'error',
      values,
      message: 'Nie udało się zalogować. Spróbuj ponownie za chwilę.',
    }
  }
  // Outside try/catch: `redirect` works by throwing, and the catch above
  // would swallow it.
  redirect(target)
}

// --- Forgotten password ------------------------------------------------------

export async function requestPasswordReset(
  _previous: FormState<{ email?: string }>,
  formData: FormData,
): Promise<FormState<{ email?: string }>> {
  const email = field(formData, 'email')
  if (looksLikeBot(field(formData, 'website')))
    return { status: 'done', message: EMAIL_SENT_MESSAGE }

  const errors = validateEmailOnly(email)
  if (!isValid(errors)) return { status: 'error', errors, values: { email } }

  try {
    const payload = await getPayload({ config })
    // For an unknown address nothing is sent and nothing is said — the same
    // page either way.
    await sendPasswordLink(payload, email.trim().toLowerCase())
  } catch (error) {
    console.error('Failed to start a participant password reset:', error)
  }
  return { status: 'done', message: EMAIL_SENT_MESSAGE }
}

// --- Sending the confirmation link again ------------------------------------

const RESENT_MESSAGE =
  `Jeśli ten adres ma u nas konto, wysłaliśmy maila: nowy link potwierdzający (działa ${VERIFY_LINK_HOURS} godz., ` +
  'poprzednie przestały działać) albo — gdy adres jest już potwierdzony — przypomnienie, jak się zalogować. ' +
  'Sprawdź też folder spam.'

/**
 * A new confirmation link, by EITHER the address (the button after a correct
 * password at login, or the public `/konto/wyslij-link` page) or the token of
 * an expired link (the "link expired" page). The answer is the same whatever
 * happens — an address
 * without an account sends nothing. One ALREADY confirmed gets the "you
 * already have an account" email instead of a link (until 10.10.2026 it got
 * nothing, while the page said a link was on its way — reported in testing).
 * Rate limited by nginx with the other account forms.
 */
export async function resendVerification(
  _previous: FormState<{ email?: string }>,
  formData: FormData,
): Promise<FormState<{ email?: string }>> {
  const email = field(formData, 'email').trim().toLowerCase()
  const token = field(formData, 'token')
  if (looksLikeBot(field(formData, 'website'))) return { status: 'done', message: RESENT_MESSAGE }
  // A typo'd address is the person's own mistake to see — not a silent
  // "check your inbox" that never delivers. Says nothing about accounts.
  if (!token) {
    const errors = validateEmailOnly(email)
    if (!isValid(errors)) return { status: 'error', errors, values: { email } }
  }
  try {
    const payload = await getPayload({ config })
    // ⚠️ overrideAccess / showHiddenFields: anonymous visitors read no
    // accounts and the token is hidden. Only the one account matching what
    // this person holds (their address or their link) is looked at.
    const where: Where | null = token
      ? { _verificationToken: { equals: token } }
      : email
        ? { email: { equals: email } }
        : null
    if (where) {
      const { docs } = await payload.find({
        collection: 'customers',
        where,
        limit: 1,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })
      const customer = docs[0]
      if (customer?._verified) await sendAccountExistsEmail(payload, customer, 'resend')
      else if (customer) await sendVerificationLink(payload, customer)
    }
  } catch (error) {
    console.error('Failed to resend a participant confirmation link:', error)
  }
  return { status: 'done', message: RESENT_MESSAGE }
}

// --- Setting a new password from the emailed link ----------------------------

export async function setNewPassword(
  _previous: FormState<{ password?: string }>,
  formData: FormData,
): Promise<FormState<{ password?: string }>> {
  const token = field(formData, 'token')
  const password = field(formData, 'password')
  const errors = validateNewPassword(password)
  if (!isValid(errors)) return { status: 'error', errors }

  try {
    const payload = await getPayload({ config })
    const result = await payload.resetPassword({
      collection: 'customers',
      data: { token, password },
      overrideAccess: true,
    })
    // The link came by email, so using it proves the address — the same
    // proof the confirmation link gives. Payload does not mark it itself
    // (`auth/operations/resetPassword.js` keeps `_verified` as it was), and
    // without this an account created with a set-password link could never
    // log in.
    // `ResetPasswordResult` types the user loosely, hence the narrowing.
    const userId = result.user?.id
    if (typeof userId === 'number' || typeof userId === 'string') {
      const customer = await payload.update({
        collection: 'customers',
        id: userId,
        data: { _verified: true },
        overrideAccess: true,
      })
      // The address is proven — see `claimBookings`.
      await claimBookings(payload, customer).catch((e) => console.error('claim failed:', e))
    }
    if (result.token) await setLoginCookie(result.token, undefined)
  } catch (error) {
    console.error('Failed to set a participant password:', error)
    return {
      status: 'error',
      message:
        'Ten link jest nieważny albo już wygasł. Poproś o nowy w „Nie pamiętam hasła” — każdy działa 2 godziny i tylko raz.',
    }
  }
  redirect('/konto?password=set')
}

// --- Account settings --------------------------------------------------------

export async function updateLanguage(
  _previous: FormState<never>,
  formData: FormData,
): Promise<FormState<never>> {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/logowanie?next=/konto')

  const language = field(formData, 'language') === 'en' ? 'en' : 'pl'
  try {
    const payload = await getPayload({ config })
    // The id comes from the login, never from the form — nobody changes
    // someone else's account by editing a hidden field.
    await payload.update({
      collection: 'customers',
      id: customer.id,
      data: { language },
      overrideAccess: true,
    })
    // The saved choice goes back to the form: React resets the form after the
    // action to its `defaultValue` — the language the page was rendered with —
    // so the select jumped back and the change looked lost (reported
    // 10.10.2026), although it was saved.
    return { status: 'done', message: 'Zapisane.', values: { language } }
  } catch (error) {
    console.error('Failed to update a participant language:', error)
    return { status: 'error', message: 'Nie udało się zapisać. Spróbuj ponownie.' }
  }
}

/**
 * "Twoje dane" — name and phone, by the person themselves (decided
 * 18.10.2026; until then only the school could change them in the panel).
 *
 * The address is not here on purpose: changing it needs the NEW address
 * confirmed by email first, or a typo would lock the person out of their
 * own account — a separate piece of work.
 *
 * Upcoming bookings take the new details too — see `saveAccountDetails`.
 */
export async function updateAccountDetails(
  _previous: FormState<AccountDetailsErrors>,
  formData: FormData,
): Promise<FormState<AccountDetailsErrors>> {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/logowanie?next=/konto')

  const data = {
    firstName: field(formData, 'firstName'),
    lastName: field(formData, 'lastName'),
    phone: field(formData, 'phone'),
  }
  const values = { ...data }
  const errors = validateAccountDetails(data)
  if (!isValid(errors))
    return { status: 'error', errors, values, message: 'Popraw zaznaczone pola.' }

  const details = {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    phone: normalizePhone(data.phone),
  }
  try {
    const payload = await getPayload({ config })
    // The id comes from the login, never from the form.
    await saveAccountDetails(payload, customer.id, details)
    // The heading of the page shows the name — drawn again from the database.
    refresh()
    return { status: 'done', message: 'Zapisane.', values: details }
  } catch (error) {
    console.error('Failed to update participant details:', error)
    return { status: 'error', values, message: 'Nie udało się zapisać. Spróbuj ponownie.' }
  }
}

// --- Deleting the account ----------------------------------------------------

/**
 * "Usuń konto" — the right to erasure, without writing to the school.
 *
 * The password again, not just the login: a session left open on a shared
 * computer must not be enough to wipe someone's account. The id comes from
 * that session, never from the form.
 *
 * What goes: the account (name, phone, language, consent, login sessions).
 * What stays: the bookings — a separate purpose (organising the course,
 * accounting) with its own consent, and a copy of the contact data of their
 * own. Postgres unlinks them (`customer` is optional, so the foreign key sets
 * it to null); the page says so before, the email after. Erasing those too
 * is a request to the school, decided by its retention rules.
 */
export async function deleteAccount(
  _previous: FormState<{ password?: string }>,
  formData: FormData,
): Promise<FormState<{ password?: string }>> {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/logowanie?next=/konto/usun')

  const password = field(formData, 'password')
  if (!password) return { status: 'error', errors: { password: 'Wpisz hasło.' } }

  try {
    const payload = await getPayload({ config })
    try {
      await payload.login({ collection: 'customers', data: { email: customer.email, password } })
    } catch (error) {
      if (error instanceof LockedAuth) {
        return {
          status: 'error',
          message: 'Zbyt wiele nieudanych prób — spróbuj ponownie za 15 minut.',
        }
      }
      if (error instanceof AuthenticationError) {
        return { status: 'error', errors: { password: 'Nieprawidłowe hasło.' } }
      }
      throw error
    }

    await payload.delete({ collection: 'customers', id: customer.id, overrideAccess: true })
    await clearLoginCookie()

    const email = accountDeletedEmail(customer.language ?? 'pl', { firstName: customer.firstName })
    await payload
      .sendEmail({
        to: customer.email,
        replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })
      .catch((error) => console.error('Failed to send the account-deleted email:', error))
  } catch (error) {
    console.error('Failed to delete a participant account:', error)
    return { status: 'error', message: 'Nie udało się usunąć konta. Spróbuj ponownie za chwilę.' }
  }
  // Outside try/catch: `redirect` throws.
  redirect('/konto/usuniete')
}
