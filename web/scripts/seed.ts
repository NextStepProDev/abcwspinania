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
 * Buduje treść dla pola richText (Lexical) z gołego tekstu.
 *
 * Lexical trzyma treść jako drzewo węzłów z kompletem pól technicznych
 * (`format`, `indent`, `direction`, `version`), więc wpisanie choćby jednego
 * zdania „na piechotę" to kilkanaście linii szumu. Ten helper pozwala
 * w danych startowych pisać zwykły tekst.
 *
 * Zwykły ciąg daje akapit, `h2('…')` — nagłówek sekcji. Nagłówki są istotne
 * nie tylko wizualnie: z nich powstaje spis treści artykułu.
 */
function h2(tekst: string) {
  return { __naglowek: tekst }
}

type Fragment = string | { __naglowek: string }

function wezelTekstowy(tekst: string) {
  return {
    type: 'text',
    text: tekst,
    format: 0,
    style: '',
    mode: 'normal' as const,
    detail: 0,
    version: 1,
  }
}

function akapity(...fragmenty: Fragment[]) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: fragmenty.map((f) =>
        typeof f === 'string'
          ? {
              type: 'paragraph',
              format: '' as const,
              indent: 0,
              version: 1,
              direction: 'ltr' as const,
              textFormat: 0,
              children: [wezelTekstowy(f)],
            }
          : {
              type: 'heading',
              tag: 'h2' as const,
              format: '' as const,
              indent: 0,
              version: 1,
              direction: 'ltr' as const,
              children: [wezelTekstowy(f.__naglowek)],
            },
      ),
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
 * Opinie — PRAWDZIWE wypowiedzi ze starej strony abcwspinania.info.
 *
 * Przepisane bez zmian w treści; poprawione wyłącznie oczywiste literówki
 * i brakujące polskie znaki (stara strona miała je pogubione). Podpisy takie,
 * jak były: imiona kursantów, inicjały rodziców. Nikt nie występuje pod pełnym
 * nazwiskiem.
 *
 * ⚠️ Do potwierdzenia z Krzyśkiem, czy wszyscy autorzy nadal godzą się na
 * publikację — dlatego `opublikowana` ustawiamy świadomie, wpis po wpisie,
 * a nie hurtem.
 */
const STRONA_O_NAS = {
  tytul: 'Prawie pięćdziesiąt lat w skale',
  wstep:
    'ABC Wspinania to szkoła z licencją Polskiego Związku Alpinizmu, działająca na Jurze ' +
    'Krakowsko-Częstochowskiej. Prowadzi ją Krzysztof Wróbel — instruktor PZA, sędzia ' +
    'wspinaczki sportowej i ekiper Związku.\n\n' +
    'Nie prowadzimy kursów masowych. Czterech uczestników na instruktora to nie hasło ' +
    'reklamowe, tylko limit z przepisów PZA i warunek tego, żeby każdy wspinał się ' +
    'codziennie i był widziany przez cały dzień.',
  powodyLicencji: [
    {
      tytul: 'Uprawnienia są weryfikowane',
      opis:
        'Instruktor PZA przechodzi kwalifikację, egzamin, trzy staże, a potem okresowe ' +
        'unifikacje. Tytuł „instruktor wspinaczki" sam w sobie nie jest w Polsce chroniony — ' +
        'licencja Związku tak, a jej numer można sprawdzić na liście PZA.',
    },
    {
      tytul: 'Program jest określony',
      opis:
        'Kurs skałkowy ma ustalony minimalny wymiar: sześć dni, z czego co najmniej pięć ' +
        'w terenie, oraz spisany zakres tematów. Nie da się go skrócić do weekendu i nazwać ' +
        'tak samo.',
    },
    {
      tytul: 'Zaświadczenie coś znaczy',
      opis:
        'Pełny kurs skałkowy PZA jest wymagany, żeby otrzymać skierowanie na kurs taternicki. ' +
        'Poza tym honorują go ścianki i kluby tam, gdzie pytają o przeszkolenie.',
    },
  ],
  oJurze:
    'Jura Krakowsko-Częstochowska to najstarszy rejon wspinaczkowy w Polsce — pierwsze drogi ' +
    'poprowadzono tu jeszcze przed wojną. Baza szkoły stoi w Rzędkowicach od 2002 roku, ' +
    'kwadrans marszu od skał. Wapień się jednak zużywa: chwyty, które dwadzieścia lat temu ' +
    'były ostre, są dziś wypolerowane, a kilka klasycznych dróg jest realnie trudniejszych, ' +
    'niż mówi ich wycena.',
  liczbyJura: [
    { wartosc: '1933', opis: 'pierwsze udokumentowane drogi na Jurze' },
    { wartosc: '~3 500', opis: 'dróg w rejonach, w których szkolimy' },
    { wartosc: '15 min', opis: 'marszu pod skały z naszej bazy' },
    { wartosc: 'III–IX', opis: 'zakres trudności dostępny na miejscu' },
  ],
}

