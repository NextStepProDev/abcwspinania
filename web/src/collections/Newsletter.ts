import type { CollectionConfig } from 'payload'

/**
 * Zapisy na newsletter.
 *
 * Osobna kolekcja od `Wiadomosci`, mimo że obie zbierają adresy e-mail:
 * to inna podstawa przetwarzania (zgoda marketingowa kontra odpowiedź na
 * zapytanie), inny okres przechowywania i inny tryb wycofania. Trzymanie
 * ich razem kończy się wysyłką newslettera do osób, które tylko o coś
 * zapytały.
 *
 * Tak jak przy formularzu kontaktowym, ZAPISUJEMY TREŚĆ ZGODY, nie samo
 * „tak" — po zmianie brzmienia klauzuli inaczej nie da się wykazać, na co
 * dana osoba faktycznie się zgodziła.
 *
 * Wysyłki jeszcze nie ma (Brevo to osobny etap). Zapis do bazy działa od
 * pierwszego dnia i nic nie ginie po drodze — adresy czekają na wpięcie
 * dostawcy.
 */
export const Newsletter: CollectionConfig = {
  slug: 'newsletter',
  labels: { singular: 'Zapis na newsletter', plural: 'Newsletter' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'createdAt'],
    group: 'Kontakt',
    description: 'Adresy zapisane przez formularz w stopce. Wysyłki jeszcze nie ma.',
  },
  access: {
    // Zapisać może każdy — to formularz publiczny. Czytać i kasować tylko
    // zalogowani: lista adresów to dane osobowe.
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      label: 'Adres e-mail',
      admin: {
        description: 'Unikalny — powtórny zapis tego samego adresu nie tworzy drugiego wpisu.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'zapisany',
      required: true,
      label: 'Status',
      options: [
        { label: 'zapisany', value: 'zapisany' },
        { label: 'wypisany', value: 'wypisany' },
      ],
      admin: {
        description: 'Wypisanych NIE kasujemy — trzeba móc wykazać, że i kiedy ktoś zgodę wycofał.',
      },
    },
    {
      name: 'zgodaTresc',
      type: 'textarea',
      required: true,
      label: 'Treść zgody',
      admin: {
        readOnly: true,
        description: 'Dokładne brzmienie klauzuli zaakceptowanej przy zapisie.',
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
