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

// The menu's view of each half (`bookingsMenuConditions` in `BookingsNavLinks`).
const ORDER =
  ' Lista z menu: terminy po kolei, od najbliższego, od miesiąca wstecz — starsze zobaczysz, usuwając warunek „Początek terminu” w Filtrach.'

/** The description under the list's heading, per half (`BookingsListDescription`). */
export function bookingsListDescription(kind: BookingKind | null): {
  title?: string
  text: string
} {
  if (kind === 'camp') {
    return {
      title: 'Zapisy na obozy',
      text:
        'Imię, nazwisko i kontakt to dane rodzica, a uczestnik to dziecko. Zmiana statusu na „potwierdzony”, „zaliczka wpłacona” albo „rezygnacja” wysyła maila rodzicowi, na „opłacony” — tylko przed rozpoczęciem obozu. Zapis telefoniczny dodaj ręcznie (rodzaj zapisu: obóz; rodzeństwo — „Zduplikuj” w zapisie dziecka); liczy się wtedy do wolnych miejsc.' +
        ORDER,
    }
  }
  if (kind === 'course') {
    return {
      title: 'Zapisy na kursy',
      text:
        'Zmiana statusu na „potwierdzony” albo „rezygnacja” wysyła maila kursantowi, na „opłacony” — tylko przed pierwszym dniem kursu. Zapis telefoniczny dodaj ręcznie; liczy się wtedy do wolnych miejsc.' +
        ORDER,
    }
  }
  return {
    text: 'Zapisy na kursy i obozy. Przy obozie imię, nazwisko i kontakt to dane rodzica, a uczestnik to dziecko. Zmiana statusu na „potwierdzony”, „opłacony” albo „rezygnacja” wysyła maila kursantowi albo rodzicowi (przy obozie także „zaliczka wpłacona”). Zapis telefoniczny dodaj tu ręcznie — wtedy liczy się do wolnych miejsc.',
  }
}
