import type { BookingKind } from '@/lib/bookings'

/**
 * Which half of the bookings list the address filters on: the `kind`
 * condition wherever it sits — `where[and][0][kind][equals]` from the links
 * (`adminListUrl.ts`), `where[kind][equals]` typed by hand, or
 * `where[or][0][and][0][kind][equals]` once the panel's filter builder
 * rewrites it. Both kinds in one address, or none, is the whole list.
 */
export function kindFromListQuery(params: Iterable<[string, string]>): BookingKind | null {
  const kinds = new Set<string>()
  for (const [key, value] of params) {
    if (/\[kind\]\[equals\]$/.test(key)) kinds.add(value)
  }
  if (kinds.size !== 1) return null
  const [kind] = kinds
  return kind === 'course' || kind === 'camp' ? kind : null
}

/** One `[field][operator]` of a list address, whatever it is nested in. */
function conditionsOf(params: Iterable<[string, string]>) {
  const found: { field: string; operator: string; value: string }[] = []
  for (const [key, value] of params) {
    const m = /\[([A-Za-z_.]+)\]\[([a-z_]+)\](?:\[\d+\])?$/.exec(key)
    if (m && key.startsWith('where')) found.push({ field: m[1], operator: m[2], value })
  }
  return found
}

type ListView =
  | 'menu'
  | 'all'
  | 'new'
  | 'confirmed'
  | 'waitlist'
  | 'withoutForm'
  | 'lateDeposit'
  | 'lostEmails'
  | 'session'
  | 'filtered'

/**
 * Which view the list is — a dashboard tile (`dashboardConditions`), the
 * menu's (`bookingsMenuConditions`), or filters set by hand. Read from the
 * conditions themselves, not a marker in the address: change a filter and
 * the description follows what is actually shown.
 */
function viewOf(conditions: ReturnType<typeof conditionsOf>): ListView {
  const fields = new Set(conditions.map((c) => c.field))
  const only = (...allowed: string[]) => [...fields].every((f) => allowed.includes(f))
  if (fields.has('emailIssueAt')) return 'lostEmails'
  if (fields.has('registeredAt')) return 'withoutForm'
  if (fields.has('depositDueAt')) return 'lateDeposit'
  if (fields.has('session') && only('session', 'kind')) return 'session'
  const status = conditions.filter((c) => c.field === 'status')
  if (status.length === 1 && status[0].operator === 'equals' && only('status', 'kind')) {
    const v = status[0].value
    if (v === 'new' || v === 'confirmed' || v === 'waitlist') return v
  }
  if (fields.has('sessionStart') && only('kind', 'sessionStart')) return 'menu'
  if (only('kind')) return 'all'
  return 'filtered'
}

const VIEW_TITLE: Record<ListView, string | null> = {
  menu: null,
  all: null,
  new: 'Nowe zgłoszenia',
  confirmed: 'Potwierdzone',
  waitlist: 'Lista rezerwowa',
  withoutForm: 'Bez formularza',
  lateDeposit: 'Zaliczka po terminie',
  lostEmails: 'Maile, które nie doszły',
  session: null,
  filtered: null,
}