const OPINIE = [
  {
    autor: 'Kasia',
    czego: 'kurs-skalkowy' as const,
    termin: 'maj 2017',
    opublikowana: true,
    naStronieGlownej: true,
    order: 1,
    tresc:
      'Cała nasza grupa była zachwycona zajęciami, zarówno częścią praktyczną w terenie ' +
      '(bakcyl wspinania złapany bezpowrotnie), jak i wykładami. Daleko im było do nudnego ' +
      'wyobrażenia o wykładach — moglibyśmy słuchać godzinami opowieści, które nam ' +
      'przytaczałeś. Rozmawialiśmy jeszcze długo po powrocie z zajęć i analizowaliśmy nowo ' +
      'poznane informacje. Ogromna wiedza i doświadczenie robią wrażenie, ale dodatkowo ' +
      'masz niezwykłą umiejętność jasnego tłumaczenia i wyczerpującego odpowiadania na ' +
      'każde pytanie. Takich nauczycieli spotyka się niezwykle rzadko.',
  },
  {
    autor: 'Maciek i Lidka',
    czego: 'kurs-skalkowy' as const,
    termin: 'wiosna 2014',
    opublikowana: true,
    order: 2,
    tresc:
      'Dla mnie wspinanie to kontynuacja pasji, a dla Lidii była to zupełna nowość. ' +
      'Postanowiliśmy zacząć wszystko od początku, od kursu skałkowego ze skierowaniem na ' +
      'kurs taternicki. Pogoda nie rozpieszczała, ale właśnie taka pozwala lepiej się skupić ' +
      'na tym, co zostaje wykładane i wywspinane. Teoria przemieszana z praktyką, kolejne ' +
      'drogi, cała masa wiedzy wiązana w węzłach, zakładanych kościach, przewlekanych ' +
      'repikach. Dziesiątki zjazdów, przepinek, budowy i likwidacji stanowisk. Zero presji, ' +
      'zero strachu, że coś może pójść nie tak. To, że dziś możemy się pochwalić poważnymi ' +
      'dla nas drogami w wapieniach czy tatrzańskich granitach, zawdzięczamy tej szkole.',
  },
  {
    autor: 'Ania',
    czego: 'kurs-skalkowy' as const,
    termin: 'październik 2011',
    opublikowana: true,
    naStronieGlownej: true,
    order: 3,
    tresc:
      'Pierwszy raz widzę skałę, pierwszy raz jej dotykam, nie mówiąc o wchodzeniu na to ' +
      'coś — emocje nie do opisania. Sto procent pozytywnej energii, dwieście procent ' +
      'cierpliwości i spokoju. Takich słów wcześniej nie znałam, wieczorem wszystko ' +
      'analizowałam, głowa mi pękała od tej wiedzy — ale jakoś zaczynało się to kleić ' +
      'w spójną całość. Mijały kolejne dni, a panika rosła: nie ogarnę. Ale od pierwszego ' +
      'siniaka wiedziałam, że to jest to. Z perspektywy czasu naprawdę się dziwię, że mnie ' +
      'nie odesłałeś do domu.',
  },
  {
    autor: 'Piotr',
    czego: 'kurs-skalkowy' as const,
    termin: '2012',
    opublikowana: true,
    order: 4,
    tresc:
      'Część praktyczna kursu u Krzyśka była bardzo dobrym zakończeniem kursu ' +
      'wspinaczkowego w klubie wysokogórskim, ale też okazją do nauczenia się czegoś ' +
      'zupełnie nowego — zarówno z techniki, jak i z taktyki wspinania. Cała nasza ' +
      'czteroosobowa grupa była pod dużym wrażeniem kompetencji i zaangażowania. ' +
      'Praktyczna znajomość rejonów i pragmatyczne podejście do szkolenia zrobiły na mnie ' +
      'bardzo pozytywne wrażenie. Teraz niemal co roku mój starszy syn bierze udział ' +
      'w obozach przygodowo-wspinaczkowych.',
  },
  {
    autor: 'Mama Jarka',
    czego: 'oboz' as const,
    opublikowana: true,
    order: 5,
    tresc:
      'Już po obozie mogę powiedzieć, że to był pierwszy wyjazd Jarka bez mamy i z całkiem ' +
      'nowymi dla niego ludźmi. Dziękuję jeszcze raz za to, że tak dobrze wszystko poszło.',
  },
  {
    autor: 'Rodzice uczestniczki',
    czego: 'oboz' as const,
    opublikowana: true,
    order: 6,
    tresc:
      'Nie dzwoniliśmy w niedzielę, bo byliśmy pewni, że ma Pan urwanie głowy. Chcemy bardzo ' +
      'podziękować za ten obóz. Sądząc po zdjęciach i relacjach dzieci, wspinanie było ' +
      'naprawdę poważne, a jednocześnie bezpieczne. Na dodatek dzieci zaliczyły dużo ' +
      'samodzielności i mocno się odkomercjalizowały — czego one może tak bardzo nie ' +
      'doceniają, ale my owszem.',
  },
  {
    autor: 'B.',
    czego: 'oboz' as const,
    opublikowana: true,
    order: 7,
    tresc:
      'Dziękujemy za bardzo udany obóz. Małgosia już zgłasza chęć wzięcia udziału ' +
      'w przyszłorocznym, wspominała też o turnusie ze starszymi dziećmi, o którym Pan ' +
      'jej mówił. Mam nadzieję, że w przyszłym roku uda się zgrać terminy.',
  },
]

