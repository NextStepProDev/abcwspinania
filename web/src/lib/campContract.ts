import { CAMP_DEPOSIT_PLN, CAMP_ORGANISER_REGISTRY, CAMP_TRANSFER } from '@/lib/campPayment'
import { CONTROLLER } from '@/lib/legal'
import { plnInWords } from '@/lib/plnInWords'

/**
 * The camp contract ("Umowa imprezy turystycznej"), from Krzysiek's wzór
 * (Jura Lato 2026, 21.10.2026) with the corrections he accepted on
 * 22.10.2026: the year from the turnus, the price from the panel with the
 * amount in words, the deposit due "od dnia zawarcia umowy", the sleeping-bag
 * clause only where the camp asks for it, the organiser's stamp and
 * signature put in by the system.
 *
 * One contract per sign-up — the children signed up together, each with
 * their own deposit. This file is the TEXT only, pure and tested under
 * `node --test`; `contractPdf.ts` lays it out.
 */

export interface ContractChild {
  name: string
  /** "26 czerwca – 3 lipca 2027 · Obóz wspinaczkowo-przygodowy". */
  turnus: string
}

export interface ContractData {
  /** The day the contract is concluded — the day it is sent. */
  concludedOn: Date
  /** The camp's year — the turnus's ("Jura Lato 2027"). */
  season: number
  parent: {
    name: string
    address: string
    phone: string
    email: string
  }
  children: ContractChild[]
  /** Per child, in złoty — the turnus's price on the day of sending. */
  price: number
  /** The camp asks participants to bring their own sleeping bags. */
  ownSleepingBags: boolean
}

/** Where the signed copy goes back (the wzór's § 3.3). */
export const CONTRACT_RETURN_EMAIL = 'obozy@abcwspinania.info'

/** Below this many participants the school may cancel a turnus (§ 5.6). */
export const CONTRACT_MIN_PARTICIPANTS = 8

export type ContractBlock =
  | { kind: 'title'; text: string }
  | { kind: 'paragraph'; text: string; bold?: boolean }
  | { kind: 'section'; text: string }
  | { kind: 'item'; number: string; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'signatures' }

const day = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Warsaw',
})

