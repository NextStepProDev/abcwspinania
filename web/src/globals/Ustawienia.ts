import type { GlobalConfig } from 'payload'

/**
 * Dane identyfikujące szkołę: kontakt, adres, licencja, profile.
 *
 * Dlaczego global, a nie stała w kodzie: telefon i adres e-mail były wcześniej
 * w `lib/site.ts` z pustymi wartościami i komentarzem „do potwierdzenia
 * z klientem". Każda ich zmiana oznaczała commit, przegląd, build obrazu
 * i deploy na maszynę klienta — czyli pełną procedurę wdrożeniową po to, żeby
 * poprawić numer telefonu. Tutaj Krzysiek zmienia to sam.
 *
 * Zasada „puste pole nie renderuje zepsutego linku" ZOSTAJE — przeniosła się
 * tylko z `telHref()` do komponentów, które czytają ten global.
 */
export const Ustawienia: GlobalConfig = {
  slug: 'ustawienia',
  label: 'Ustawienia serwisu',
  admin: {
    group: 'Ustawienia',
    description: 'Dane kontaktowe i informacje o szkole. Pokazują się na całej stronie.',
  },
  access: {
    // Publiczny odczyt — te dane są na każdej podstronie. Deklarowane w kodzie,
    // nie wyklikiwane w panelu osobno na każdym środowisku (reguła 5).
    read: () => true,
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Kontakt',
      fields: [
        {
          name: 'telefon',
          type: 'text',
          label: 'Telefon',
          admin: {
            description:
              'Tak jak ma się wyświetlać, np. „609 465 237”. Puste = strona nie pokazuje telefonu.',
          },
        },
        {
          name: 'telefonE164',
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
          name: 'godziny',
          type: 'textarea',
          label: 'Kiedy dzwonić',
          admin: {
            description: 'Każda linia wyświetli się osobno, np. „Pon.–pt. 9:00–19:00”.',
          },
        },
        {
          name: 'uwagaKontaktowa',
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
        { name: 'nazwaFirmy', type: 'text', label: 'Nazwa (pełna)' },
        { name: 'ulica', type: 'text', label: 'Ulica i numer' },
        { name: 'kodPocztowy', type: 'text', label: 'Kod pocztowy' },
        { name: 'miejscowosc', type: 'text', label: 'Miejscowość' },
        {
          name: 'dojazd',
          type: 'textarea',
          maxLength: 800,
          label: 'Jak dojechać',
          admin: {
            description: 'Kilka zdań: skąd, ile jedzie się samochodem, czym komunikacją.',
          },
        },
        {
          name: 'mapaEmbed',
          type: 'text',
          label: 'Adres osadzanej mapy',
          admin: {
            description:
              'Pełny adres z pola „src” kodu osadzenia mapy. Puste = zamiast mapy ' +
              'pokazujemy sam adres.',
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Szkoła i uprawnienia',
      fields: [
        {
          name: 'licencjaPza',
          type: 'text',
          label: 'Numer licencji instruktorskiej PZA',
          admin: { description: 'Np. „366/WS”. Pokazuje się w stopce.' },
        },
        {
          name: 'uprawnieniaPanstwowe',
          type: 'text',
          label: 'Uprawnienia państwowe',
        },
        {
          name: 'rokZalozenia',
          type: 'number',
          label: 'Rok powstania szkoły',
          admin: {
            description:
              'Z tego liczymy „X lat doświadczenia”, żeby nie dezaktualizowało się co styczeń.',
          },
        },
        {
          name: 'opisKrotki',
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