/** Kadra. Dane z podpisu Krzysztofa Wróbla pod tekstami na starej stronie. */
const INSTRUKTORZY = [
  {
    imie: 'Krzysztof Wróbel',
    rola: 'Szef szkoły, instruktor PZA',
    licencja: 'PZA 366/WS, uprawnienia państwowe IS 182/K/2002',
    order: 1,
    opis:
      'Wspina się od blisko pięćdziesięciu lat, z Klubem Wysokogórskim Gliwice związany od ' +
      '1982 roku. Instruktor Polskiego Związku Alpinizmu, licencjonowany sędzia wspinaczki ' +
      'sportowej i ekiper PZA, autor nowych dróg i przewodnika wspinaczkowego. Organizator ' +
      'pięciu edycji zawodów Pucharu Polski we wspinaczce sportowej, kilkunastu edycji ' +
      'zawodów dla dzieci oraz kilkudziesięciu obozów w kraju i za granicą.',
  },
]

/**
 * Wpisy — przepisane teksty ze starej strony.
 *
 * Treść merytoryczna zostaje, redakcja jest nowa: stare wersje niosły
 * pozostałości po pozycjonowaniu z czasów Joomli (powtarzane frazy
 * „kurs wspinaczkowy", „szkoła wspinania") i sporo literówek.
 */
