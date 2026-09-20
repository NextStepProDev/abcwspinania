/**
 * Treść startowa serwisu.
 *
 * Skąd te dane: z DZIAŁAJĄCEJ strony abcwspinania.info, nie z makiety. Makieta
 * była poglądowa i zaniżała ceny mniej więcej dwukrotnie (kurs skalny 1 690 zł
 * wobec realnych 2 400 zł), gubiła połowę oferty (kurs wielowyciągowy, prace
 * wysokościowe) i twierdziła, że nocleg trzeba sobie znaleźć — podczas gdy
 * szkoła ma własną bazę z pokojami, kuchnią i salą ze ścianką. Ceny i fakty
 * pochodzą stąd; teksty są napisane od nowa, bo oryginały niosą pozostałości
 * po pozycjonowaniu z czasów Joomli.
 *
 * Skrypt jest IDEMPOTENTNY — rozpoznaje wpisy po `slug` i aktualizuje zamiast
 * tworzyć duplikaty. Można go puszczać wielokrotnie.
 *
 * ⚠️ NIE URUCHAMIAĆ NA PRODUKCJI. To dane wyjściowe do poprawienia przez
 * Krzyśka, a nie treść docelowa; nadpisanie tym jego zmian byłoby stratą pracy.
 * Blokada jest niżej i jest celowo twarda.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'Skrypt zasilający nie działa na produkcji — nadpisałby treść wprowadzoną przez klienta.',
  )
}

const USTAWIENIA = {
  telefon: '609 465 237',
  telefonE164: '+48609465237',
  email: 'biuro@abcwspinania.info',
  godziny: 'Najpewniej wieczorem, po zajęciach.',
  uwagaKontaktowa:
    'Bywa, że nie odbieramy — zwykle znaczy to, że trwają zajęcia w skałach. ' +
    'Oddzwaniamy tego samego dnia. W pilnej sprawie najszybciej działa SMS.',
  nazwaFirmy: 'ABC Wspinania — Krzysztof Wróbel',
  ulica: 'Jurajska 47',
  kodPocztowy: '42-421',
  miejscowosc: 'Rzędkowice',
  licencjaPza: '366/WS',
  uprawnieniaPanstwowe: 'IS 182/K/2002',
  rokZalozenia: 2001,
  opisKrotki:
    'Szkoła wspinaczki z licencją Polskiego Związku Alpinizmu. Szkolimy na Jurze ' +
    'Krakowsko-Częstochowskiej, z własnej bazy w Rzędkowicach.',
}

const STRONA_GLOWNA = {
  heroOdznaka: 'Licencja PZA',
  heroPodtytul: 'Rzędkowice, Jura Krakowsko-Częstochowska',
  heroTytul: 'Naucz się wspinać na jurajskim wapieniu',
  heroTekst:
    'Kursy prowadzone według programu Polskiego Związku Alpinizmu, przez instruktora ' +
    'z licencją weryfikowaną co sezon. Czterech uczestników na instruktora, sześć dni, ' +
    'z czego pięć w skale. Baza stoi kwadrans od skał.',
  liczby: [
    { wartosc: 'Licencja PZA', opis: 'weryfikowana co sezon, nie nadana raz', wyrozniony: true },
    // Znacznik {lat} podstawia liczbę wyliczoną z roku założenia — inaczej
    // „25 lat" trzeba by poprawiać ręcznie w każdym styczniu.
    { wartosc: '{lat}', opis: 'szkolenia na Jurze' },
    { wartosc: 'maks. 4 osoby', opis: 'na jednego instruktora' },
    { wartosc: 'Własna baza', opis: 'nocleg i kuchnia kwadrans od skał' },
  ],
  kursyTytul: 'Kursy',
  kursyTekst:
    'Od pierwszego dotknięcia skały po samodzielne zakładanie asekuracji. ' +
    'Każdy kurs kończy się sprawdzeniem umiejętności i zaświadczeniem według programu PZA.',
  obozyOdznaka: 'Obozy',
  obozyTytul: 'Tydzień w skałach — dla dzieci i młodzieży',
  obozyTekst:
    'Turnusy ośmio- i dziewięciodniowe, nocleg w pokojach z łazienkami i pełne wyżywienie. ' +
    'Grupy dobierane wiekiem i doświadczeniem: osobno dla tych, którzy dopiero zaczynają, ' +
    'osobno dla kursantów po szkoleniu. Rodzice dostają galerię uzupełnianą na bieżąco.',
  dlaczego: [
    {
      ikona: 'tarcza' as const,
      tytul: 'Licencja, nie deklaracja',
      opis:
        'Tytuł „instruktor wspinaczki" nie jest w Polsce chroniony — nadać go sobie może ' +
        'każdy. Licencja PZA wymaga kwalifikacji, egzaminu, trzech staży i okresowej ' +
        'weryfikacji. Numer można sprawdzić na liście Związku przed zapisaniem się.',
    },
    {
      ikona: 'ludzie' as const,
      tytul: 'Cztery osoby, nie dwanaście',
      opis:
        'Limit wynika z przepisów PZA i z tego, co da się realnie upilnować. Przy sześciu ' +
        'osobach grupę jeszcze się prowadzi, ale nie sposób zauważyć, że ktoś systematycznie ' +
        'wpina ekspres odwrotnie.',
    },
    {
      ikona: 'dom' as const,
      tytul: 'Własna baza kwadrans od skał',
      opis:
        'Pokoje z łazienkami, wspólna kuchnia i sala wykładowa ze ścianką. Nie trzeba szukać ' +
        'kwatery ani dojeżdżać na zajęcia — przy załamaniu pogody teoria odbywa się na miejscu.',
    },
  ],
  ctaTytul: 'Nie wiesz, który kurs wybrać?',
  ctaTekst:
    'Napisz albo zadzwoń. Dobierzemy szkolenie do tego, co już umiesz i ile masz czasu — ' +
    'czasem odradzamy droższy kurs, bo tańszy wystarczy.',
}

/**
 * Kursy z realnej oferty.
 *
 * `cenaOd` tam, gdzie cennik ma warianty (inny rejon, tryb weekendowy, mniejsza
 * grupa) — pokazanie jednej liczby bez „od" byłoby wprowadzaniem w błąd.
 */