/** "631-172-65-35", the grouping the contract uses. */
function nip(): string {
  const d = CONTROLLER.nip.replace(/\D/g, '')
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`
}

export function contractBlocks(data: ContractData): ContractBlock[] {
  const amount = `${data.price} zł (${plnInWords(data.price)})`
  const registry = CAMP_ORGANISER_REGISTRY.replace(/^CEOTIPT nr /, '')
  const account = CAMP_TRANSFER.account.replace(/^PL/, '')
  const blocks: ContractBlock[] = [
    { kind: 'title', text: 'UMOWA IMPREZY TURYSTYCZNEJ' },
    { kind: 'title', text: `JURA LATO ${data.season}` },
    {
      kind: 'paragraph',
      text: `Zawarta dnia ${day.format(data.concludedOn)} w ${CONTROLLER.town === 'Rzędkowice' ? 'Rzędkowicach' : CONTROLLER.town}.`,
    },
    { kind: 'paragraph', text: 'Pomiędzy:' },
    {
      kind: 'paragraph',
      text: `${CONTROLLER.businessName} z siedzibą w Rzędkowicach, ${CONTROLLER.street}, NIP: ${nip()}, działający pod marką ABC WSPINANIA. Wpis do rejestru CEOTIPT pod numerem: ${registry}, nazywanym dalej „organizatorem”,`,
    },
    { kind: 'paragraph', text: 'a' },
    {
      kind: 'paragraph',
      text: `Panem/Panią (rodzicem / opiekunem prawnym): ${data.parent.name}`,
      bold: true,
    },
    { kind: 'paragraph', text: `adres zamieszkania: ${data.parent.address}` },
    { kind: 'paragraph', text: `nr tel. kontaktowego: ${data.parent.phone}` },
    { kind: 'paragraph', text: `adres e-mail: ${data.parent.email}` },

    { kind: 'section', text: '§ 1' },
    {
      kind: 'item',
      number: '1.',
      text: 'Organizator zobowiązuje się zorganizować imprezę turystyczną (zwaną dalej „obozem”) z zachowaniem wszystkich wymogów określonych przez przepisy dotyczące organizatorów turystyki i pośredników turystycznych oraz przepisów Ministerstwa Edukacji Narodowej w zakresie wypoczynku dzieci i młodzieży.',
    },
    { kind: 'item', number: '2.', text: 'Karta zgłoszenia stanowi załącznik do niniejszej Umowy.' },
    {
      kind: 'item',
      number: '3.',
      text: 'Karta zgłoszenia wymagana jest dla każdego zgłoszonego uczestnika obozu.',
    },
    {
      kind: 'item',
      number: '4.',
      text: 'Dane osobowe podane w umowie służą do realizacji umowy. Będą udostępniane tylko w sytuacji wymaganej prawem oraz w celu zapewnienia uczestnikom niezbędnej opieki.',
    },

    { kind: 'section', text: '§ 2' },
    {
      kind: 'item',
      number: '1.',
      text: 'Świadczenia zawarte w ramach Umowy Imprezy Turystycznej:',
    },
    { kind: 'bullet', text: 'noclegi w pokojach wieloosobowych,' },
    { kind: 'bullet', text: 'dostęp do łazienek, węzłów sanitarnych itp.,' },
    {
      kind: 'bullet',
      text: data.ownSleepingBags
        ? 'łóżka — uczestnicy zabierają własne śpiwory,'
        : 'łóżka z pościelą,',
    },
    {
      kind: 'bullet',
      text: 'wyżywienie pełne (śniadania, obiady i kolacje); woda mineralna dostępna jest dla uczestników bezpłatnie,',
    },
    {
      kind: 'bullet',
      text: 'organizacja wspinaczki i innych zajęć plenerowych pod nadzorem uprawnionych instruktorów,',
    },
    {
      kind: 'bullet',
      text: 'gry i zabawy wewnątrz i na terenie przyległym do ośrodka zakwaterowania.',
    },
    {
      kind: 'item',
      number: '2.',
      text: 'Umowa nie obejmuje organizacji transportu na obóz i po jego zakończeniu. Rodzice i/lub opiekunowie przywożą i odbierają uczestników indywidualnie.',
    },
    {
      kind: 'item',
      number: '3.',
      text: 'Uczestnik powinien posiadać ubezpieczenie NNW na czas trwania obozu w zakresie rekreacyjnego uprawiania sportu z uwzględnieniem wspinaczki.',
    },

    { kind: 'section', text: '§ 3' },
    {
      kind: 'item',
      number: '1.',
      text: 'Załącznikiem do Umowy są indywidualne Karty Zgłoszenia — dokument wymagany przez przepisy dotyczące zorganizowanego wypoczynku dzieci i młodzieży.',
    },
    {
      kind: 'item',
      number: '2.',
      text: 'Karty zgłoszenia przekazywane są organizatorowi w dniu rozpoczęcia obozu.',
    },
    {
      kind: 'item',
      number: '3.',
      text: `Podpisaną kopię Umowy (bez karty zgłoszenia) proszę przesłać mailem na adres ${CONTRACT_RETURN_EMAIL}.`,
    },

    { kind: 'section', text: '§ 4' },
    { kind: 'paragraph', text: 'Imię i nazwisko zgłaszanych dzieci:' },
    ...data.children.map((child, i): ContractBlock => ({
      kind: 'item',
      number: `${i + 1}.`,
      text: `${child.name} — turnus ${child.turnus}`,
    })),

    { kind: 'section', text: '§ 5' },
    { kind: 'paragraph', text: 'Płatność za udział w obozie:' },
    {
      kind: 'item',
      number: '1.',
      text: `Cena turnusu wynosi ${amount} za każde zgłoszone dziecko.`,
    },
    {
      kind: 'item',
      number: '2.',
      text: `W terminie do 7 dni od dnia zawarcia niniejszej Umowy płatna jest zaliczka w kwocie ${CAMP_DEPOSIT_PLN} zł za każde zgłoszone dziecko, zgodnie z ofertą obozów Jura Lato ${data.season}.`,
    },
    {
      kind: 'item',
      number: '3.',
      text: `Płatność następuje na rachunek nr ${account} w mBanku (${CAMP_TRANSFER.recipient}).`,
    },
    {
      kind: 'item',
      number: '4.',
      text: 'Pozostała część płatna jest najpóźniej w dniu rozpoczęcia obozu.',
    },
    {
      kind: 'item',
      number: '5.',
      text: 'Za szkody spowodowane przez uczestników odpowiedzialność materialną ponoszą rodzice lub prawni opiekunowie dzieci.',
    },
    {
      kind: 'item',
      number: '6.',
      text: `Jeżeli na turnus zgłosi się mniej niż ${CONTRACT_MIN_PARTICIPANTS} uczestników, zastrzegamy sobie prawo odwołania turnusu.`,
    },

    { kind: 'section', text: '§ 6' },
    {
      kind: 'paragraph',
      text: 'Odstąpienie od zawartej Umowy jest możliwe przy zachowaniu następujących warunków:',
    },
    {
      kind: 'bullet',
      text: 'w wypadkach losowych, choroba itp. — bez zwrotu wpłaconej zaliczki, jeżeli wycofanie następuje w terminie krótszym niż 30 dni przed rozpoczęciem obozu,',
    },
    {
      kind: 'bullet',
      text: 'w trakcie obozu — bez zwrotu wpłaconej kwoty, jeżeli wina nie leży po stronie organizatora (np. uczestnik nie respektuje postanowień regulaminu obozu),',
    },
    {
      kind: 'bullet',
      text: 'w trakcie obozu — ze zwrotem niewykorzystanych świadczeń pomniejszonych o poniesione koszty organizatora, gdy rozwiązanie Umowy następuje z winy organizatora.',
    },

    { kind: 'section', text: '§ 7' },
    {
      kind: 'item',
      number: '1.',
      text: 'Wszystkie nienormowane niniejszą umową sprawy będą rozstrzygane na drodze negocjacji, a gdy to nie przyniesie skutku — na drodze sądowej.',
    },
    {
      kind: 'item',
      number: '2.',
      text: 'Umowa zawarta jest w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.',
    },
    { kind: 'signatures' },
  ]
  return blocks
}

/**
 * The camp's year, in Polish time: a turnus starting on 1 January is stored
 * as 23:00 UTC the day before, and must not land in the previous season.
 */
export function campSeason(startDate: string): number {
  return Number(
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Warsaw' }).format(
      new Date(startDate),
    ),
  )
}

/** "umowa-oboz-2027-nowak.pdf" — ASCII only, for a download's file name. */
export function contractFileName(season: number, parentLastName: string): string {
  const ascii = parentLastName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `umowa-oboz-${season}${ascii ? `-${ascii}` : ''}.pdf`
}
