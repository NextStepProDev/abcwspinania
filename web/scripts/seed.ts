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

/**
 * Buduje treść dla pola richText (Lexical) z gołych akapitów.
 *
 * Lexical trzyma treść jako drzewo węzłów z kompletem pól technicznych
 * (`format`, `indent`, `direction`, `version`), więc wpisanie choćby jednego
 * zdania „na piechotę" to kilkanaście linii szumu. Ten helper pozwala
 * w danych startowych pisać zwykły tekst.
 */
function akapity(...tresci: string[]) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: tresci.map((tekst) => ({
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        children: [
          {
            type: 'text',
            text: tekst,
            format: 0,
            style: '',
            mode: 'normal' as const,
            detail: 0,
            version: 1,
          },
        ],
      })),
    },
  }
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
    tytulEn: 'Rock climbing course (PZA syllabus)',
    summary:
      'Pełny kurs skałkowy według programu Związku. Sześć dni, pięć w skale — od pierwszego ' +
      'węzła po samodzielne prowadzenie drogi z dolną asekuracją.',
    price: 2400,
    cenaOd: true,
    duration: '6 dni',
    level: 'poczatkujacy' as const,
    grupaMax: 4,
    miejsce: 'Rzędkowice',
    certyfikat: 'zaświadczenie PZA',
    wyrozniony: true,
    order: 1,
    dlaKogo: akapity(
      'Kurs jest napisany dla osób, które nigdy nie dotknęły skały. Nie wymagamy ' +
        'przygotowania ani własnego sprzętu — wystarczy sprawność pozwalająca przejść ' +
        'podejście pod skały z plecakiem.',
      'Jeśli wspinasz się już na sztucznej ściance, pierwszego dnia przeskoczymy podstawy ' +
        'i pójdziemy dalej. Uprzedzamy jednak: część nawyków ze ścianki w skale jest ' +
        'bezużyteczna, a część niebezpieczna, i właśnie ich odkręcanie zajmuje najwięcej czasu.',
      'Grupy są maksymalnie czteroosobowe — tyle dopuszczają przepisy PZA i tyle da się ' +
        'realnie upilnować. Osoby niepełnoletnie przyjmujemy za pisemną zgodą rodziców.',
    ),
    program: [
      {
        tytul: 'Sprzęt, węzły, asekuracja górna',
        opis:
          'Uprząż, przyrządy, lina. Ósemka, kluczka, półwyblinka, wyblinka. Pierwsze wejścia ' +
          'na wędce i nauka asekurowania partnera.',
      },
      {
        tytul: 'Technika ruchu i praca nóg',
        opis:
          'Chwyty i stopnie, pozycja frontalna i boczna, wspinaczka statyczna i dynamiczna. ' +
          'Cały dzień w łatwym terenie, żeby ruch wszedł w nawyk.',
      },
      {
        tytul: 'Zjazdy i wychodzenie po linie',
        opis:
          'Zjazd w wysokim przyrządzie z autoasekuracją, stanowisko zjazdowe, przepinka, ' +
          'prusikowanie i wyjście z sytuacji awaryjnej.',
      },
      {
        tytul: 'Asekuracja dolna',
        opis:
          'Wpinanie ekspresów, prowadzenie liny, rozmieszczanie przelotów, asekuracja ' +
          'prowadzącego i wychwytywanie odpadnięć.',
      },
      {
        tytul: 'Punkty własne i stanowiska',
        opis:
          'Kostki, kostki mechaniczne, punkty naturalne. Łączenie punktów, budowa stanowisk ' +
          'dolnych, górnych i pośrednich.',
      },
      {
        tytul: 'Sprawdzian i zaświadczenie',
        opis:
          'Część teoretyczna i praktyczna. Warunkiem zaliczenia jest samodzielne pokonanie ' +
          'z dolną asekuracją drogi o trudności co najmniej IV w skali UIAA.',
      },
    ],
    wCenie: [
      { pozycja: 'Instruktor z licencją PZA przez sześć dni' },
      { pozycja: 'Komplet sprzętu: uprząż, kask, buty, liny, przyrządy' },
      { pozycja: 'Materiały szkoleniowe i program kursu na piśmie' },
      { pozycja: 'Zaświadczenie PZA po zaliczeniu sprawdzianu' },
    ],
    pozaCena: [
      { pozycja: 'Nocleg — pokoje w naszej bazie, 70 zł za dobę' },
      { pozycja: 'Wyżywienie (do dyspozycji wspólna kuchnia)' },
      { pozycja: 'Dojazd na miejsce' },
      { pozycja: 'Odzież własna' },
    ],
    warianty: [
      { nazwa: 'Jura, sześć dni pod rząd', cena: 2400, opis: 'wariant podstawowy' },
      { nazwa: 'Rudawy Janowickie, sześć dni', cena: 2600 },
      { nazwa: 'Jura, tryb weekendowy', cena: 2500, opis: 'dwa razy piątek–niedziela' },
      { nazwa: 'Dwie osoby na instruktora', cena: 2800, opis: 'Sokoliki lub Rudawy' },
    ],
    faq: [
      {
        pytanie: 'Czy muszę mieć własny sprzęt?',
        odpowiedz:
          'Nie. Cały sprzęt techniczny dajemy my. Przywieź wygodne ubranie i buty, w których ' +
          'wejdziesz pod skały — reszta czeka na miejscu.',
      },
      {
        pytanie: 'Czy dam radę bez przygotowania?',
        odpowiedz:
          'Tak. Kurs jest pisany dla osób, które nigdy nie dotknęły skały. Wystarczy sprawność ' +
          'pozwalająca przejść podejście z plecakiem. Jeśli wspinasz się już na ściance, ' +
          'pierwszego dnia przeskoczymy podstawy i pójdziemy dalej.',
      },
      {
        pytanie: 'Co przy złej pogodzie?',
        odpowiedz:
          'Mamy na miejscu salę wykładową ze ścianką, więc teoria idzie pod dachem, a zajęcia ' +
          'praktyczne przenosimy. Kurs zawsze kończy się w pełnym wymiarze — zdarzało się, że ' +
          'dokładaliśmy dwa dodatkowe dni w kolejnym miesiącu, bez dopłaty.',
      },
      {
        pytanie: 'Czy kurs muszę zrobić w jednym ciągu?',
        odpowiedz:
          'Nie. Jest wariant weekendowy: dwa razy piątek–niedziela w tym samym sezonie. ' +
          'Dla osób pracujących zmianowo dokładamy też grupę w tygodniu.',
      },
      {
        pytanie: 'Po co mi to zaświadczenie?',
        odpowiedz:
          'Pełny kurs skałkowy PZA jest wymagany, żeby dostać skierowanie na kurs taternicki. ' +
          'Poza tym honorują je ścianki i kluby tam, gdzie pytają o przeszkolenie.',
      },
    ],
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
    grupaMax: 4,
    miejsce: 'Rzędkowice',
    certyfikat: 'zaświadczenie PZA',
    tytulEn: 'Sport climbing (bolted routes)',
    order: 2,
    warianty: [
      { nazwa: 'Trzy dni', cena: 1500 },
      { nazwa: 'Cztery dni', cena: 1600, opis: 'więcej czasu na drogi własne' },
    ],
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
    grupaMax: 4,
    miejsce: 'Jura, rejon dobierany do grupy',
    certyfikat: 'zaświadczenie PZA',
    tytulEn: 'Traditional protection',
    order: 3,
    dlaKogo: akapity(
      'Kurs jest kontynuacją szkolenia na drogach ubezpieczonych i wymaga jego ukończenia ' +
        'albo równoważnego doświadczenia. Nie jest to szkolenie od zera.',
      'Po zaliczeniu wyszkolenie odpowiada poziomowi podstawowego kursu skałkowego, ' +
        'a zdanie egzaminu uprawnia do otrzymania karty wspinacza.',
    ),
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
    grupaMax: 6,
    certyfikat: 'zaświadczenie PZA',
    tytulEn: 'Introduction to indoor climbing',
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
    grupaMax: 4,
    miejsce: 'Austria, Chorwacja, Włochy lub Hiszpania',
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
    warianty: [
      { nazwa: 'Pełne szkolenie', cena: 2000, opis: 'trzy dni' },
      { nazwa: 'Sama technika zjazdów', cena: 1200, opis: 'dostęp linowy' },
    ],
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
    grupaMax: 1,
    tytulEn: 'Private guiding, one to one',
    order: 7,
  },
]

