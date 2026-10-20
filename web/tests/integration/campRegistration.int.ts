import assert from 'node:assert/strict'

import type { PayloadRequest } from 'payload'

import { createCampBookings } from '@/lib/bookingService'
import {
  deleteExpiredRegistrations,
  findByToken,
  registrationLinkHandler,
  registrationOpen,
  saveRegistration,
  sendDepositReminders,
  sendRegistrationEmails,
  sendRegistrationReminders,
  type RegistrationInput,
} from '@/lib/campRegistration'
import { erasePerson, personDataCopy } from '@/lib/personErasure'

import { email, http, makeCamp, makeSession, outbox, payload, test } from './harness'

/**
 * The camp registration form (`lib/campRegistration.ts`): the link's token,
 * the save, the link after the waiting list, the reminder, and the health
 * data going a month after the camp — and with its booking.
 */

const form: RegistrationInput = {
  pesel: '15230701232',
  heightCm: 142,
  allergies: 'Orzechy',
  medications: '',
  diet: 'Wegetariańska',
  conditions: '',
  photoConsent: true,
  invoiceRequested: true,
}

async function signUp(parent: string, child: string, options: { capacity?: number } = {}) {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true, capacity: options.capacity ?? 5 })
  const result = await createCampBookings(payload, {
    sessionId: session.id,
    campId: camp.id,
    contact: { firstName: parent, lastName: 'Test', email: email(parent), phone: '+48600100200' },
    children: [{ firstName: child, lastName: 'Test' }],
    notes: null,
    language: 'pl',
    customerId: null,
    wantsAccount: false,
  })
  assert.ok(result.kind === 'done')
  return { camp, session, child: result.children[0] }
}

async function registrationsOf(bookingId: number) {
  const { docs } = await payload.find({
    collection: 'camp-registrations',
    where: { booking: { equals: bookingId } },
    depth: 0,
    overrideAccess: true,
  })
  return docs
}

test('the link opens its own child’s form; a made-up token opens nothing', async () => {
  const { child } = await signUp('reglink', 'Zosia')
  const ctx = await findByToken(payload, child.registrationToken!)
  assert.equal(ctx?.booking.id, child.booking.id)
  assert.equal(registrationOpen(ctx!), 'open')
  assert.equal(await findByToken(payload, 'f'.repeat(64)), null)
  assert.equal(await findByToken(payload, ''), null)
})

test('the form saves once, corrects in place, and puts the birth date on the booking', async () => {
  const { child } = await signUp('regsave', 'Zosia')
  const ctx = (await findByToken(payload, child.registrationToken!))!
  assert.equal((await saveRegistration(payload, ctx, form)).first, true)
  const again = (await findByToken(payload, child.registrationToken!))!
  const corrected = await saveRegistration(payload, again, {
    ...form,
    medications: 'Ventolin',
    photoConsent: false,
  })
  assert.equal(corrected.first, false)
  const rows = await registrationsOf(child.booking.id)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].medications, 'Ventolin')
  assert.match(rows[0].consentText ?? '', /^\[2026-10-20\] /)
  const booking = await payload.findByID({
    collection: 'bookings',
    id: child.booking.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.equal(booking.childBirthDate, '2015-03-07T12:00:00.000Z')
  assert.equal(booking.photoConsent, false, 'unticked again = withdrawn')
  assert.equal(booking.photoConsentText, null)
  assert.equal(booking.invoiceRequested, true)
  assert.ok(booking.registeredAt)
})

test('the health data is the school’s only: no form for a participant or a visitor', async () => {
  const anonymous = await http('/api/camp-registrations')
  assert.equal(anonymous.status, 403)
})

test('deleting a booking — by hand or as a person’s erasure — takes its form with it', async () => {
  const { child } = await signUp('regdelete', 'Zosia')
  await saveRegistration(payload, (await findByToken(payload, child.registrationToken!))!, form)
  const copy = await personDataCopy(payload, email('regdelete'))
  assert.equal(
    (copy.bookings[0] as { registration?: { pesel?: string } }).registration?.pesel,
    form.pesel,
    'the copy of the person’s data includes the form',
  )
  await erasePerson(payload, email('regdelete'))
  assert.equal((await registrationsOf(child.booking.id)).length, 0)
})

test('the form goes a month after its camp; a camp still ahead keeps it', async () => {
  const past = await signUp('regold', 'Zosia')
  const ahead = await signUp('regnew', 'Staś')
  for (const { child } of [past, ahead]) {
    await saveRegistration(payload, (await findByToken(payload, child.registrationToken!))!, form)
  }
  // The past camp ended two months ago.
  await payload.update({
    collection: 'sessions',
    id: past.session.id,
    data: {
      startDate: new Date(Date.now() - 70 * 86_400_000).toISOString(),
      endDate: new Date(Date.now() - 63 * 86_400_000).toISOString(),
    },
    overrideAccess: true,
    context: { recountingSpots: true },
  })
  await deleteExpiredRegistrations(payload)
  assert.equal((await registrationsOf(past.child.booking.id)).length, 0)
  assert.equal((await registrationsOf(ahead.child.booking.id)).length, 1)
})