function aboutOf(view: ListView, kind: BookingKind | null): string {
  const camp = kind === 'camp'
  switch (view) {
    case 'menu':
      return 'Wszystkie zapisy, terminy po kolei od najbliższego, od miesiąca wstecz — starsze zobaczysz, usuwając warunek „Początek terminu” w Filtrach.'
    case 'all':
      return 'Wszystkie zapisy, terminy po kolei od najbliższego.'
    case 'new':
      return camp
        ? 'Dzieci zapisane na obóz, których zapisu jeszcze nie potwierdziłeś.'
        : 'Zapisy, których jeszcze nie potwierdziłeś.'
    case 'confirmed':
      return 'Zapisy potwierdzone, które czekają na zaliczkę.'
    case 'waitlist':
      return camp
        ? 'Dzieci czekające, aż zwolni się miejsce. Gdy przestawisz dziecku status na miejsce, rodzic sam dostanie link do formularza rejestracyjnego.'
        : 'Osoby czekające, aż zwolni się miejsce. Nikt nie jest przesuwany sam — o zwolnionym miejscu dostajesz maila.'
    case 'withoutForm':
      return 'Dzieci z miejscem, których rodzic jeszcze nie wysłał formularza rejestracyjnego — tylko obozy, które się jeszcze nie zaczęły. Po 4 dniach system raz przypomina rodzicowi; potem warto zadzwonić. Link wyślesz ponownie z zapisu dziecka: „Wyślij rodzicowi link do formularza”.'
    case 'lateDeposit':
      return 'Minęło 7 dni od maila z umową i danymi do przelewu, a zaliczki nie zaznaczono — tylko obozy, które się jeszcze nie zaczęły. Rodzic dostaje jedno przypomnienie (poranne sprzątanie); miejsce nie jest zwalniane. Po wpłacie ustaw „zaliczka wpłacona”.'
    case 'lostEmails':
      return 'Zapisy, przy których mail do kursanta albo rodzica nie wyszedł — ta osoba o niczym nie wie. Co i dlaczego, jest w zapisie („Mail, który nie doszedł”); gdy się odezwiesz, zaznacz tam „Załatwione”.'
    case 'session':
      return camp
        ? 'Dzieci zapisane na jeden turnus — z tabeli terminów na pulpicie.'
        : 'Osoby zapisane na jeden termin — z tabeli terminów na pulpicie.'
    case 'filtered':
      return 'Lista z filtrami ustawionymi ręcznie — co jest ustawione, zobaczysz w Filtrach.'
  }
}

function rulesOf(kind: BookingKind | null): string {
  if (kind === 'camp') {
    return 'Imię, nazwisko i kontakt to dane rodzica, a uczestnik to dziecko. Zmiana statusu na „potwierdzony”, „zaliczka wpłacona” albo „rezygnacja” wysyła maila rodzicowi, na „opłacony” — tylko przed rozpoczęciem obozu. Zapis telefoniczny dodaj ręcznie (rodzaj zapisu: obóz; rodzeństwo — „Zduplikuj” w zapisie dziecka); liczy się wtedy do wolnych miejsc.'
  }
  if (kind === 'course') {
    return 'Zmiana statusu na „potwierdzony” albo „rezygnacja” wysyła maila kursantowi, na „opłacony” — tylko przed pierwszym dniem kursu. Zapis telefoniczny dodaj ręcznie; liczy się wtedy do wolnych miejsc.'
  }
  return 'Zapisy na kursy i obozy. Przy obozie imię, nazwisko i kontakt to dane rodzica, a uczestnik to dziecko. Zmiana statusu na „potwierdzony”, „opłacony” albo „rezygnacja” wysyła maila kursantowi albo rodzicowi (przy obozie także „zaliczka wpłacona”). Zapis telefoniczny dodaj tu ręcznie — wtedy liczy się do wolnych miejsc.'
}

/**
 * The text under the list's heading (`BookingsListDescription`, asked for
 * 24.10.2026): where the school is — which half and which tile — and what
 * the rows are, then when a status change emails someone. Payload's own
 * heading and description are the collection's, the same for every view.
 */
export function describeBookingsList(params: Iterable<[string, string]>): {
  title: string
  about: string
  rules: string
} {
  const entries = [...params]
  const kind = kindFromListQuery(entries)
  const view = viewOf(conditionsOf(entries))
  const half =
    kind === 'camp' ? 'Zapisy na obozy' : kind === 'course' ? 'Zapisy na kursy' : 'Zapisy'
  const tile =
    view === 'session' ? (kind === 'camp' ? 'Jeden turnus' : 'Jeden termin') : VIEW_TITLE[view]
  return {
    title: tile ? `${half} · ${tile}` : half,
    about: aboutOf(view, kind),
    rules: rulesOf(kind),
  }
}

/** The collection's own description — where no view applies (the API, a bare list). */
export const BOOKINGS_DESCRIPTION = rulesOf(null)