/**
 * Obozy, wyjazdy i zajęcia — z realnej oferty JURA LATO 2026.
 *
 * Oznaczenia R i Z pochodzą ze starej strony: R to turnusy rekreacyjno-
 * -przygodowe dla niezaawansowanych, Z — dla uczestników po kursach.
 */
const OBOZY = [
  {
    slug: 'oboz-przygodowy',
    title: 'Obóz wspinaczkowo-przygodowy',
    typ: 'oboz' as const,
    summary:
      'Osiem dni na Jurze dla tych, którzy dopiero zaczynają. Wspinanie na wędce, jaskinie, ' +
      'mosty linowe i gry terenowe. Nocleg w pokojach z łazienkami i pełne wyżywienie.',
    poziom: 'rekreacyjny' as const,
    wiekOd: 8,
    wiekDo: 16,
    cena: 2500,
    czas: '8 dni',
    grupaMax: 8,
    miejsce: 'Rzędkowice',
    nocleg: true,
    wyzywienie: true,
    ikona: 'gory' as const,
    order: 1,
    atrakcje: [
      { pozycja: 'Wspinaczka skałkowa pod okiem instruktorów' },
      { pozycja: 'Wejścia do jaskiń — bezpiecznych, bez pionowych progów' },
      { pozycja: 'Mosty linowe i wahadło, czyli skok odwagi' },
      { pozycja: 'Zjazdy na linie' },
      { pozycja: 'Marsze na orientację z mapą i gry terenowe' },
      { pozycja: 'Wycieczka po amonity do kamieniołomu' },
      { pozycja: 'Strzelanie z łuku i slackline' },
      { pozycja: 'Wieczorne ognisko' },
    ],
    planDnia: [
      {
        godzina: '08:00',
        tytul: 'Śniadanie i odprawa',
        opis: 'Plan dnia, przydział grup, przegląd sprzętu i prognozy.',
      },
      {
        godzina: '09:30',
        tytul: 'Wyjście w skały',
        opis: 'Rzędkowice, Podlesice albo Kroczyce — rejon dobierany do grupy i pogody.',
      },
      {
        godzina: '16:00',
        tytul: 'Powrót i obiad',
        opis: 'Czas wolny i regeneracja. Przy upałach wyjazd nad zalew.',
      },
      {
        godzina: '19:00',
        tytul: 'Teoria i ognisko',
        opis: 'Węzły, czytanie topo, historia wspinania na Jurze. Potem ognisko.',
      },
    ],
  },
  {
    slug: 'oboz-dla-zaawansowanych',
    title: 'Obóz dla zaawansowanych',
    typ: 'oboz' as const,
    summary:
      'Turnus dla uczestników po kursie wspinaczkowym. Więcej samodzielności, trudniejsze ' +
      'drogi i wyjazd w Sudety zamiast na Jurę.',
    poziom: 'zaawansowany' as const,
    wiekOd: 12,
    wiekDo: 18,
    cena: 2800,
    czas: '9 dni',
    grupaMax: 6,
    miejsce: 'Sudety',
    nocleg: true,
    wyzywienie: true,
    ikona: 'gory' as const,
    order: 2,
    atrakcje: [
      { pozycja: 'Drogi wielowyciągowe' },
      { pozycja: 'Samodzielne prowadzenie pod okiem instruktora' },
      { pozycja: 'Praca w linie i autoratownictwo' },
      { pozycja: 'Planowanie dnia w rejonie' },
    ],
  },
  {
    slug: 'wycieczki-i-zielone-szkoly',
    title: 'Wycieczki i zielone szkoły',
    typ: 'wyjazd' as const,
    summary:
      'Obsługa wycieczek szkolnych — od kilkugodzinnych zajęć w plenerze po komplet ' +
      'z transportem, noclegiem i wyżywieniem. Dla grup szkolnych, firm i rodzin.',
    cena: null,
    czas: 'od kilku godzin do kilku dni',
    grupaMax: 25,
    miejsce: 'Jura Krakowsko-Częstochowska',
    ikona: 'ludzie' as const,
    order: 3,
    atrakcje: [
      { pozycja: 'Wspinaczka skałkowa' },
      { pozycja: 'Mosty linowe i wahadło linowe' },
      { pozycja: 'Wejścia do jaskiń' },
      { pozycja: 'Marsze na orientację' },
      { pozycja: 'Strzelanie z łuku, slackline, gry terenowe' },
    ],
  },
  {
    slug: 'wyjscia-jaskiniowe',
    title: 'Wyjścia jaskiniowe',
    typ: 'wyjazd' as const,
    summary:
      'Jura ma pod ziemią drugie tyle co nad nią. Wchodzimy w jaskinie o stabilnej skale, ' +
      'bez luźnych kamieni w stropie — w kaskach, z oświetleniem i liną tam, gdzie trzeba.',
    cena: null,
    czas: 'pół dnia',
    grupaMax: 8,
    miejsce: 'Jaskinia Berkowa, Jaskinia Sucha w Mirowie',
    ikona: 'tarcza' as const,
    order: 4,
  },
  {
    slug: 'zajecia-dla-dzieci',
    title: 'Cotygodniowe zajęcia dla dzieci',
    typ: 'zajecia' as const,
    summary:
      'Treningi przez cały rok: zimą na ściance, od maja w skale. Nacisk na technikę ' +
      'i pewność ruchu, bez wyścigu o trudności i bez obciążeń, które szkodzą rosnącym stawom.',
    cena: null,
    czas: '1,5 h tygodniowo',
    wiekOd: 7,
    wiekDo: 15,
    grupaMax: 8,
    ikona: 'ludzie' as const,
    order: 5,
  },
]

