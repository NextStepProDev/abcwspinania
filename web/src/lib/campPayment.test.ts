import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CAMP_DEPOSIT_PLN,
  campPrice,
  depositDueDate,
  remainingAfterDeposit,
  transferTitle,
} from '@/lib/campPayment'

test('the deposit is a fixed 500 zł and the rest is the price minus it', () => {
  assert.equal(CAMP_DEPOSIT_PLN, 500)
  assert.equal(remainingAfterDeposit(2500), 2000)
  assert.equal(remainingAfterDeposit(400), 0, 'never below zero')
  assert.equal(remainingAfterDeposit(null), null, 'no price, no amount')
})

test('the turnus’s own price wins over the camp’s', () => {
  assert.equal(campPrice(2700, 2500), 2700)
  assert.equal(campPrice(null, 2500), 2500)
  assert.equal(campPrice(undefined, null), null)
  assert.equal(campPrice(0, 2500), 0, 'a free turnus is a price, not a missing one')
})

test('the deposit is due seven days after the email with the payment details', () => {
  assert.equal(
    depositDueDate(new Date('2027-03-01T10:00:00Z')).toISOString(),
    '2027-03-08T10:00:00.000Z',
  )
})

test('the transfer title is the one Krzysiek asked for', () => {
  assert.equal(transferTitle('Zosia  Nowak'), 'Obóz JURA Zosia Nowak')
})

import { paymentDetails } from '@/lib/campPayment'

test('the payment block names the amounts, the deadline as a day, the account and the title', () => {
  const p = paymentDetails('pl', ['Zosia Nowak'], 2500, '2027-03-08T10:00:00Z')
  assert.equal(p.deposit.replace(/\s/g, ' '), '500 zł')
  assert.equal(p.remaining?.replace(/\s/g, ' '), '2000 zł')
  assert.equal(p.dueDate, '8 marca 2027')
  assert.equal(p.account, 'PL89 1140 2004 0000 3002 7291 9707')
  assert.equal(p.title, 'Obóz JURA Zosia Nowak')
  assert.equal(paymentDetails('en', ['Zosia'], null, null).remaining, null)
})

import { joinNames } from '@/lib/campPayment'

test('siblings in one sign-up pay one transfer: amounts times the children, all named', () => {
  const p = paymentDetails('pl', ['Zosia Nowak', 'Staś Nowak'], 2500, '2027-03-08T10:00:00Z')
  assert.equal(p.deposit.replace(/\s/g, ' '), '1000 zł')
  assert.equal(p.remaining?.replace(/\s/g, ' '), '4000 zł')
  assert.equal(p.title, 'Obóz JURA Zosia Nowak, Staś Nowak')
})

test('names read as a sentence in either language', () => {
  assert.equal(joinNames('pl', ['Zosia']), 'Zosia')
  assert.equal(joinNames('pl', ['Zosia', 'Staś']), 'Zosia i Staś')
  assert.equal(joinNames('en', ['Ala', 'Ola', 'Ela']), 'Ala, Ola and Ela')
})

import { paymentLine } from '@/lib/campPayment'

test('My account tells the parent where the money stands', () => {
  // Intl puts a no-break space before "zł".
  const line = (...args: Parameters<typeof paymentLine>) =>
    paymentLine(...args)?.replace(/\s/g, ' ')
  assert.match(line('new', 2500, '2027-03-08T10:00:00Z') ?? '', /Zaliczka 500 zł do 8 marca 2027/)
  assert.match(line('deposit', 2500, null) ?? '', /zostało 2000 zł/)
  assert.match(line('deposit', null, null) ?? '', /Resztę zapłać/)
  assert.equal(line('paid', 2500, null), 'Opłacone w całości.')
  assert.equal(line('new', 2500, null), undefined, 'no deadline before the form')
  assert.equal(line('waitlist', 2500, '2027-03-08T10:00:00Z'), undefined)
})
