import type { GlobalConfig } from 'payload'

import { mapEmbedUrlFrom } from '../lib/format'

/**
 * Data identifying the school: contact details, address, licence, profiles.
 *
 * Why a global rather than a constant in code: the phone number and email
 * address used to live in `lib/site.ts` with empty values and a "to be
 * confirmed with the client" comment. Changing either meant a commit, a review,
 * an image build and a deploy to the client's machine — the full release
 * procedure just to correct a phone number. Here the client changes it himself.
 *
 * The "an empty field renders no broken link" rule STAYS — it only moved from
 * `telHref()` into the components that read this global.
 *
 * The slug deliberately avoids a trailing "s": Payload derives the generated
 * type name from the slug and strips one, so `site-settings` would produce
 * `SiteSetting`.
 */
export const SiteConfig: GlobalConfig = {
  slug: 'site-config',
  label: 'Ustawienia serwisu',
  admin: {
    group: 'Ustawienia',
    description: 'Dane kontaktowe i informacje o szkole. Pokazują się na całej stronie.',
  },
  access: {
    // Public read — this data is on every page. Declared in code, not clicked
    // through the panel separately in each environment (rule 5).
    read: () => true,
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Kontakt',
      fields: [
        {
          name: 'phone',
          type: 'text',
          label: 'Telefon',
          admin: {
            description:
              'Tak jak ma się wyświetlać, np. „609 465 237”. Puste = strona nie pokazuje telefonu.',
          },
        },
        {
          name: 'phoneE164',
          type: 'text',
          label: 'Telefon do linku (format międzynarodowy)',
          admin: {
            description:
              'Np. „+48609465237”. To trafia do linku klikalnego na telefonie. ' +
              'Puste = wyliczymy z pola wyżej.',
          },
        },
        {
          name: 'email',
          type: 'email',
          label: 'Adres e-mail',
        },
        {
          name: 'openingHours',
          type: 'textarea',
          label: 'Kiedy dzwonić',
          admin: {
            description: 'Każda linia wyświetli się osobno, np. „Pon.–pt. 9:00–19:00”.',
          },
        },
        {
          name: 'contactNote',
          type: 'textarea',
          maxLength: 400,
          label: 'Uwaga przy danych kontaktowych',
          admin: {
            description: 'Np. że nie zawsze da się odebrać, bo trwają zajęcia w skałach.',
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Adres',
      fields: [
        { name: 'legalName', type: 'text', label: 'Nazwa (pełna)' },
        { name: 'street', type: 'text', label: 'Ulica i numer' },
        { name: 'postalCode', type: 'text', label: 'Kod pocztowy' },
        { name: 'city', type: 'text', label: 'Miejscowość' },
        {
          name: 'directions',
          type: 'textarea',
          maxLength: 800,
          label: 'Jak dojechać',
          admin: {
            description: 'Kilka zdań: skąd, ile jedzie się samochodem, czym komunikacją.',
          },
        },
        {
          name: 'mapEmbedUrl',
          type: 'text',
          label: 'Adres osadzanej mapy',
          validate: (value: string | null | undefined) =>
            !value?.trim() ||
            mapEmbedUrlFrom(value) !== null ||
            'To jest link do udostępniania, a nie do osadzenia. W Mapach Google: ' +
              'Udostępnij → Umieść mapę → Kopiuj HTML i wklej tutaj całość. ' +
              'Albo zostaw pole puste — mapa powstanie z adresu.',
          admin: {
            description:
              'Zwykle zostaw puste — mapa na stronie kontaktu powstaje sama z adresu ' +
              'powyżej. Wypełnij tylko, gdy pinezka ma stać gdzie indziej: wklej ' +
              'kod z Map Google (Udostępnij → Umieść mapę → Kopiuj HTML).',
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Szkoła i uprawnienia',
      fields: [
        {
          name: 'pzaLicence',
          type: 'text',
          label: 'Numer licencji instruktorskiej PZA',
          admin: { description: 'Np. „366/WS”. Pokazuje się w stopce.' },
        },
        {
          name: 'stateQualifications',
          type: 'text',
          label: 'Uprawnienia państwowe',
        },
        {
          name: 'foundedYear',
          type: 'number',
          label: 'Rok powstania szkoły',
          admin: {
            description:
              'Z tego liczymy „X lat doświadczenia”, żeby nie dezaktualizowało się co styczeń.',
          },
        },
        {
          name: 'shortDescription',
          type: 'textarea',
          maxLength: 300,
          label: 'Krótki opis szkoły',
          admin: { description: 'Jedno–dwa zdania. Widoczne w stopce.' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Profile w serwisach',
      fields: [
        { name: 'facebook', type: 'text', label: 'Facebook' },
        { name: 'youtube', type: 'text', label: 'YouTube' },
      ],
    },
  ],
}
