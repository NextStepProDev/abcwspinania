import type { CollectionConfig } from 'payload'

/**
 * Konta do panelu — Ty i Krzysiek.
 *
 * Różnica wobec Strapiego, warta zapamiętania: tam były DWA niezależne światy
 * użytkowników (administratorzy panelu i osobno użytkownicy API z wtyczki
 * users-permissions), które nie wiedziały o swoim istnieniu. Tutaj logowanie to
 * zwykła właściwość kolekcji (`auth: true`), więc konta uczestników na etapie
 * rezerwacji będą po prostu drugą kolekcją z tym samym mechanizmem.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  // Etykiety po polsku — to JEDYNA kolekcja, która ich nie miała, więc „Users"
  // sterczało w menu obok „Kursy", „Opinie" i „Wiadomości". Panel obsługuje
  // klient, nie programista.
  labels: {
    singular: 'Konto',
    plural: 'Konta panelu',
  },
  admin: {
    useAsTitle: 'email',
    group: 'System',
  },
  auth: true,
  // Bez `access.read: () => true` — dane kont nie są publiczne. Payload
  // domyślnie wymaga zalogowania, więc świadomie NIE otwieramy tego.
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Imię i nazwisko',
    },
  ],
}