/**
 * Turnusy i terminy.
 *
 * ⚠️ Układ turnusów i CENY pochodzą z prawdziwej oferty JURA LATO 2026 ze
 * starej strony (cztery turnusy: dwa lipcowe, jeden sierpniowy, jeden dla
 * zaawansowanych w Sudetach). Same DATY przesunęliśmy o sezon do przodu, bo
 * lato 2026 już minęło — terminy z przeszłości są odfiltrowywane, więc strona
 * wyglądałaby na pustą, czyli dokładnie odwrotnie, niż ma działać treść
 * startowa.
 *
 * Krzysiek musi potwierdzić faktyczne daty sezonu 2027. Terminy kursów są
 * wyłącznie poglądowe: stara strona podaje jedynie, że sezon trwa od kwietnia
 * do października, a zajęcia zaczynają się w sobotę albo poniedziałek.
 */
const TERMINY = [
  // Obozy — daty rzeczywiste.
  {
    oboz: 'oboz-przygodowy',
    dataOd: '2027-06-26',
    dataDo: '2027-07-03',
    cena: 2500,
    wolneMiejsca: 3,
    uwagi: 'turnus 1R',
  },
  {
    oboz: 'oboz-dla-zaawansowanych',
    dataOd: '2027-07-10',
    dataDo: '2027-07-18',
    cena: 2800,
    wolneMiejsca: 0,
    status: 'brak-miejsc' as const,
    uwagi: 'turnus 2Z',
  },
  {
    oboz: 'oboz-przygodowy',
    dataOd: '2027-07-23',
    dataDo: '2027-07-30',
    cena: 2500,
    wolneMiejsca: 6,
    uwagi: 'turnus 3R',
  },
  {
    oboz: 'oboz-przygodowy',
    dataOd: '2027-08-21',
    dataDo: '2027-08-28',
    cena: 2500,
    wolneMiejsca: 8,
    uwagi: 'turnus 4R',
  },
  // Kursy — daty poglądowe do podmiany w panelu.
  {
    kurs: 'kurs-wspinaczki-skalnej-pza',
    dataOd: '2027-05-01',
    dataDo: '2027-05-06',
    wolneMiejsca: 2,
  },
  {
    kurs: 'kurs-na-drogach-ubezpieczonych',
    dataOd: '2027-05-15',
    dataDo: '2027-05-17',
    wolneMiejsca: 4,
  },
  {
    kurs: 'kurs-wspinaczki-skalnej-pza',
    dataOd: '2027-05-29',
    dataDo: '2027-06-03',
    wolneMiejsca: 4,
  },
  {
    kurs: 'kurs-asekuracji-tradycyjnej',
    dataOd: '2027-06-05',
    dataDo: '2027-06-08',
    wolneMiejsca: 3,
  },
  {
    kurs: 'kurs-wspinaczki-skalnej-pza',
    dataOd: '2027-06-19',
    dataDo: '2027-06-24',
    wolneMiejsca: 0,
    status: 'brak-miejsc' as const,
  },
  {
    kurs: 'kurs-wspinaczki-skalnej-pza',
    dataOd: '2026-10-10',
    dataDo: '2026-10-15',
    wolneMiejsca: 4,
    uwagi: 'ostatni termin w sezonie',
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

// --- Obozy ---
const idObozu = new Map<string, number>()
for (const oboz of OBOZY) {
  const { docs } = await payload.find({
    collection: 'obozy',
    where: { slug: { equals: oboz.slug } },
    limit: 1,
  })
  const zapisany = docs[0]
    ? await payload.update({ collection: 'obozy', id: docs[0].id, data: oboz })
    : await payload.create({ collection: 'obozy', data: oboz })
  idObozu.set(oboz.slug, zapisany.id)
  payload.logger.info(`${docs[0] ? 'Zaktualizowano' : 'Dodano'} obóz: ${oboz.title}`)
}

// --- Terminy ---
const idKursu = new Map<string, number>()
for (const kurs of KURSY) {
  const { docs } = await payload.find({
    collection: 'kursy',
    where: { slug: { equals: kurs.slug } },
    limit: 1,
  })
  if (docs[0]) idKursu.set(kurs.slug, docs[0].id)
}

// Terminy nie mają sluga ani żadnego innego naturalnego klucza — jedyne, co je
// odróżnia, to para (data, powiązanie). Gdybyśmy dopasowywali po niej, zmiana
// daty w tym pliku NIE zaktualizowałaby wpisu, tylko dołożyła drugi obok
// starego. Zmierzone: po przesunięciu sezonu w bazie zrobiło się 20 terminów
// zamiast 10.
//
// Dlatego terminy kasujemy w całości i zakładamy od nowa. Jest to bezpieczne
// WYŁĄCZNIE dlatego, że skrypt nie działa na produkcji (blokada na górze
// pliku), a lokalnie nie ma tu danych, których szkoda.
const { docs: stareTerminy } = await payload.find({
  collection: 'terminy',
  limit: 500,
  depth: 0,
})
for (const stary of stareTerminy) {
  await payload.delete({ collection: 'terminy', id: stary.id })
}
if (stareTerminy.length > 0) {
  payload.logger.info(`Usunięto ${stareTerminy.length} wcześniejszych terminów.`)
}

for (const t of TERMINY) {
  const powiazanie = t.kurs ? { kurs: idKursu.get(t.kurs) } : { oboz: idObozu.get(t.oboz!) }
  const id = Object.values(powiazanie)[0]
  if (!id) {
    payload.logger.warn(`Pomijam termin ${t.dataOd} — brak powiązanego wpisu.`)
    continue
  }

  await payload.create({
    collection: 'terminy',
    data: {
      ...powiazanie,
      dataOd: new Date(t.dataOd).toISOString(),
      dataDo: t.dataDo ? new Date(t.dataDo).toISOString() : undefined,
      cena: t.cena,
      wolneMiejsca: t.wolneMiejsca,
      status: t.status ?? ('otwarty' as const),
      uwagi: t.uwagi,
    },
  })
}
payload.logger.info(`Zapisano ${TERMINY.length} terminów.`)

payload.logger.info(
  `Gotowe — ${KURSY.length} kursów, ${OBOZY.length} obozów i wyjazdów, ${TERMINY.length} terminów, 2 globale.`,
)
process.exit(0)
