import assert from 'node:assert/strict'

import type { PayloadRequest } from 'payload'
import { PDFDocument } from 'pdf-lib'

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
  type RegistrationChildInput,
  type RegistrationContext,
  type RegistrationInput,
} from '@/lib/campRegistration'
import { campSeason } from '@/lib/campContract'
import { sendWaitingDepositEmails } from '@/lib/bookingEffects'
import { preparePreCampDrafts } from '@/lib/campPreCampDrafts'
import { erasePerson, personDataCopy } from '@/lib/personErasure'

import {
  cleanup,
  email,
  http,
  makeAdmin,
  makeCamp,
  makeCustomer,
  makeSession,
  outbox,
  payload,
  removeWhere,
  test,
} from './harness'

/**
 * The camp registration form (`lib/campRegistration.ts`): the link's token,
 * the save, the link after the waiting list, the reminder, and the health
 * data going a month after the camp — and with its booking.
 */

const childForm: RegistrationChildInput = {
  pesel: '15230701232',
  heightCm: 142,
  allergies: 'Orzechy',
  medications: '',
  diet: 'Wegetariańska',
  conditions: '',
  photoConsent: true,
}

/** The whole form for a link's sign-up: the same answers for every child. */
function formFor(ctx: RegistrationContext, child = childForm): RegistrationInput {
  return {
    address: { street: 'ul. Testowa 1', postcode: '42-421', city: 'Rzędkowice' },
    invoiceRequested: true,
    invoiceCompany: null,
    children: Object.fromEntries(ctx.children.map((c) => [c.booking.id, child])),
  }
}

/** Opens a link's sign-up and sends its form. */
async function fill(token: string, child = childForm) {
  const ctx = (await findByToken(payload, token))!
  return saveRegistration(payload, ctx, formFor(ctx, child))
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
  assert.equal(ctx?.children[0]?.booking.id, child.booking.id)
  assert.equal(registrationOpen(ctx!), 'open')
  assert.equal(await findByToken(payload, 'f'.repeat(64)), null)
  assert.equal(await findByToken(payload, ''), null)
})

test('the form saves once, corrects in place, and puts the birth date on the booking', async () => {
  const { child } = await signUp('regsave', 'Zosia')
  const ctx = (await findByToken(payload, child.registrationToken!))!
  assert.equal((await saveRegistration(payload, ctx, formFor(ctx))).first, true)
  const again = (await findByToken(payload, child.registrationToken!))!
  const corrected = await saveRegistration(
    payload,
    again,
    formFor(again, { ...childForm, medications: 'Ventolin', photoConsent: false }),
  )
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
  await fill(child.registrationToken!)
  const copy = await personDataCopy(payload, email('regdelete'))
  assert.equal(
    (copy.bookings[0] as { registration?: { pesel?: string } }).registration?.pesel,
    childForm.pesel,
    'the copy of the person’s data includes the form',
  )
  await erasePerson(payload, email('regdelete'))
  assert.equal((await registrationsOf(child.booking.id)).length, 0)
})