test('a child moved up from the waiting list gets the form link; a status change after does not', async () => {
  const { session } = await signUp('regfirst', 'Ala', { capacity: 1 })
  const camp = await payload.findByID({
    collection: 'sessions',
    id: session.id,
    depth: 0,
    joins: false,
    overrideAccess: true,
  })
  const waiting = await createCampBookings(payload, {
    sessionId: session.id,
    campId: Number(camp.camp),
    contact: {
      firstName: 'regwait',
      lastName: 'Test',
      email: email('regwait'),
      phone: '+48600100200',
    },
    children: [{ firstName: 'Kuba', lastName: 'Test' }],
    notes: null,
    language: 'pl',
    customerId: null,
    wantsAccount: false,
  })
  assert.ok(waiting.kind === 'done' && waiting.children[0].status === 'waitlist')
  outbox.length = 0
  await payload.update({
    collection: 'bookings',
    id: waiting.children[0].booking.id,
    data: { status: 'new' },
    overrideAccess: true,
  })
  const links = outbox.filter((m) => m.to === email('regwait') && /formularz/i.test(m.subject))
  assert.equal(links.length, 1)
  assert.match(links[0].text, /obozy\/rejestracja\?token=[0-9a-f]{64}/)
  outbox.length = 0
  await payload.update({
    collection: 'bookings',
    id: waiting.children[0].booking.id,
    data: { status: 'confirmed' },
    overrideAccess: true,
  })
  assert.ok(!outbox.some((m) => /formularz rejestracyjny/i.test(m.subject)))
})

test('the reminder goes once, only while the form is empty', async () => {
  const { child } = await signUp('regremind', 'Zosia')
  const done = await signUp('regremdone', 'Staś')
  await saveRegistration(
    payload,
    (await findByToken(payload, done.child.registrationToken!))!,
    form,
  )
  // Both links "sent" five days ago.
  for (const id of [child.booking.id, done.child.booking.id]) {
    await payload.db.updateOne({
      collection: 'bookings',
      id,
      data: { registrationSentAt: new Date(Date.now() - 5 * 86_400_000).toISOString() },
    })
  }
  outbox.length = 0
  await sendRegistrationReminders(payload)
  await sendRegistrationReminders(payload)
  const reminders = outbox.filter((m) => /^Przypomnienie/.test(m.subject))
  assert.deepEqual(
    reminders.map((m) => m.to),
    [email('regremind')],
  )
})

test('"Wyślij link" in the panel is the school’s only, and sends the child’s link', async () => {
  const { child } = await signUp('regbutton', 'Zosia')
  // Refused over HTTP — the server's own email is not one the tests can stop.
  const refused = await http(`/api/bookings/${child.booking.id}/registration-link`, {
    method: 'POST',
  })
  assert.equal(refused.status, 403)
  outbox.length = 0
  const response = await registrationLinkHandler({
    payload,
    user: { collection: 'users', email: email('school') },
    routeParams: { id: child.booking.id },
  } as unknown as PayloadRequest)
  assert.equal(response.status, 200)
  const sent = outbox.filter((m) => m.to === email('regbutton'))
  assert.equal(sent.length, 1)
  assert.ok(sent[0].text.includes(`token=${child.registrationToken}`), 'the same link as before')
})

// --- the deposit ------------------------------------------------------------------

test('the first form sets the deposit deadline and emails the bank details; a correction does not', async () => {
  const { child } = await signUp('depfirst', 'Zosia')
  outbox.length = 0
  const ctx = (await findByToken(payload, child.registrationToken!))!
  const saved = await saveRegistration(payload, ctx, form)
  await sendRegistrationEmails(payload, ctx, child.registrationToken!, saved)
  const due = Date.parse(saved.depositDueAt!)
  assert.ok(Math.abs(due - (Date.now() + 7 * 86_400_000)) < 60_000, 'seven days from now')
  const mail = outbox.find((m) => m.to === email('depfirst'))
  assert.match(mail?.text ?? '', /Numer konta: PL89 1140 2004 0000 3002 7291 9707/)
  assert.match(mail?.text ?? '', /Tytuł przelewu: Obóz JURA Zosia Test/)

  outbox.length = 0
  const again = (await findByToken(payload, child.registrationToken!))!
  const corrected = await saveRegistration(payload, again, { ...form, diet: 'Bez glutenu' })
  await sendRegistrationEmails(payload, again, child.registrationToken!, corrected)
  assert.equal(corrected.depositDueAt, saved.depositDueAt, 'the deadline stays')
  assert.ok(!outbox.some((m) => m.to === email('depfirst')), 'no second payment email')
})

test('"zaliczka wpłacona" on a camp tells the parent what is left to pay', async () => {
  const { camp, child } = await signUp('depstatus', 'Zosia')
  await payload.update({
    collection: 'camps',
    id: camp.id,
    data: { price: 2500 },
    overrideAccess: true,
  })
  outbox.length = 0
  await payload.update({
    collection: 'bookings',
    id: child.booking.id,
    data: { status: 'deposit' },
    overrideAccess: true,
  })
  const mail = outbox.find((m) => m.to === email('depstatus'))
  assert.match(mail?.subject ?? '', /^Zaliczka wpłynęła: Zosia Test/)
  assert.match(mail?.text ?? '', /Do zapłaty zostało 2000/)
})

test('a late deposit is reminded once; a paid one and a future deadline are not', async () => {
  const late = await signUp('deplate', 'Zosia')
  const paid = await signUp('deppaid', 'Staś')
  const early = await signUp('depearly', 'Ala')
  const past = new Date(Date.now() - 86_400_000).toISOString()
  for (const [id, due] of [
    [late.child.booking.id, past],
    [paid.child.booking.id, past],
    [early.child.booking.id, new Date(Date.now() + 86_400_000).toISOString()],
  ] as const) {
    await payload.db.updateOne({ collection: 'bookings', id, data: { depositDueAt: due } })
  }
  await payload.db.updateOne({
    collection: 'bookings',
    id: paid.child.booking.id,
    data: { status: 'deposit' },
  })
  outbox.length = 0
  await sendDepositReminders(payload)
  await sendDepositReminders(payload)
  assert.deepEqual(
    outbox.filter((m) => /Przypomnienie o zaliczce/.test(m.subject)).map((m) => m.to),
    [email('deplate')],
  )
})
