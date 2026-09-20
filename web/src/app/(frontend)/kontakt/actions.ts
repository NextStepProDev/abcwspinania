'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

import { zgodaDoZapisu, zgodaNewsletteraDoZapisu } from '@/lib/consent'
import { walidujKontakt, walidujNewsletter, jestPoprawny, wygladaNaBota } from '@/lib/validation'
import type { BledyWalidacji, BledyNewslettera } from '@/lib/validation'
import type { Wiadomosci } from '@/payload-types'

type Temat = Wiadomosci['temat']

/** Czy kurs o tym identyfikatorze wciąż istnieje. Błąd traktujemy jak „nie". */
async function kursIstnieje(
  payload: Awaited<ReturnType<typeof getPayload>>,
  id: number,
): Promise<boolean> {
  try {
    const { totalDocs } = await payload.count({
      collection: 'kursy',
      where: { id: { equals: id } },
    })
    return totalDocs > 0
  } catch {
    return false
  }
}

export interface StanFormularza {
  status: 'bezczynny' | 'wyslano' | 'blad'
  bledy?: BledyWalidacji
  komunikat?: string
}

export async function wyslijWiadomosc(
  _poprzedni: StanFormularza,
  formData: FormData,
): Promise<StanFormularza> {
  const dane = {
    imie: String(formData.get('imie') ?? ''),
    email: String(formData.get('email') ?? ''),
    telefon: String(formData.get('telefon') ?? ''),
    tresc: String(formData.get('tresc') ?? ''),
    temat: String(formData.get('temat') ?? ''),
    preferowanyTermin: String(formData.get('preferowanyTermin') ?? ''),
    zgoda: formData.get('zgoda') === 'on',
  }

  // Identyfikator kursu, z którego podstrony przyszło zgłoszenie. Pole `kurs`
  // w kolekcji istnieje od początku właśnie po to. Parsujemy ostrożnie: wartość
  // przychodzi z formularza, więc może być czymkolwiek, a `NaN` w relacji
  // wywaliłby zapis.
  const surowyKurs = Number(formData.get('kurs'))
  const kursId = Number.isInteger(surowyKurs) && surowyKurs > 0 ? surowyKurs : undefined

  // Pułapka na roboty — udajemy sukces, nic nie zapisując.
  if (wygladaNaBota(String(formData.get('strona-www') ?? ''))) {
    return { status: 'wyslano' }
  }

  // Walidacja po stronie SERWERA. Atrybuty `required` w HTML-u są wygodą dla
  // odwiedzającego, a nie zabezpieczeniem — omija je każdy, kto wyśle żądanie
  // bez formularza.
  const bledy = walidujKontakt(dane)
  if (!jestPoprawny(bledy)) {
    return { status: 'blad', bledy, komunikat: 'Popraw zaznaczone pola.' }
  }

  try {
    const payload = await getPayload({ config })

    // Przypisanie kursu to METADANA, a wiadomość to rzecz, po którą tu
    // jesteśmy. Gdyby kurs zniknął z panelu między wyświetleniem formularza
    // a wysyłką, relacja wskazywałaby na nieistniejący wpis i Payload odrzuciłby
    // CAŁY zapis — osoba pisząca zobaczyłaby błąd i straciła swoją wiadomość.
    // Sprawdzamy więc wcześniej i w razie czego zapisujemy bez przypisania.
    const kurs = kursId && (await kursIstnieje(payload, kursId)) ? kursId : undefined

    await payload.create({
      collection: 'wiadomosci',
      data: {
        imie: dane.imie.trim(),
        email: dane.email.trim(),
        telefon: dane.telefon.trim() || undefined,
        tresc: dane.tresc.trim(),
        // Puste pole wyboru zapisujemy jako brak wartości, nie jako pusty ciąg —
        // Payload odrzuciłby '' jako wartość spoza listy opcji.
        temat: (dane.temat.trim() || undefined) as Temat,
        preferowanyTermin: dane.preferowanyTermin.trim() || undefined,
        kurs,
        status: 'nowa',
        zgodaTresc: zgodaDoZapisu(),
        zgodaData: new Date().toISOString(),
      },
      // Formularz jest publiczny, więc żądanie nie ma zalogowanego użytkownika.
      // `overrideAccess: false` wymusza przejście przez regułę `create` kolekcji
      // zamiast obchodzenia jej — gdyby ktoś kiedyś tę regułę zaostrzył,
      // formularz przestanie działać GŁOŚNO, a nie po cichu ją ominie.
      overrideAccess: false,
    })
    return { status: 'wyslano' }
  } catch (error) {
    // Odwiedzającemu nie pokazujemy treści błędu — bywa w niej fragment
    // zapytania do bazy. Do logu trafia wszystko.
    console.error('Nie udało się zapisać wiadomości z formularza:', error)
    return {
      status: 'blad',
      komunikat: 'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę albo zadzwoń.',
    }
  }
}

