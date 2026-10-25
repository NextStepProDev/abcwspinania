import test from 'node:test'
import assert from 'node:assert/strict'

import { campSeason, contractBlocks, contractFileName, type ContractData } from '@/lib/campContract'

const data: ContractData = {
  concludedOn: new Date('2027-03-01T10:00:00Z'),
  season: 2027,
  parent: {
    name: 'Anna Nowak',
    address: 'ul. Testowa 1, 42-421 Rzędkowice',
    phone: '+48600100200',
    email: 'anna@example.com',
  },
  children: [
    { name: 'Zosia Nowak', turnus: '26 czerwca – 3 lipca 2027 · Obóz wspinaczkowo-przygodowy' },
    { name: 'Staś Nowak', turnus: '26 czerwca – 3 lipca 2027 · Obóz wspinaczkowo-przygodowy' },
  ],
  price: 2500,
  ownSleepingBags: false,
}

const text = (d: ContractData) =>
  contractBlocks(d)
    .map((b) => ('text' in b ? b.text : ''))
    .join('\n')

test('the contract names the parent, every child and the date it is concluded', () => {
  const t = text(data)
  assert.match(t, /Zawarta dnia 01\.03\.2027 w Rzędkowicach\./)
  assert.match(t, /rodzicem \/ opiekunem prawnym\): Anna Nowak/)
  assert.match(t, /adres zamieszkania: ul\. Testowa 1, 42-421 Rzędkowice/)
  assert.match(t, /Zosia Nowak — turnus 26 czerwca/)
  assert.match(t, /Staś Nowak — turnus 26 czerwca/)
})

test('the corrections Krzysiek accepted: the year, the price in words, the deposit from concluding', () => {
  const t = text(data)
  assert.match(t, /JURA LATO 2027/)
  assert.match(t, /zgodnie z ofertą obozów Jura Lato 2027/)
  assert.doesNotMatch(t, /2025/)
  assert.match(t, /Cena turnusu wynosi 2500 zł \(dwa tysiące pięćset złotych\)/)
  assert.match(t, /7 dni od dnia zawarcia niniejszej Umowy/)
  assert.doesNotMatch(t, /od dnia podpisania/)
  assert.match(t, /bez zwrotu wpłaconej zaliczki/)
})

test('the sleeping-bag clause appears only where the camp asks for it', () => {
  assert.match(text(data), /łóżka z pościelą/)
  assert.doesNotMatch(text(data), /śpiwory/)
  assert.match(text({ ...data, ownSleepingBags: true }), /własne śpiwory/)
})

test('the organiser and the account are the school’s', () => {
  const t = text(data)
  assert.match(t, /IQ SERVICE Krzysztof Wróbel/)
  assert.match(t, /NIP: 631-172-65-35/)
  assert.match(t, /CEOTIPT pod numerem: 10677/)
  assert.match(t, /rachunek nr 89 1140 2004 0000 3002 7291 9707/)
  assert.match(t, /obozy@abcwspinania\.info/)
})

test('the download name is plain ASCII', () => {
  assert.equal(contractFileName(2027, 'Łęcka-Żółć'), 'umowa-oboz-2027-lecka-zolc.pdf')
  assert.equal(contractFileName(2027, ''), 'umowa-oboz-2027.pdf')
})

test('the season is the year in Polish time, not UTC', () => {
  assert.equal(campSeason('2027-06-30T22:00:00.000Z'), 2027)
  // 1 January 2028, 00:00 in Warsaw.
  assert.equal(campSeason('2027-12-31T23:00:00.000Z'), 2028)
})