test('the form goes a month after its camp; a camp still ahead keeps it', async () => {
  const past = await signUp('regold', 'Zosia')
  const ahead = await signUp('regnew', 'Staś')
  for (const { child } of [past, ahead]) {
    await fill(child.registrationToken!)
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
  await fill(done.child.registrationToken!)
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
  const saved = await saveRegistration(payload, ctx, formFor(ctx))
  await sendRegistrationEmails(payload, ctx, saved)
  const due = Date.parse(saved.depositDueAt!)
  assert.ok(Math.abs(due - (Date.now() + 7 * 86_400_000)) < 60_000, 'seven days from now')
  const mail = outbox.find((m) => m.to === email('depfirst'))
  assert.match(mail?.text ?? '', /Numer konta: PL89 1140 2004 0000 3002 7291 9707/)
  assert.match(mail?.text ?? '', /Tytuł przelewu: Obóz JURA Zosia Test/)

  outbox.length = 0
  const again = (await findByToken(payload, child.registrationToken!))!
  const corrected = await saveRegistration(
    payload,
    again,
    formFor(again, { ...childForm, diet: 'Bez glutenu' }),
  )
  await sendRegistrationEmails(payload, again, corrected)
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
  assert.equal(mail?.fromName, 'ABC Wspinania · Obozy')
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

// --- one form for siblings -------------------------------------------------------

test('siblings fill one form: a part each, one address, one payment email for both', async () => {
  const camp = await makeCamp()
  await payload.update({
    collection: 'camps',
    id: camp.id,
    data: { price: 2500 },
    overrideAccess: true,
  })
  const session = await makeSession(camp.id, { camp: true })
  const result = await createCampBookings(payload, {
    sessionId: session.id,
    campId: camp.id,
    contact: {
      firstName: 'sibform',
      lastName: 'Test',
      email: email('sibform'),
      phone: '+48600100200',
    },
    children: [
      { firstName: 'Zosia', lastName: 'Test' },
      { firstName: 'Staś', lastName: 'Test' },
    ],
    notes: null,
    language: 'pl',
    customerId: null,
    wantsAccount: false,
  })
  assert.ok(result.kind === 'done')
  const token = result.children[0].registrationToken!
  const ctx = (await findByToken(payload, token))!
  assert.equal(ctx.children.length, 2, 'one link opens both children')

  outbox.length = 0
  const saved = await saveRegistration(payload, ctx, formFor(ctx))
  await sendRegistrationEmails(payload, ctx, saved)
  for (const { booking } of result.children) {
    assert.equal((await registrationsOf(booking.id)).length, 1)
    const after = await payload.findByID({
      collection: 'bookings',
      id: booking.id,
      depth: 0,
      overrideAccess: true,
    })
    assert.equal(after.addressCity, 'Rzędkowice')
    assert.equal(after.depositDueAt, saved.depositDueAt, 'one deadline for the sign-up')
  }
  const toParent = outbox.filter((m) => m.to === email('sibform'))
  assert.equal(toParent.length, 1, 'one payment email, not one per child')
  // The name a mail filter tells camp emails by (the school's test forwarding).
  assert.equal(toParent[0].fromName, 'ABC Wspinania · Obozy')
  assert.match(toParent[0].text, /Zaliczka: 1000/)
  assert.match(toParent[0].text, /Tytuł przelewu: Obóz JURA Zosia Test, Staś Test/)
})

test('siblings late with the form get one reminder between them', async () => {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true })
  const result = await createCampBookings(payload, {
    sessionId: session.id,
    campId: camp.id,
    contact: {
      firstName: 'sibremind',
      lastName: 'Test',
      email: email('sibremind'),
      phone: '+48600100200',
    },
    children: [
      { firstName: 'Zosia', lastName: 'Test' },
      { firstName: 'Staś', lastName: 'Test' },
    ],
    notes: null,
    language: 'pl',
    customerId: null,
    wantsAccount: false,
  })
  assert.ok(result.kind === 'done')
  for (const { booking } of result.children) {
    await payload.db.updateOne({
      collection: 'bookings',
      id: booking.id,
      data: { registrationSentAt: new Date(Date.now() - 5 * 86_400_000).toISOString() },
    })
  }
  outbox.length = 0
  await sendRegistrationReminders(payload)
  await sendRegistrationReminders(payload)
  const reminders = outbox.filter((m) => m.to === email('sibremind'))
  assert.equal(reminders.length, 1)
  assert.match(reminders[0].text, /Zosia Test i Staś Test/)
})

// --- the turnus's list for Excel ---------------------------------------------------

import { exportSessionHandler } from '@/lib/sessionExport'

test('a camp turnus exports the children with their form answers, for the school only', async () => {
  const { session, child } = await signUp('regexport', 'Zosia')
  await fill(child.registrationToken!)
  const response = await exportSessionHandler({
    payload,
    user: { collection: 'users', email: email('school') },
    routeParams: { id: session.id },
  } as unknown as PayloadRequest)
  assert.equal(response.status, 200)
  const csv = await response.text()
  const [header, row] = csv.replace(/^﻿/, '').split(/\r?\n/)
  assert.match(
    header,
    /^Lp\.;Imię dziecka;Nazwisko dziecka;Data urodzenia;Wzrost \(cm\);Uczulenia;/,
  )
  assert.match(row, /;Zosia;Test;7\.03\.2015;142;Orzechy;/)
  assert.match(row, /;wypełniony;/)
  assert.match(row, /regexport Test/)

  const refused = await exportSessionHandler({
    payload,
    user: null,
    routeParams: { id: session.id },
  } as unknown as PayloadRequest)
  assert.equal(refused.status, 403)
})

// --- My account ----------------------------------------------------------------------

import { bookingsOf } from '@/lib/participantBookings'

test('My account shows the child, the form link and the money — but not for a camp that is over', async () => {
  const parent = await makeCustomer('regaccount')
  const ahead = await signUp('regaccount', 'Zosia')
  const past = await signUp('regaccount', 'Staś')
  for (const { child } of [ahead, past]) {
    await payload.db.updateOne({
      collection: 'bookings',
      id: child.booking.id,
      data: { customer: parent.id, depositDueAt: new Date(Date.now() + 86_400_000).toISOString() },
    })
  }
  // Staś's camp ended last week.
  await payload.update({
    collection: 'sessions',
    id: past.session.id,
    data: {
      startDate: new Date(Date.now() - 14 * 86_400_000).toISOString(),
      endDate: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    },
    overrideAccess: true,
    context: { recountingSpots: true },
  })
  const { upcoming, archive } = await bookingsOf(parent.id)
  const zosia = upcoming.find((r) => r.child === 'Zosia Test')
  assert.ok(zosia?.form?.url.includes('/obozy/rejestracja?token='))
  assert.match(zosia?.payment ?? '', /Zaliczka/)
  const stas = archive.find((r) => r.child === 'Staś Test')
  assert.ok(stas, 'the past camp is in the archive')
  assert.equal(stas.form, undefined, 'no link to a form that is closed')
  assert.equal(stas.payment, undefined, 'no deposit talk after the camp')
})

// --- the contract and the email before the camp ------------------------------------

test('the payment email carries the contract; its price and day stay with the booking', async () => {
  const { camp, child } = await signUp('contract', 'Zosia')
  await payload.update({
    collection: 'camps',
    id: camp.id,
    data: { price: 2500 },
    overrideAccess: true,
  })
  outbox.length = 0
  const ctx = (await findByToken(payload, child.registrationToken!))!
  const sent = await sendRegistrationEmails(
    payload,
    ctx,
    await saveRegistration(payload, ctx, formFor(ctx)),
  )
  assert.equal(sent.contractAttached, true, 'the form’s thank-you says the contract went')
  const mail = outbox.find((m) => m.to === email('contract'))
  assert.deepEqual(mail?.attachments, [`umowa-oboz-${campSeason(ctx.session.startDate)}-test.pdf`])
  const after = await payload.findByID({
    collection: 'bookings',
    id: child.booking.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.equal(after.contractPrice, 2500)
  assert.ok(after.contractSentAt)

  // The parent's download by the link's key; the school's endpoint is closed to others.
  const download = await http(`/obozy/rejestracja/umowa?token=${child.registrationToken}`)
  assert.equal(download.status, 200)
  assert.equal(download.headers.get('content-type'), 'application/pdf')
  assert.match(download.headers.get('cache-control') ?? '', /no-store/)
  assert.equal((await http(`/api/bookings/${child.booking.id}/contract`)).status, 403)
})

test('without a price there is no contract — the school is told on the booking', async () => {
  const { child } = await signUp('nocontract', 'Staś')
  outbox.length = 0
  const ctx = (await findByToken(payload, child.registrationToken!))!
  const sent = await sendRegistrationEmails(
    payload,
    ctx,
    await saveRegistration(payload, ctx, formFor(ctx)),
  )
  assert.equal(sent.contractAttached, false, 'the thank-you says it follows')
  const mail = outbox.find((m) => m.to === email('nocontract'))
  assert.deepEqual(mail?.attachments, [])
  const after = await payload.findByID({
    collection: 'bookings',
    id: child.booking.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.equal(after.contractSentAt ?? null, null)
  assert.match(after.emailIssue ?? '', /ceny/)
  assert.equal(
    (await http(`/obozy/rejestracja/umowa?token=${child.registrationToken}`)).status,
    404,
  )
})

test('before a camp the school gets a draft to its parents — once, never sent by itself', async () => {
  const camp = await makeCamp()
  const soon = await makeSession(camp.id, { camp: true, daysAhead: 10 })
  const later = await makeSession(camp.id, { camp: true, daysAhead: 40 })
  cleanup(() => removeWhere('broadcasts', { session: { in: [soon.id, later.id] } }))
  for (const session of [soon, later]) {
    const result = await createCampBookings(payload, {
      sessionId: session.id,
      campId: camp.id,
      contact: {
        firstName: 'precamp',
        lastName: 'Test',
        email: email('precamp'),
        phone: '+48600100200',
      },
      children: [{ firstName: 'Ala', lastName: 'Test' }],
      notes: null,
      language: 'pl',
      customerId: null,
      wantsAccount: false,
    })
    assert.ok(result.kind === 'done')
  }
  outbox.length = 0
  await preparePreCampDrafts(payload, [soon.id, later.id])
  await preparePreCampDrafts(payload, [soon.id, later.id])
  const { docs } = await payload.find({
    collection: 'broadcasts',
    where: { session: { in: [soon.id, later.id] } },
    depth: 0,
    overrideAccess: true,
  })
  assert.equal(docs.length, 1, 'one draft, for the turnus within 16 days')
  assert.equal(docs[0].session, soon.id)
  assert.equal(docs[0].status, 'draft')
  assert.equal(docs[0].attachQualificationCard, true, 'the blank card goes with it')
  assert.match(docs[0].subject, new RegExp(`Przed obozem: ${camp.title}`))
  assert.ok(!outbox.some((m) => m.to === email('precamp')), 'nothing to the parents')
  const notices = outbox.filter((m) => /Mail przed obozem czeka/.test(m.subject))
  assert.equal(notices.length, 1, 'the school is told once')
})

test('a trip or regular classes get no pre-camp draft, even with someone booked', async () => {
  const trip = await makeCamp({ kind: 'trip' })
  const session = await makeSession(trip.id, { camp: true, daysAhead: 10 })
  cleanup(() => removeWhere('broadcasts', { session: { equals: session.id } }))
  // Added by hand in the panel — the site takes no bookings for a trip.
  await payload.create({
    collection: 'bookings',
    data: {
      kind: 'camp',
      session: session.id,
      firstName: 'pretrip',
      lastName: 'Test',
      email: email('pretrip'),
      phone: '+48600100200',
      childFirstName: 'Ala',
      childLastName: 'Test',
      status: 'confirmed',
      consentText: 'test',
    } as never,
    overrideAccess: true,
    context: { skipStatusEmail: true },
  })
  await preparePreCampDrafts(payload, [session.id])
  const drafts = await payload.count({
    collection: 'broadcasts',
    where: { session: { equals: session.id } },
    overrideAccess: true,
  })
  assert.equal(drafts.totalDocs, 0)
})

test('"Zduplikuj" on a camp booking makes a new child, not a second copy of the sign-up', async () => {
  const { child } = await signUp('dupchild', 'Zosia')
  const ctx = (await findByToken(payload, child.registrationToken!))!
  await sendRegistrationEmails(payload, ctx, await saveRegistration(payload, ctx, formFor(ctx)))
  const copy = await payload.duplicate({
    collection: 'bookings',
    id: child.booking.id,
    overrideAccess: true,
  })
  const after = await payload.findByID({
    collection: 'bookings',
    id: copy.id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  // A sibling added by phone: its own form and contract, nothing of the first child's.
  assert.equal(after.registrationToken ?? null, null, 'not in the first child’s link')
  assert.equal(after.registeredAt ?? null, null, 'its form is not filled in')
  assert.equal(after.contractSentAt ?? null, null)
  assert.equal(after.contractPrice ?? null, null)
  assert.equal(after.depositDueAt ?? null, null)
  assert.equal(after.childBirthDate ?? null, null)
  assert.equal(after.photoConsent, false, 'the first child’s photo consent is not this one’s')
  assert.equal(after.photoConsentText ?? null, null)
  const link = (await findByToken(payload, child.registrationToken!))!
  assert.equal(link.children.length, 1, 'the parent’s link still opens one child')
})

test('"Zduplikuj" on a turnus starts its own reminder and Kuratorium number', async () => {
  const camp = await makeCamp()
  const session = await makeSession(camp.id, { camp: true, daysAhead: 10 })
  await payload.update({
    collection: 'sessions',
    id: session.id,
    data: { kuratoriumNumber: 'KO-123/2027' },
    overrideAccess: true,
  })
  await payload.db.updateOne({
    collection: 'sessions',
    id: session.id,
    data: { preCampDraftAt: new Date().toISOString() },
  })
  const copy = await payload.duplicate({
    collection: 'sessions',
    id: session.id,
    overrideAccess: true,
  })
  cleanup(() => payload.delete({ collection: 'sessions', id: copy.id, overrideAccess: true }))
  const after = await payload.findByID({
    collection: 'sessions',
    id: copy.id,
    depth: 0,
    joins: false,
    overrideAccess: true,
    showHiddenFields: true,
  })
  assert.equal(after.preCampDraftAt ?? null, null, 'the new turnus gets its own draft')
  assert.equal(after.kuratoriumNumber ?? null, null, 'a number is per turnus')
})

test('the signature file is the school’s only and never kept by a cache', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  )
  const file = await payload.create({
    collection: 'private-files',
    data: { title: 'test' },
    file: {
      data: png,
      mimetype: 'image/png',
      name: `${email('sig').split('@')[0]}.png`,
      size: png.length,
    },
    overrideAccess: true,
  })
  cleanup(() => payload.delete({ collection: 'private-files', id: file.id, overrideAccess: true }))
  const path = `/api/private-files/file/${file.filename}`
  assert.equal((await http(path)).status, 403, 'a visitor gets nothing')
  const customer = await makeCustomer('sigcust')
  assert.equal((await http(path, { token: customer.token })).status, 403, 'nor a participant')
  const admin = await makeAdmin()
  const own = await http(path, { token: admin.token })
  assert.equal(own.status, 200)
  // Cloudflare keeps a .png without Cache-Control — and would hand it to anyone.
  assert.match(own.headers.get('cache-control') ?? '', /no-store/)
})

test('a contract that went without the organiser’s signature is flagged for the school', async () => {
  const config = await payload.findGlobal({ slug: 'camp-config', depth: 0, overrideAccess: true })
  const before = config.contractSignature ?? null
  await payload.updateGlobal({
    slug: 'camp-config',
    data: { contractSignature: null },
    overrideAccess: true,
  })
  cleanup(() =>
    payload.updateGlobal({
      slug: 'camp-config',
      data: { contractSignature: before as number | null },
      overrideAccess: true,
    }),
  )
  const { camp, child } = await signUp('unsigned', 'Zosia')
  await payload.update({
    collection: 'camps',
    id: camp.id,
    data: { price: 2500 },
    overrideAccess: true,
  })
  const ctx = (await findByToken(payload, child.registrationToken!))!
  const sent = await sendRegistrationEmails(
    payload,
    ctx,
    await saveRegistration(payload, ctx, formFor(ctx)),
  )
  assert.equal(sent.contractAttached, true, 'the parent still gets the contract')
  const after = await payload.findByID({
    collection: 'bookings',
    id: child.booking.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.match(after.emailIssue ?? '', /bez podpisu/)
})

test('"zaliczka wpłacona" for siblings is one email, once the last child is marked', async () => {
  const camp = await makeCamp()
  await payload.update({
    collection: 'camps',
    id: camp.id,
    data: { price: 2500 },
    overrideAccess: true,
  })
  const session = await makeSession(camp.id, { camp: true })
  const result = await createCampBookings(payload, {
    sessionId: session.id,
    campId: camp.id,
    contact: {
      firstName: 'sibdeposit',
      lastName: 'Test',
      email: email('sibdeposit'),
      phone: '+48600100200',
    },
    children: [
      { firstName: 'Zosia', lastName: 'Test' },
      { firstName: 'Staś', lastName: 'Test' },
    ],
    notes: null,
    language: 'pl',
    customerId: null,
    wantsAccount: false,
  })
  assert.ok(result.kind === 'done')
  const [zosia, stas] = result.children
  const mark = (id: number) =>
    payload.update({
      collection: 'bookings',
      id,
      data: { status: 'deposit' },
      overrideAccess: true,
    })
  outbox.length = 0
  await mark(zosia!.booking.id)
  assert.equal(outbox.filter((m) => m.to === email('sibdeposit')).length, 0, 'not yet')
  await mark(stas!.booking.id)
  const mails = outbox.filter((m) => m.to === email('sibdeposit'))
  assert.equal(mails.length, 1, 'one email for both')
  assert.match(mails[0]!.subject, /Zosia Test i Staś Test/)
  assert.match(mails[0]!.text, /Do zapłaty zostało 4000/)

  // A child paid in full at once is not in the deposit email, nor in its balance.
  outbox.length = 0
  await payload.update({
    collection: 'bookings',
    id: zosia!.booking.id,
    data: { status: 'paid' },
    overrideAccess: true,
    context: { skipStatusEmail: true },
  })
  await payload.update({
    collection: 'bookings',
    id: stas!.booking.id,
    data: { status: 'confirmed' },
    overrideAccess: true,
    context: { skipStatusEmail: true },
  })
  outbox.length = 0
  await mark(stas!.booking.id)
  const only = outbox.filter((m) => m.to === email('sibdeposit'))
  assert.equal(only.length, 1)
  assert.doesNotMatch(only[0]!.subject, /Zosia/)
  assert.match(only[0]!.text, /Do zapłaty zostało 2000/)
})

/** Two siblings on a camp with a price; Zosia's deposit marked, Staś's not. */
async function siblingsZosiaPaid(parent: string) {
  const camp = await makeCamp()
  await payload.update({
    collection: 'camps',
    id: camp.id,
    data: { price: 2500 },
    overrideAccess: true,
  })
  const session = await makeSession(camp.id, { camp: true })
  const result = await createCampBookings(payload, {
    sessionId: session.id,
    campId: camp.id,
    contact: { firstName: parent, lastName: 'Test', email: email(parent), phone: '+48600100200' },
    children: [
      { firstName: 'Zosia', lastName: 'Test' },
      { firstName: 'Staś', lastName: 'Test' },
    ],
    notes: null,
    language: 'pl',
    customerId: null,
    wantsAccount: false,
  })
  assert.ok(result.kind === 'done')
  const [zosia, stas] = result.children
  await payload.update({
    collection: 'bookings',
    id: zosia!.booking.id,
    data: { status: 'deposit' },
    overrideAccess: true,
  })
  return {
    zosia: zosia!.booking,
    stas: stas!.booking,
    sweep: () => sendWaitingDepositEmails(payload, [session.id]),
  }
}

const depositMails = (parent: string) =>
  outbox.filter((m) => m.to === email(parent) && /^Zaliczka wpłynęła/.test(m.subject))

test('a deposit email left waiting goes with the daily sweep once its sibling drops out', async () => {
  const { stas, sweep } = await siblingsZosiaPaid('sibdrop')
  outbox.length = 0
  await payload.update({
    collection: 'bookings',
    id: stas.id,
    data: { status: 'cancelled' },
    overrideAccess: true,
  })
  assert.equal(depositMails('sibdrop').length, 0, 'not in the middle of the school’s clicks')
  await sweep()
  await sweep()
  const mails = depositMails('sibdrop')
  assert.equal(mails.length, 1, 'once')
  assert.doesNotMatch(mails[0]!.subject, /Staś/)
  assert.match(mails[0]!.text, /Do zapłaty zostało 2000/)
})

test('a family that withdraws whole gets no deposit email on the way', async () => {
  const { zosia, stas, sweep } = await siblingsZosiaPaid('sibwhole')
  outbox.length = 0
  for (const id of [stas.id, zosia.id]) {
    await payload.update({
      collection: 'bookings',
      id,
      data: { status: 'cancelled' },
      overrideAccess: true,
    })
  }
  await sweep()
  assert.equal(depositMails('sibwhole').length, 0)
})

test('a deposit email left waiting goes also when the sibling’s booking is deleted', async () => {
  const { stas, sweep } = await siblingsZosiaPaid('sibdel')
  outbox.length = 0
  await payload.delete({ collection: 'bookings', id: stas.id, overrideAccess: true })
  await sweep()
  assert.equal(depositMails('sibdel').length, 1)
})

test('the siblings’ deposit email that went at once is not sent again by the sweep', async () => {
  const { stas, sweep } = await siblingsZosiaPaid('sibonce')
  outbox.length = 0
  await payload.update({
    collection: 'bookings',
    id: stas.id,
    data: { status: 'deposit' },
    overrideAccess: true,
  })
  await sweep()
  assert.equal(depositMails('sibonce').length, 1)
})

test('a PDF chosen as the signature does not stop the contract — it goes unsigned, flagged', async () => {
  const blank = await PDFDocument.create()
  blank.addPage()
  const pdf = Buffer.from(await blank.save())
  const file = await payload.create({
    collection: 'private-files',
    data: { title: 'nie podpis' },
    file: {
      data: pdf,
      mimetype: 'application/pdf',
      name: `${email('pdfsig').split('@')[0]}.pdf`,
      size: pdf.length,
    },
    overrideAccess: true,
  })
  cleanup(() => payload.delete({ collection: 'private-files', id: file.id, overrideAccess: true }))
  const config = await payload.findGlobal({ slug: 'camp-config', depth: 0, overrideAccess: true })
  const before = (config.contractSignature as number | null | undefined) ?? null
  cleanup(() =>
    payload.updateGlobal({
      slug: 'camp-config',
      data: { contractSignature: before },
      overrideAccess: true,
    }),
  )
  await payload.updateGlobal({
    slug: 'camp-config',
    data: { contractSignature: file.id },
    overrideAccess: true,
  })
  const { camp, child } = await signUp('pdfsig', 'Zosia')
  await payload.update({
    collection: 'camps',
    id: camp.id,
    data: { price: 2500 },
    overrideAccess: true,
  })
  const ctx = (await findByToken(payload, child.registrationToken!))!
  const sent = await sendRegistrationEmails(
    payload,
    ctx,
    await saveRegistration(payload, ctx, formFor(ctx)),
  )
  assert.equal(sent.contractAttached, true)
  const after = await payload.findByID({
    collection: 'bookings',
    id: child.booking.id,
    depth: 0,
    overrideAccess: true,
  })
  assert.match(after.emailIssue ?? '', /bez podpisu/)
})