// --- Newsletter --------------------------------------------------------------

export interface StanNewslettera {
  status: 'bezczynny' | 'zapisano' | 'blad'
  bledy?: BledyNewslettera
  komunikat?: string
}

/**
 * Zapis na newsletter.
 *
 * Wysyłki jeszcze nie ma (Brevo to osobny etap) — adres trafia do bazy
 * i tam czeka. To świadome: pole, które niczego nie zapisuje, traci adresy
 * osób zainteresowanych, a takich nie da się odzyskać.
 */
export async function zapiszNaNewsletter(
  _poprzedni: StanNewslettera,
  formData: FormData,
): Promise<StanNewslettera> {
  const dane = {
    email: String(formData.get('email') ?? ''),
    zgoda: formData.get('zgoda-newsletter') === 'on',
  }

  if (wygladaNaBota(String(formData.get('strona-www') ?? ''))) {
    return { status: 'zapisano' }
  }

  const bledy = walidujNewsletter(dane)
  if (!jestPoprawny(bledy)) {
    return { status: 'blad', bledy }
  }

  const email = dane.email.trim().toLowerCase()

  try {
    const payload = await getPayload({ config })

    // Adres jest w kolekcji unikalny, więc powtórny zapis wywaliłby się na
    // ograniczeniu bazy. Dla osoby po drugiej stronie powtórny zapis to nie
    // błąd, tylko potwierdzenie — i tak to raportujemy. Przy okazji wskrzesza
    // to kogoś, kto się wcześniej wypisał i teraz wraca.
    // ⚠️ `overrideAccess: true` — jedyne miejsce w kodzie, gdzie obchodzimy
    // regułę dostępu. Odczyt kolekcji wymaga zalogowania (lista adresów to
    // dane osobowe), a tutaj żądanie przychodzi od anonimowego odwiedzającego.
    // Jest to bezpieczne, bo sprawdzamy WYŁĄCZNIE adres, który ta osoba sama
    // przed chwilą podała, i odpowiadamy identycznie niezależnie od wyniku —
    // nie powstaje więc sposób na sprawdzanie, kto jest na liście.
    const { docs } = await payload.find({
      collection: 'newsletter',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })

    if (docs[0]) {
      if (docs[0].status === 'wypisany') {
        await payload.update({
          collection: 'newsletter',
          id: docs[0].id,
          data: {
            status: 'zapisany',
            zgodaTresc: zgodaNewsletteraDoZapisu(),
            zgodaData: new Date().toISOString(),
          },
          overrideAccess: true,
        })
      }
      return { status: 'zapisano' }
    }

    await payload.create({
      collection: 'newsletter',
      data: {
        email,
        status: 'zapisany',
        zgodaTresc: zgodaNewsletteraDoZapisu(),
        zgodaData: new Date().toISOString(),
      },
      // Tworzenie przechodzi przez regułę `create` kolekcji, tak jak przy
      // formularzu kontaktowym — zaostrzenie jej ma zepsuć formularz GŁOŚNO.
      overrideAccess: false,
    })

    return { status: 'zapisano' }
  } catch (error) {
    console.error('Nie udało się zapisać adresu na newsletter:', error)
    return {
      status: 'blad',
      komunikat: 'Nie udało się zapisać. Spróbuj ponownie za chwilę.',
    }
  }
}