const KURSY = [
  {
    slug: 'kurs-wspinaczki-skalnej-pza',
    title: 'Kurs wspinaczki skalnej PZA',
    summary:
      'Pełny kurs skałkowy według programu Związku. Sześć dni, pięć w skale — od pierwszego ' +
      'węzła po samodzielne prowadzenie drogi z dolną asekuracją.',
    price: 2400,
    cenaOd: true,
    duration: '6 dni',
    level: 'poczatkujacy' as const,
    wyrozniony: true,
    order: 1,
  },
  {
    slug: 'kurs-na-drogach-ubezpieczonych',
    title: 'Kurs na drogach ubezpieczonych',
    summary:
      'Wspinanie na drogach ze stałą asekuracją. Asekuracja górna i dolna, wpinanie, ' +
      'opuszczanie partnera, podstawy zjazdu. Dobry pierwszy kontakt ze skałą.',
    price: 1500,
    cenaOd: true,
    duration: '3 dni',
    level: 'poczatkujacy' as const,
    order: 2,
  },
  {
    slug: 'kurs-asekuracji-tradycyjnej',
    title: 'Kurs asekuracji tradycyjnej',
    summary:
      'Zakładanie własnych punktów: kostki, kostki mechaniczne, punkty naturalne, budowa ' +
      'i likwidacja stanowisk. Kontynuacja kursu na drogach ubezpieczonych.',
    price: 1800,
    duration: '4 dni',
    level: 'sredniozaawansowany' as const,
    order: 3,
  },
  {
    slug: 'kurs-na-sztucznej-sciance',
    title: 'Kurs na sztucznej ściance',
    summary:
      'Samodzielne korzystanie ze ścianki: sprzęt, węzły, asekuracja górna i dolna, technika ' +
      'ruchu. Sprzęt omawiamy pod kątem pierwszych własnych zakupów.',
    price: 700,
    cenaOd: true,
    duration: 'ok. 16 h, min. 2 dni',
    level: 'poczatkujacy' as const,
    order: 4,
  },
  {
    slug: 'kurs-wspinaczki-wielowyciagowej',
    title: 'Kurs wspinaczki wielowyciągowej',
    summary:
      'Drogi wielowyciągowe za granicą — Austria, Chorwacja, Włochy lub Hiszpania. Cztery dni ' +
      'szkolenia w ramach wyjazdu na sześć do dziesięciu dni.',
    price: 2400,
    duration: '4 dni szkolenia',
    level: 'zaawansowany' as const,
    order: 5,
  },
  {
    slug: 'kurs-do-prac-wysokosciowych',
    title: 'Kurs do prac wysokościowych',
    summary:
      'Szkolenie zawodowe z dostępu linowego. Osobno krótszy wariant obejmujący samą technikę ' +
      'zjazdów.',
    price: 2000,
    cenaOd: true,
    duration: '3 dni',
    level: 'sredniozaawansowany' as const,
    order: 6,
  },
  {
    slug: 'szkolenie-indywidualne',
    title: 'Szkolenie indywidualne',
    summary:
      'Zajęcia jeden na jednego, na ściance albo w skałach. Program i termin ustalamy przed ' +
      'wyjściem — technika, konkretna droga, przygotowanie do kursu.',
    price: null,
    duration: 'do uzgodnienia',
    level: 'zaawansowany' as const,
    order: 7,
  },
]

/**
 * ⚠️ Zawartość skryptu leci na GÓRNYM POZIOMIE modułu, a nie w `main()`.
 *
 * Zmierzone: `payload run` kończy proces, gdy skończy się ewaluacja modułu.
 * Wywołanie `main()` bez `await` (nawet z `.catch()`) zwraca sterowanie
 * natychmiast, więc runner gasi proces w środku `getPayload()` — BEZ błędu
 * i z kodem wyjścia 0. Objaw: skrypt „przechodzi", a w bazie nie ma nic.
 * Top-level await wstrzymuje ewaluację i to naprawia.
 */
const payload = await getPayload({ config })

await payload.updateGlobal({ slug: 'ustawienia', data: USTAWIENIA })
payload.logger.info('Ustawienia serwisu zapisane.')

await payload.updateGlobal({ slug: 'strona-glowna', data: STRONA_GLOWNA })
payload.logger.info('Treść strony głównej zapisana.')

for (const kurs of KURSY) {
  const { docs } = await payload.find({
    collection: 'kursy',
    where: { slug: { equals: kurs.slug } },
    // Jawny limit także tutaj — reguła 3 nie ma wyjątku dla skryptów,
    // a domyślne 10 przy szukaniu po unikalnym slugu tylko myli.
    limit: 1,
  })

  if (docs[0]) {
    await payload.update({ collection: 'kursy', id: docs[0].id, data: kurs })
    payload.logger.info(`Zaktualizowano kurs: ${kurs.title}`)
  } else {
    await payload.create({ collection: 'kursy', data: kurs })
    payload.logger.info(`Dodano kurs: ${kurs.title}`)
  }
}

payload.logger.info(`Gotowe — ${KURSY.length} kursów i 2 globale.`)
process.exit(0)