const WPISY = [
  {
    slug: '25-lat-abc-wspinania',
    title: '25 lat ABC Wspinania',
    kategoria: 'z-zycia-szkoly' as const,
    publishedAt: '2026-09-12',
    wyrozniony: true,
    lead:
      'Rok 2026 to dwudziesty piąty sezon działania szkoły. O tym, co się przez ten czas ' +
      'zmieniło w sprzęcie, w rejonie i w ludziach, którzy przyjeżdżają się uczyć — i co ' +
      'zostało dokładnie takie samo.',
    tresc: akapity(
      'Czas leci szybko i trudno powiedzieć, kiedy to się stało, ale wygląda na to, że mamy ' +
        'okrągłą rocznicę. Rok 2026 to dwudziesty piąty sezon działania ABC Wspinania.',
      h2('Priorytety, które się nie zmieniły'),
      'Przez te wszystkie lata miałem przyjemność wyszkolić wielu znakomitych wspinaczy, ale ' +
        'bardziej niż to cieszy mnie fakt, że udało się większości z Was zaszczepić wirusa ' +
        'wspinania — takiego, bez którego już nie potraficie żyć.',
      'Priorytety przez cały ten czas były dwa: bezpieczeństwo i rzetelne szkolenie. Oceny za ' +
        'jakość, merytorykę i atmosferę wystawiacie Wy, nie ja, i to Wasze opinie oraz Wasze ' +
        'własne wspinanie są najbardziej wiarygodną rekomendacją dla szkoły.',
      h2('Co się zmieniło w sprzęcie'),
      'Najwięcej zmieniły przyrządy asekuracyjne. Klasyczny kubek ustąpił miejsca przyrządom ' +
        'ze wspomaganiem hamowania, a to przesunęło punkt ciężkości szkolenia: mniej czasu ' +
        'idzie na wyrabianie odruchu trzymania liny, więcej na czytanie sytuacji i pracę nóg. ' +
        'Nie jest to zmiana wyłącznie na plus — osoba wyszkolona wyłącznie na przyrządzie ' +
        'wspomaganym gorzej radzi sobie, gdy trafi na zwykłą płytkę.',
      'Liny schudły o jakieś dwa milimetry przy tej samej wytrzymałości, uprzęże są lżejsze ' +
        'i lepiej regulowane, a kaski z pianki wyparły skorupowe — co widać po tym, ile osób ' +
        'faktycznie je nosi.',
      h2('Rejon pod presją'),
      'Rzędkowice w majowy weekend to dwadzieścia pięć lat temu było kilkanaście osób pod całą ' +
        'grupą skał. Dziś bywa kilkaset. To zmienia sposób prowadzenia kursu: wychodzimy ' +
        'wcześniej, mamy zapasowe warianty na wypadek zajętych dróg i uczymy rzeczy, o których ' +
        'dawniej nie było potrzeby mówić — jak zachować się w kolejce pod drogą i dlaczego nie ' +
        'zostawia się ekspresów na noc.',
      'Wapień też się zużywa. Chwyty, które kiedyś były ostre, są dziś wypolerowane na lustro, ' +
        'a kilka klasycznych dróg jest realnie trudniejszych, niż mówi ich wycena.',
      h2('Ludzie, którzy przyjeżdżają'),
      'Największa zmiana nie dotyczy ani sprzętu, ani skał, tylko tego, kto przyjeżdża się ' +
        'uczyć. Dwadzieścia pięć lat temu na kurs skałkowy trafiał ktoś, kto wspinał się już ' +
        'w klubie i chciał uporządkować wiedzę. Dziś zdecydowana większość przychodzi ze ' +
        'ścianki: z dobrą siłą i zerowym doświadczeniem terenowym. To zupełnie inny punkt ' +
        'startowy i trudniejszy, bo trzeba odkręcić nawyki, które w hali były bezpieczne, ' +
        'a w skale nie są.',
      'Stąd wziął się limit czterech osób na instruktora. Przy sześciu jeszcze da się prowadzić ' +
        'grupę, ale nie da się zauważyć, że ktoś systematycznie wpina ekspres odwrotnie.',
      h2('Co dalej'),
      'Na najbliższy sezon dokładamy grupę w tygodniu — dla osób pracujących zmianowo, które ' +
        'nie mogą wziąć sześciu dni z rzędu w weekendy. Poza tym nic nie zmieniamy i jest to ' +
        'decyzja świadoma.',
      'Dziękuję wszystkim, którzy przez te lata przyjechali, a zwłaszcza tym, którzy wrócili po ' +
        'latach z własnymi dziećmi. To najlepsze potwierdzenie, że coś tu robimy dobrze.',
    ),
  },
  {
    slug: 'dlaczego-instruktor-pza',
    title: 'Jak sprawdzić instruktora, zanim zapiszesz się na kurs',
    kategoria: 'poradniki' as const,
    publishedAt: '2026-08-14',
    lead:
      'Polskie prawo nie zabrania szkolić osobom bez żadnych uprawnień. Strona internetowa ' +
      'z nazwą „szkoła wspinania" nie znaczy więc nic. Oto trzy pytania, które warto zadać.',
    tresc: akapity(
      h2('Trzy kategorie instruktorów'),
      'Instruktorów wspinaczki dzieli się w Polsce na trzy kategorie: instruktorzy Polskiego ' +
        'Związku Alpinizmu, instruktorzy sportu i instruktorzy rekreacji ruchowej. Z tego grona ' +
        'tylko pierwsi podlegają kontroli — mają obowiązek udziału w okresowych unifikacjach ' +
        'i regularnego potwierdzania uprawnień.',
      'Uzyskanie licencji PZA jest procesem długim. Weryfikacja idzie na kilku poziomach: ' +
        'najpierw opinia macierzystego klubu, gdzie kandydata znają najlepiej, potem ' +
        'kwalifikacja na kurs, zaliczenie wszystkich jego etapów i trzy staże szkoleniowe. ' +
        'Uprawnienia instruktora sportu czy rekreacji ruchowej nie są w ten sposób regulowane ' +
        'przez nic poza decyzją organizatora kursu.',
      h2('Dlaczego to w ogóle problem'),
      'Zdarzały się sytuacje, w których szkołę wspinania otwierała osoba rok czy dwa po ' +
        'własnym kursie podstawowym. Prawo tego nie zabrania, bo tej kwestii po prostu nie ' +
        'normuje. Zapytany wprost, czy uczciwie jest pisać o sobie „doświadczenie, wiedza ' +
        'i praktyka", ktoś taki odpowiedział mi kiedyś: „bo jak tak nie napiszę, to nikt do ' +
        'mnie nie przyjdzie". To prawda — i dokładnie na tym polega problem.',
      'Wspinanie opiera się na zaufaniu: do sprzętu i do partnera. Skoro ktoś mówi, że mnie ' +
        'asekuruje, to mu wierzę. Zakładam więc też, że to, co napisał o sobie na stronie, ' +
        'jest prawdą.',
      h2('Trzy pytania, które warto zadać'),
      'Zanim więc zdecydujesz, gdzie i u kogo robisz kurs, zadaj trzy pytania. Kto konkretnie ' +
        'będzie Cię szkolił — imię i nazwisko, bo niektóre szkoły firmuje ktoś, a szkoli kto ' +
        'inny. Jakie ma uprawnienia: typ, numer, data. I jakie ma doświadczenie wspinaczkowe ' +
        'oraz szkoleniowe. Licencję PZA sprawdzisz na liście Związku, a członkostwo w klubie ' +
        'wysokogórskim jednym telefonem.',
      'Wspinanie to naprawdę fajna sprawa, ale zabierajcie się za nie z głową. Wspinanie ' +
        'błędów nie wybacza.',
    ),
  },
  {
    slug: 'wspinanie-i-dzieci',
    title: 'Od kiedy dziecko może się wspinać',
    kategoria: 'poradniki' as const,
    publishedAt: '2026-07-22',
    lead:
      'Nie ma ograniczeń formalnych ani zdrowotnych, żeby czterolatek nie mógł się wspinać. ' +
      'Jest za to kilka rzeczy, które warto wiedzieć — zwłaszcza gdy dziecko się boi.',
    tresc: akapity(
      'Wspinanie jest aktywnością bardzo wszechstronną: angażuje wszystkie partie mięśni, ' +
        'wymaga kontroli równowagi i — co ważne — świadomego wysiłku umysłowego przy ' +
        'planowaniu kolejnych ruchów w zmiennym terenie. Różnorodność układów ciała ' +
        'i pozycji zauważyli fizjoterapeuci: elementy wspinaczki wykorzystuje się dziś ' +
        'w rehabilitacji powypadkowej.',
      'Kilkuletnie dzieci nie będą oczywiście asekurować samodzielnie — w tym zakresie ' +
        'konieczna jest obecność instruktora albo przeszkolonych rodziców. Jedyne realne ' +
        'ograniczenie w najmłodszym wieku dotyczy skoordynowanego treningu siłowego, ze ' +
        'względu na rozwijający się szkielet. Dla małego dziecka byłby zresztą po prostu nudny.',
      h2('Co zrobić, gdy dziecko się boi'),
      'Strach nie jest niczym złym. Prawdziwy lęk wysokości to rzadkość; obawa związana ' +
        'z wysokością jest naturalnym, zdrowym odruchem. Gdy dziecko daje sygnały, że się boi, ' +
        'nie zmuszajmy go do wchodzenia wysoko. W grupie akceptacja wysokości przychodzi ' +
        'łatwiej — widząc kolegów na ściance, większość dzieciaków rusza bez oporów.',
      'Przy większej blokadzie oswajamy stopniowo. Nie wyżej niż metr nad ziemią, tak by ' +
        'dziecko czuło obecność rodzica obok. Pomagają zabawy poprawiające koordynację: ' +
        'poziomo ułożona drabina oparta na dwóch krzesłach, po której dzieciak przechodzi ' +
        'trzymany za rękę. Potem drabina lekko pochylona, potem coraz bardziej pionowa, ' +
        'najpierw dwa–trzy stopnie w górę i z powrotem. Na ściance tak samo: jeden, dwa ruchy ' +
        'i schodzimy, wielokrotnie, w różnych miejscach.',
      h2('W czym wspinać'),
      'Co do butów — specjalistyczne wspinaczkowe nie mają na tym etapie sensu, bo stopa ' +
        'szybko rośnie. Wystarczą tanie sportowe, ale raczej nie klasyczne „adidasy": bywają ' +
        'szerokie i mają śliskie podeszwy. Szukajmy czegoś z w miarę wąskim czubkiem, na ' +
        'gumie, dość sztywnego i dość ciasnego, żeby stopa była stabilna w środku.',
      h2('Starsze dzieci i trening'),
      'Dzieci od ósmego roku życia mogą już uczestniczyć w regularnych zajęciach sekcji ' +
        'wspinaczkowych, również sportowych. Trzeba jednak powiedzieć wyraźnie: część technik ' +
        'treningowych jest przy pracy z dziećmi niewskazana, a niektóre wręcz zakazane — ' +
        'dotyczy to zwłaszcza treningu siłowego z dużymi obciążeniami, który w dłuższej ' +
        'perspektywie degraduje stawy i ścięgna.',
    ),
  },
  {
    slug: 'jaskinia-berkowa',
    title: 'Byliśmy w Jaskini Berkowej',
    kategoria: 'relacje' as const,
    publishedAt: '2026-06-18',
    lead:
      'Kilkadziesiąt metrów kreciej norki robi na wszystkich wielkie wrażenie. Relacja ' +
      'z wyjścia jaskiniowego poza programem kursu.',
    tresc: akapity(
      'Byliśmy z dzieciakami w Jaskini Berkowej, nazywanej dawniej w kręgach turystycznych ' +
        '„kalesonową" — ze względu na zaciskowy charakter osoby tęższe wychodziły z niej ' +
        'czasem bez spodni, nie zauważając tego faktu. Dziś jaskinia jest znacznie poszerzona, ' +
        'z wyjątkiem dwóch zacisków.',
      'Należy do nielicznego grona jaskiń bardzo bezpiecznych: skała jest monolityczna, ' +
        'w stropie nie ma luźnych kamieni, które mogłyby się na kogoś osunąć. Nie jest to ' +
        'jednak jaskinia spacerowa. W całym ciągu jest w zasadzie jedna komnata, w której ' +
        'dorosły może się normalnie wyprostować — tam też grupa może się spotkać razem. ' +
        'Dalsza droga wiedzie wężykowatym korytarzem: jedna osoba czołga się za drugą, bez ' +
        'możliwości wyminięcia.',
      'Przy rozwinięciu poziomym nie ma tam gdzie wpaść, można za to przy nerwowych ruchach ' +
        'głową nabić sobie guza. Podobny charakter, choć bardziej skomplikowany układ, ma ' +
        'Jaskinia Sucha w Mirowie. Nie zawsze jest sucha, co widać potem po stanie odzieży, ' +
        'ale podobnie jak Berkowa stoi w stabilnej skale i nie ma charakteru zawaliskowego.',
    ),
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

await payload.updateGlobal({ slug: 'strona-o-nas', data: STRONA_O_NAS })
payload.logger.info('Treść strony „O nas" zapisana.')

// --- Instruktorzy ---
for (const i of INSTRUKTORZY) {
  const { docs } = await payload.find({
    collection: 'instruktorzy',
    where: { imie: { equals: i.imie } },
    limit: 1,
  })
  if (docs[0]) await payload.update({ collection: 'instruktorzy', id: docs[0].id, data: i })
  else await payload.create({ collection: 'instruktorzy', data: i })
}
payload.logger.info(`Zapisano ${INSTRUKTORZY.length} instruktorów.`)

// --- Opinie ---
// Rozpoznajemy po podpisie wraz z terminem: sam podpis nie wystarcza, bo
// „Rodzice uczestniczki" mogliby napisać więcej niż raz.
for (const o of OPINIE) {
  const { docs } = await payload.find({
    collection: 'opinie',
    where: {
      and: [{ autor: { equals: o.autor } }, { order: { equals: o.order } }],
    },
    limit: 1,
  })
  if (docs[0]) await payload.update({ collection: 'opinie', id: docs[0].id, data: o })
  else await payload.create({ collection: 'opinie', data: o })
}
payload.logger.info(`Zapisano ${OPINIE.length} opinii.`)

// --- Wpisy ---
for (const w of WPISY) {
  const dane = { ...w, publishedAt: new Date(w.publishedAt).toISOString() }
  const { docs } = await payload.find({
    collection: 'wpisy',
    where: { slug: { equals: w.slug } },
    limit: 1,
  })
  if (docs[0]) await payload.update({ collection: 'wpisy', id: docs[0].id, data: dane })
  else await payload.create({ collection: 'wpisy', data: dane })
}
payload.logger.info(`Zapisano ${WPISY.length} wpisów.`)

payload.logger.info(
  `Gotowe — ${KURSY.length} kursów, ${OBOZY.length} obozów, ${TERMINY.length} terminów, ` +
    `${WPISY.length} wpisów, ${OPINIE.length} opinii, 3 globale.`,
)
process.exit(0)
