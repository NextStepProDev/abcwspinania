'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

import { zgodaDoZapisu } from '@/lib/consent'
import { walidujKontakt, jestPoprawny, wygladaNaBota } from '@/lib/validation'
import type { BledyWalidacji } from '@/lib/validation'

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
    zgoda: formData.get('zgoda') === 'on',
  }

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
    await payload.create({
      collection: 'wiadomosci',
      data: {
        imie: dane.imie.trim(),
        email: dane.email.trim(),
        telefon: dane.telefon.trim() || undefined,
        tresc: dane.tresc.trim(),
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
