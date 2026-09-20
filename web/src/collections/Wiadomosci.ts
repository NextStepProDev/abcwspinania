import type { CollectionConfig } from 'payload'

import { TEMATY_DLA_PAYLOADA } from '../lib/tematy'

/**
 * Wiadomości z formularza kontaktowego.
 *
 * Formularz zamiast samego adresu e-mail na stronie: adres trzeba przepisać
 * ręcznie, a formularz wypełnia się na miejscu. Część zapytań powstaje tylko
 * wtedy, gdy nie wymaga to od nikogo dodatkowego kroku.
 *
 * Wiadomości lądują W BAZIE, a nie w mailu. To świadome: adaptera e-mail jeszcze
 * nie ma (Brevo to osobny etap), a zapis do bazy działa od pierwszego dnia
 * i nic nie ginie po drodze. Powiadomienie mailowe dojdzie jako `afterChange`,
 * nie zmieniając tego, co tutaj.
 */
export const Wiadomosci: CollectionConfig = {
  slug: 'wiadomosci',
  labels: {
    singular: 'Wiadomość',
    plural: 'Wiadomości',
  },
  admin: {
    useAsTitle: 'imie',
    defaultColumns: ['imie', 'email', 'status', 'createdAt'],
    group: 'Kontakt',
    description: 'Zgłoszenia z formularza na stronie. Nowe są u góry.',
  },
  access: {
    // Tworzyć może KAŻDY — to formularz publiczny. Czytać, zmieniać i kasować
    // tylko zalogowani: wiadomości zawierają dane osobowe (imię, e-mail,
    // telefon), więc publiczny odczyt byłby wyciekiem, a nie udogodnieniem.
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'imie',
      type: 'text',
      required: true,
      maxLength: 120,
      label: 'Imię',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      label: 'E-mail',
    },
    {
      name: 'telefon',
      type: 'text',
      maxLength: 30,
      label: 'Telefon',
    },
    {
      name: 'tresc',
      type: 'textarea',
      required: true,
      maxLength: 4000,
      label: 'Treść',
    },
    {
      name: 'temat',
      type: 'select',
      label: 'Czego dotyczy',
      options: TEMATY_DLA_PAYLOADA,
      admin: {
        description: 'Wybrane przez osobę piszącą. Wypełnia się samo, gdy pisze z podstrony kursu.',
      },
    },
    {
      name: 'preferowanyTermin',
      type: 'text',
      maxLength: 200,
      label: 'Preferowany termin',
      admin: { description: 'Nieobowiązkowe, wpisywane własnymi słowami.' },
    },
    {
      name: 'kurs',
      type: 'relationship',
      relationTo: 'kursy',
      label: 'Dotyczy kursu',
      admin: {
        description: 'Wypełnione automatycznie, gdy ktoś pisze z podstrony kursu.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'nowa',
      label: 'Status',
      options: [
        { label: 'nowa', value: 'nowa' },
        { label: 'w toku', value: 'w-toku' },
        { label: 'załatwiona', value: 'zalatwiona' },
      ],
    },
    // --- RODO: zgoda musi być udokumentowana, nie domniemana ---
    {
      name: 'zgodaTresc',
      type: 'textarea',
      required: true,
      label: 'Treść zgody',
      admin: {
        readOnly: true,
        description:
          'Dokładne brzmienie klauzuli zaakceptowanej przez osobę wysyłającą. ' +
          'Zapisujemy TREŚĆ, a nie samo „tak" — inaczej po zmianie klauzuli ' +
          'nie da się wykazać, na co ktoś faktycznie wyraził zgodę.',
      },
    },
    {
      name: 'zgodaData',
      type: 'date',
      required: true,
      label: 'Data zgody',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
