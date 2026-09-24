/**
 * Starting content for the site.
 *
 * Where the data comes from: the LIVE abcwspinania.info site, not the mockup.
 * The mockup was indicative — it understated prices roughly twofold (rock
 * course at 1 690 zł against a real 2 400 zł), dropped half the offer
 * (multi-pitch course, rope access work) and claimed accommodation had to be
 * found by the participant, while the school has its own base with rooms, a
 * kitchen and a climbing wall. Prices and facts come from there; the copy is
 * written anew, because the originals carry leftovers of Joomla-era SEO.
 *
 * The script is IDEMPOTENT — it matches entries by `slug` and updates rather
 * than creating duplicates. It can be run repeatedly.
 *
 * ⚠️ DO NOT RUN IN PRODUCTION. This is starting data for the client to correct,
 * not final content; overwriting his edits with it would waste his work. The
 * guard is below and is deliberately hard.
 *
 * The seeded copy itself stays Polish — it is what visitors and the client
 * read.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'The seed script does not run in production — it would overwrite content entered by the client.',
  )
}

/**
 * Builds richText (Lexical) content from plain text.
 *
 * Lexical stores content as a tree of nodes with a full set of technical fields
 * (`format`, `indent`, `direction`, `version`), so writing even a single
 * sentence by hand is a dozen lines of noise. This helper lets the starting
 * data be written as ordinary text.
 *
 * A plain string yields a paragraph, `h2('…')` a section heading. The headings
 * matter beyond the visual: the article's table of contents is built from them.
 */
function h2(text: string) {
  return { __heading: text }
}

type Fragment = string | { __heading: string }

function textNode(text: string) {
  return {
    type: 'text',
    text: text,
    format: 0,
    style: '',
    mode: 'normal' as const,
    detail: 0,
    version: 1,
  }
}

function richText(...fragments: Fragment[]) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: fragments.map((f) =>
        typeof f === 'string'
          ? {
              type: 'paragraph',
              format: '' as const,
              indent: 0,
              version: 1,
              direction: 'ltr' as const,
              textFormat: 0,
              children: [textNode(f)],
            }
          : {
              type: 'heading',
              tag: 'h2' as const,
              format: '' as const,
              indent: 0,
              version: 1,
              direction: 'ltr' as const,
              children: [textNode(f.__heading)],
            },
      ),
    },
  }
}

const SITE_CONFIG = {
  phone: '609 465 237',
  phoneE164: '+48609465237',
  email: 'biuro@abcwspinania.info',
  openingHours: 'Najpewniej wieczorem, po zajęciach.',
  contactNote:
    'Bywa, że nie odbieramy — zwykle znaczy to, że trwają zajęcia w skałach. ' +
    'Oddzwaniamy tego samego dnia. W pilnej sprawie najszybciej działa SMS.',
  legalName: 'ABC Wspinania — Krzysztof Wróbel',
  street: 'Jurajska 47',
  postalCode: '42-421',
  city: 'Rzędkowice',
  directions:
    'Z Katowic i z Częstochowy około godziny samochodem, zjazd z DK78 na Kroczyce. ' +
    'Parking pod skałami bezpłatny.\n' +
    'Komunikacją: pociąg do Zawiercia, dalej autobus w stronę Kroczyc.',
  pzaLicence: '366/WS',
  stateQualifications: 'IS 182/K/2002',
  foundedYear: 2001,
  shortDescription:
    'Szkoła wspinaczki z licencją Polskiego Związku Alpinizmu i uprawnieniami państwowymi. ' +
    'Szkolę cały rok w kraju i za granicą. Jako jeden z nielicznych instruktorów w Polsce ' +
    'posiadam własną bazę szkoleniową w Rzędkowicach na Jurze. W latach 2025 i 2026 byłem ' +
    'najwyżej i najlepiej ocenianym przez kursantów instruktorem wspinaczki w Polsce ' +
    '(według serwisu kursy.wspinanie.pl).',
}

const HOME_PAGE = {
  heroBadge: 'Licencja PZA',
  heroSubtitle: 'Rzędkowice, Jura Krakowsko-Częstochowska',
  heroTitle: 'Twoja droga wspinaczkowa zaczyna się tutaj',
  heroText:
    'Kursy prowadzone według programu Polskiego Związku Alpinizmu, przez instruktora ' +
    'z licencją weryfikowaną co sezon. Czterech uczestników na instruktora, sześć dni, ' +
    'z czego pięć w skale. Baza stoi kwadrans od skał.',
  stats: [
    { value: 'Licencja PZA', caption: 'weryfikowana co sezon, nie nadana raz', featured: true },
    // The {lat} marker substitutes a figure computed from the founding year —
    // otherwise "25 lat" would have to be corrected by hand every January.
    { value: '{lat}', caption: 'szkolenia na Jurze' },
    { value: 'maks. 4 osoby', caption: 'na jednego instruktora' },
    { value: 'Własna baza', caption: 'nocleg i kuchnia kwadrans od skał' },
  ],
  coursesTitle: 'Kursy',
  coursesText:
    'Od pierwszego dotknięcia skały po samodzielne zakładanie asekuracji. ' +
    'Na każdym etapie umiejętności, które nabywasz, są weryfikowane. ' +
    'Na koniec otrzymujesz zaświadczenie o ukończeniu kursu.',
  campsBadge: 'Obozy',
  campsTitle: 'Tydzień w skałach — dla dzieci i młodzieży',
  campsText:
    'Turnusy ośmio- i dziewięciodniowe, nocleg w pokojach z łazienkami i pełne wyżywienie. ' +
    'Grupy dobierane wiekiem i doświadczeniem: osobno dla tych, którzy dopiero zaczynają, ' +
    'osobno dla kursantów po szkoleniu. Rodzice dostają galerię uzupełnianą na bieżąco.',
  reasons: [
    {
      icon: 'shield' as const,
      title: 'Licencja, nie deklaracja',
      description:
        'Tytuł „instruktor wspinaczki" nie jest w Polsce chroniony — nadać go sobie może ' +
        'każdy. Licencja PZA wymaga kwalifikacji, egzaminu, trzech staży i okresowej ' +
        'weryfikacji. Numer można sprawdzić na liście Związku przed zapisaniem się.',
    },
    {
      icon: 'people' as const,
      title: 'Cztery osoby, nie dwanaście',
      description:
        'Limit wynika z przepisów PZA i z tego, co da się realnie upilnować. Przy sześciu ' +
        'osobach grupę jeszcze się prowadzi, ale nie sposób zauważyć, że ktoś systematycznie ' +
        'wpina ekspres odwrotnie.',
    },
    {
      icon: 'house' as const,
      title: 'Własna baza kwadrans od skał',
      description:
        'Pokoje z łazienkami, wspólna kuchnia i sala wykładowa ze ścianką. Nie trzeba szukać ' +
        'kwatery ani dojeżdżać na zajęcia — przy załamaniu pogody teoria odbywa się na miejscu.',
    },
  ],
  ctaTitle: 'Nie wiesz, który kurs wybrać?',
  ctaText:
    'Napisz albo zadzwoń. Dobierzemy szkolenie do tego, co już umiesz i ile masz czasu — ' +
    'czasem odradzamy droższy kurs, bo tańszy wystarczy.',
}

/**
 * Courses from the real offer.
 *
 * `priceFrom` wherever the price list has variants (a different region, a
 * weekend mode, a smaller group) — showing one figure without "od" would be
 * misleading.
 */
const COURSES = [
  {
    slug: 'kurs-wspinaczki-skalnej-pza',
    title: 'Kurs wspinaczki skalnej PZA',
    titleEn: 'Rock climbing course (PZA syllabus)',
    summary:
      'Pełny kurs skałkowy według programu Związku. Sześć dni: od pierwszego węzła ' +
      'po samodzielne prowadzenie z asekuracją naturalną i zjazdy. Kurs, po którym już ' +
      'wiesz, jak to działa.',
    price: 2400,
    priceFrom: true,
    duration: '6 dni',
    level: 'beginner' as const,
    maxGroupSize: 4,
    location: 'Rzędkowice',
    certificate: 'zaświadczenie PZA',
    featured: true,
    order: 1,
    audience: richText(
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
        title: 'Sprzęt, węzły, asekuracja górna',
        description:
          'Uprząż, przyrządy, lina. Ósemka, kluczka, półwyblinka, wyblinka. Pierwsze wejścia ' +
          'na wędce i nauka asekurowania partnera.',
      },
      {
        title: 'Technika ruchu i praca nóg',
        description:
          'Chwyty i stopnie, pozycja frontalna i boczna, wspinaczka statyczna i dynamiczna. ' +
          'Cały dzień w łatwym terenie, żeby ruch wszedł w nawyk.',
      },
      {
        title: 'Zjazdy i wychodzenie po linie',
        description:
          'Zjazd w wysokim przyrządzie z autoasekuracją, stanowisko zjazdowe, przepinka, ' +
          'prusikowanie i wyjście z sytuacji awaryjnej.',
      },
      {
        title: 'Asekuracja dolna',
        description:
          'Wpinanie ekspresów, prowadzenie liny, rozmieszczanie przelotów, asekuracja ' +
          'prowadzącego i wychwytywanie odpadnięć.',
      },
      {
        title: 'Punkty własne i stanowiska',
        description:
          'Kostki, kostki mechaniczne, punkty naturalne. Łączenie punktów, budowa stanowisk ' +
          'dolnych, górnych i pośrednich.',
      },
      {
        title: 'Sprawdzian i zaświadczenie',
        description:
          'Część teoretyczna i praktyczna. Warunkiem zaliczenia jest samodzielne pokonanie ' +
          'z dolną asekuracją drogi o trudności co najmniej IV w skali UIAA.',
      },
    ],
    included: [
      { item: 'Instruktor z licencją PZA przez sześć dni' },
      { item: 'Komplet sprzętu: uprząż, kask, buty, liny, przyrządy' },
      { item: 'Materiały szkoleniowe i program kursu na piśmie' },
      { item: 'Zaświadczenie PZA po zaliczeniu sprawdzianu' },
    ],
    excluded: [
      { item: 'Nocleg — pokoje w naszej bazie, 70 zł za dobę' },
      { item: 'Wyżywienie (do dyspozycji wspólna kuchnia)' },
      { item: 'Dojazd na miejsce' },
      { item: 'Odzież własna' },
    ],
    variants: [
      { name: 'Jura, sześć dni pod rząd', price: 2400, note: 'wariant podstawowy' },
      { name: 'Rudawy Janowickie, sześć dni', price: 2600 },
      { name: 'Jura, tryb weekendowy', price: 2500, note: 'dwa razy piątek–niedziela' },
      { name: 'Dwie osoby na instruktora', price: 2800, note: 'Sokoliki lub Rudawy' },
    ],
    faq: [
      {
        question: 'Czy muszę mieć własny sprzęt?',
        answer:
          'Nie. Cały sprzęt techniczny dajemy my. Przywieź wygodne ubranie i buty, w których ' +
          'wejdziesz pod skały — reszta czeka na miejscu.',
      },
      {
        question: 'Czy dam radę bez przygotowania?',
        answer:
          'Tak. Kurs jest pisany dla osób, które nigdy nie dotknęły skały. Wystarczy sprawność ' +
          'pozwalająca przejść podejście z plecakiem. Jeśli wspinasz się już na ściance, ' +
          'pierwszego dnia przeskoczymy podstawy i pójdziemy dalej.',
      },
      {
        question: 'Co przy złej pogodzie?',
        answer:
          'Mamy na miejscu salę wykładową ze ścianką, więc teoria idzie pod dachem, a zajęcia ' +
          'praktyczne przenosimy. Kurs zawsze kończy się w pełnym wymiarze — zdarzało się, że ' +
          'dokładaliśmy dwa dodatkowe dni w kolejnym miesiącu, bez dopłaty.',
      },
      {
        question: 'Czy kurs muszę zrobić w jednym ciągu?',
        answer:
          'Nie. Jest wariant weekendowy: dwa razy piątek–niedziela w tym samym sezonie. ' +
          'Dla osób pracujących zmianowo dokładamy też grupę w tygodniu.',
      },
      {
        question: 'Po co mi to zaświadczenie?',
        answer:
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
    priceFrom: true,
    duration: '3 dni',
    level: 'beginner' as const,
    maxGroupSize: 4,
    location: 'Rzędkowice',
    certificate: 'zaświadczenie PZA',
    titleEn: 'Sport climbing (bolted routes)',
    order: 2,
    variants: [
      { name: 'Trzy dni', price: 1500 },
      { name: 'Cztery dni', price: 1600, note: 'więcej czasu na drogi własne' },
    ],
  },
  {
    slug: 'kurs-asekuracji-tradycyjnej',
    title: 'Kurs asekuracji naturalnej (TRAD)',
    summary:
      'Wspinałeś się tylko na drogach ubezpieczonych, ale chcesz się przygotować do kursu ' +
      'taternickiego? Ten kurs nauczy cię asekuracji zakładanej samodzielnie — kostki i camy ' +
      'nie będą już wiedzą tajemną!',
    price: 1800,
    duration: '4 dni',
    level: 'intermediate' as const,
    maxGroupSize: 4,
    location: 'Jura, rejon dobierany do grupy',
    certificate: 'zaświadczenie PZA',
    titleEn: 'Traditional protection',
    order: 3,
    audience: richText(
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
    priceFrom: true,
    duration: 'ok. 16 h, min. 2 dni',
    level: 'beginner' as const,
    maxGroupSize: 6,
    certificate: 'zaświadczenie PZA',
    titleEn: 'Introduction to indoor climbing',
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
    level: 'advanced' as const,
    maxGroupSize: 4,
    location: 'Austria, Chorwacja, Włochy lub Hiszpania',
    order: 5,
  },
  {
    slug: 'kurs-do-prac-wysokosciowych',
    title: 'Kurs do prac wysokościowych',
    summary:
      'Szkolenie zawodowe z dostępu linowego. Osobno krótszy wariant obejmujący samą technikę ' +
      'zjazdów.',
    price: 2000,
    priceFrom: true,
    duration: '3 dni',
    level: 'intermediate' as const,
    order: 6,
    variants: [
      { name: 'Pełne szkolenie', price: 2000, note: 'trzy dni' },
      { name: 'Sama technika zjazdów', price: 1200, note: 'dostęp linowy' },
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
    level: 'advanced' as const,
    maxGroupSize: 1,
    titleEn: 'Private guiding, one to one',
    order: 7,
  },
]

/**
 * Camps, trips and classes — from the real JURA LATO 2026 offer.
 *
 * The R and Z markings come from the old site: R are recreational/adventure
 * sessions for beginners, Z are for participants who have done a course.
 */
const CAMPS = [
  {
    slug: 'oboz-przygodowy',
    title: 'Obóz wspinaczkowo-przygodowy',
    kind: 'camp' as const,
    summary:
      'Osiem dni na Jurze dla tych, którzy dopiero zaczynają. Wspinanie na wędce, jaskinie, ' +
      'mosty linowe i gry terenowe. Nocleg w pokojach z łazienkami i pełne wyżywienie.',
    level: 'recreational' as const,
    ageFrom: 8,
    ageTo: 16,
    price: 2500,
    duration: '8 dni',
    maxGroupSize: 8,
    location: 'Rzędkowice',
    accommodation: true,
    meals: true,
    icon: 'mountains' as const,
    order: 1,
    highlights: [
      { item: 'Wspinaczka skałkowa pod okiem instruktorów' },
      { item: 'Wejścia do jaskiń — bezpiecznych, bez pionowych progów' },
      { item: 'Mosty linowe i wahadło, czyli skok odwagi' },
      { item: 'Zjazdy na linie' },
      { item: 'Marsze na orientację z mapą i gry terenowe' },
      { item: 'Wycieczka po amonity do kamieniołomu' },
      { item: 'Strzelanie z łuku i slackline' },
      { item: 'Wieczorne ognisko' },
    ],
    dailySchedule: [
      {
        time: '08:00',
        title: 'Śniadanie i odprawa',
        description: 'Plan dnia, przydział grup, przegląd sprzętu i prognozy.',
      },
      {
        time: '09:30',
        title: 'Wyjście w skały',
        description: 'Rzędkowice, Podlesice albo Kroczyce — rejon dobierany do grupy i pogody.',
      },
      {
        time: '16:00',
        title: 'Powrót i obiad',
        description: 'Czas wolny i regeneracja. Przy upałach wyjazd nad zalew.',
      },
      {
        time: '19:00',
        title: 'Teoria i ognisko',
        description: 'Węzły, czytanie topo, historia wspinania na Jurze. Potem ognisko.',
      },
    ],
  },
  {
    slug: 'oboz-dla-zaawansowanych',
    title: 'Obóz dla zaawansowanych',
    kind: 'camp' as const,
    summary:
      'Turnus dla uczestników po kursie wspinaczkowym. Więcej samodzielności, trudniejsze ' +
      'drogi i wyjazd w Sudety zamiast na Jurę.',
    level: 'advanced' as const,
    ageFrom: 12,
    ageTo: 18,
    price: 2800,
    duration: '9 dni',
    maxGroupSize: 6,
    location: 'Sudety',
    accommodation: true,
    meals: true,
    icon: 'mountains' as const,
    order: 2,
    highlights: [
      { item: 'Drogi wielowyciągowe' },
      { item: 'Samodzielne prowadzenie pod okiem instruktora' },
      { item: 'Praca w linie i autoratownictwo' },
      { item: 'Planowanie dnia w rejonie' },
    ],
  },
  {
    slug: 'wycieczki-i-zielone-szkoly',
    title: 'Wycieczki i zielone szkoły',
    kind: 'trip' as const,
    summary:
      'Obsługa wycieczek szkolnych — od kilkugodzinnych zajęć w plenerze po komplet ' +
      'z transportem, noclegiem i wyżywieniem. Dla grup szkolnych, firm i rodzin.',
    price: null,
    duration: 'od kilku godzin do kilku dni',
    maxGroupSize: 25,
    location: 'Jura Krakowsko-Częstochowska',
    icon: 'people' as const,
    order: 3,
    highlights: [
      { item: 'Wspinaczka skałkowa' },
      { item: 'Mosty linowe i wahadło linowe' },
      { item: 'Wejścia do jaskiń' },
      { item: 'Marsze na orientację' },
      { item: 'Strzelanie z łuku, slackline, gry terenowe' },
    ],
  },
  {
    slug: 'wyjscia-jaskiniowe',
    title: 'Wyjścia jaskiniowe',
    kind: 'trip' as const,
    summary:
      'Jura ma pod ziemią drugie tyle co nad nią. Wchodzimy w jaskinie o stabilnej skale, ' +
      'bez luźnych kamieni w stropie — w kaskach, z oświetleniem i liną tam, gdzie trzeba.',
    price: null,
    duration: 'pół dnia',
    maxGroupSize: 8,
    location: 'Jaskinia Berkowa, Jaskinia Sucha w Mirowie',
    icon: 'shield' as const,
    order: 4,
  },
  {
    slug: 'zajecia-dla-dzieci',
    title: 'Cotygodniowe zajęcia dla dzieci',
    kind: 'classes' as const,
    summary:
      'Treningi przez cały rok: zimą na ściance, od maja w skale. Nacisk na technikę ' +
      'i pewność ruchu, bez wyścigu o trudności i bez obciążeń, które szkodzą rosnącym stawom.',
    price: null,
    duration: '1,5 h tygodniowo',
    ageFrom: 7,
    ageTo: 15,
    maxGroupSize: 8,
    icon: 'people' as const,
    order: 5,
  },
]

/**
 * Sessions and dates.
 *
 * ⚠️ The arrangement of camp sessions and the PRICES come from the real JURA
 * LATO 2026 offer on the old site (four sessions: two in July, one in August,
 * one for advanced participants in the Sudetes). Only the DATES were moved a
 * season forward, because summer 2026 has passed — past sessions are filtered
 * out, so the site would look empty, which is exactly the opposite of what
 * starting content is for.
 *
 * The client has to confirm the actual 2027 season dates. The course dates are
 * purely indicative: the old site only states that the season runs from April
 * to October and that classes start on a Saturday or a Monday.
 */
const SESSIONS = [
  // Camps — real dates.
  {
    camp: 'oboz-przygodowy',
    startDate: '2027-06-26',
    endDate: '2027-07-03',
    price: 2500,
    spotsLeft: 3,
    note: 'turnus 1R',
  },
  {
    camp: 'oboz-dla-zaawansowanych',
    startDate: '2027-07-10',
    endDate: '2027-07-18',
    price: 2800,
    spotsLeft: 0,
    status: 'waitlist' as const,
    note: 'turnus 2Z',
  },
  {
    camp: 'oboz-przygodowy',
    startDate: '2027-07-23',
    endDate: '2027-07-30',
    price: 2500,
    spotsLeft: 6,
    note: 'turnus 3R',
  },
  {
    camp: 'oboz-przygodowy',
    startDate: '2027-08-21',
    endDate: '2027-08-28',
    price: 2500,
    spotsLeft: 8,
    note: 'turnus 4R',
  },
  // Courses — indicative dates, to be replaced in the panel.
  {
    course: 'kurs-wspinaczki-skalnej-pza',
    startDate: '2027-05-01',
    endDate: '2027-05-06',
    spotsLeft: 2,
  },
  {
    course: 'kurs-na-drogach-ubezpieczonych',
    startDate: '2027-05-15',
    endDate: '2027-05-17',
    spotsLeft: 4,
  },
  {
    course: 'kurs-wspinaczki-skalnej-pza',
    startDate: '2027-05-29',
    endDate: '2027-06-03',
    spotsLeft: 4,
  },
  {
    course: 'kurs-asekuracji-tradycyjnej',
    startDate: '2027-06-05',
    endDate: '2027-06-08',
    spotsLeft: 3,
  },
  {
    course: 'kurs-wspinaczki-skalnej-pza',
    startDate: '2027-06-19',
    endDate: '2027-06-24',
    spotsLeft: 0,
    status: 'waitlist' as const,
  },
  {
    course: 'kurs-wspinaczki-skalnej-pza',
    startDate: '2026-10-10',
    endDate: '2026-10-15',
    spotsLeft: 4,
    note: 'ostatni termin w sezonie',
  },
]

/**
 * Testimonials — REAL statements from the old abcwspinania.info site.
 *
 * Transcribed without changes to the wording; only obvious typos and missing
 * Polish diacritics were corrected (the old site had lost them). The
 * attributions are as they were: participants' first names, parents' initials.
 * Nobody appears under a full surname.
 *
 * ⚠️ To be confirmed with the client whether every author still consents to
 * publication — which is why `published` is set deliberately, entry by entry,
 * rather than wholesale.
 */
const ABOUT_PAGE = {
  title: 'Prawie pięćdziesiąt lat w skale',
  intro:
    'ABC Wspinania to szkoła z licencją Polskiego Związku Alpinizmu, działająca na Jurze ' +
    'Krakowsko-Częstochowskiej. Prowadzi ją Krzysztof Wróbel — instruktor PZA, sędzia ' +
    'wspinaczki sportowej i ekiper Związku.\n\n' +
    'Nie prowadzimy kursów masowych. Czterech uczestników na instruktora to nie hasło ' +
    'reklamowe, tylko limit z przepisów PZA i warunek tego, żeby każdy wspinał się ' +
    'codziennie i był widziany przez cały dzień.',
  licenceReasons: [
    {
      title: 'Uprawnienia są weryfikowane',
      description:
        'Instruktor PZA przechodzi kwalifikację, egzamin, trzy staże, a potem okresowe ' +
        'unifikacje. Tytuł „instruktor wspinaczki" sam w sobie nie jest w Polsce chroniony — ' +
        'licencja Związku tak, a jej numer można sprawdzić na liście PZA.',
    },
    {
      title: 'Program jest określony',
      description:
        'Kurs skałkowy ma ustalony minimalny wymiar: sześć dni, z czego co najmniej pięć ' +
        'w terenie, oraz spisany zakres tematów. Nie da się go skrócić do weekendu i nazwać ' +
        'tak samo.',
    },
    {
      title: 'Zaświadczenie coś znaczy',
      description:
        'Pełny kurs skałkowy PZA jest wymagany, żeby otrzymać skierowanie na kurs taternicki. ' +
        'Poza tym honorują go ścianki i kluby tam, gdzie pytają o przeszkolenie.',
    },
  ],
  aboutJura:
    'Jura Krakowsko-Częstochowska to najstarszy rejon wspinaczkowy w Polsce — pierwsze drogi ' +
    'poprowadzono tu jeszcze przed wojną. Baza szkoły stoi w Rzędkowicach od 2002 roku, ' +
    'kwadrans marszu od skał. Wapień się jednak zużywa: chwyty, które dwadzieścia lat temu ' +
    'były ostre, są dziś wypolerowane, a kilka klasycznych dróg jest realnie trudniejszych, ' +
    'niż mówi ich wycena.',
  juraFacts: [
    { value: '1933', caption: 'pierwsze udokumentowane drogi na Jurze' },
    { value: '~3 500', caption: 'dróg w rejonach, w których szkolimy' },
    { value: '15 min', caption: 'marszu pod skały z naszej bazy' },
    { value: 'III–IX', caption: 'zakres trudności dostępny na miejscu' },
  ],
}

/** The "Obozy i wyjazdy" page — the intro under its heading. */
const CAMPS_PAGE = {
  intro:
    'Obozy wspinaczkowo-przygodowe dla dzieci i młodzieży, zielone szkoły i wycieczki ' +
    'na Jurze. Mamy wpis do rejestru organizatorów turystyki. Wspinanie, amonity, jaskinie, ' +
    'mosty linowe i skoki odwagi. Wycieczka z nami to niekończąca się przygoda.',
}

/** The English page — copy transcribed from the old site's "In English" section. */
const ENGLISH_PAGE = {
  badge:
    'Rock climbing courses · Syllabus certified by the Polish Mountaineering ' +
    'Association (PZA), a member of the UIAA',
  title: 'Learn to climb on Polish Jura limestone',
  lead:
    "We'll teach you how to climb safely — but above all, we'll show you how much fun " +
    'it can be. Courses in English, four climbers per instructor, certificate on completion.',
  about:
    'ABC Wspinania is a climbing school based in Rzędkowice, in the Kraków-Częstochowa ' +
    'Upland — the oldest climbing region in Poland, with roughly 3,500 routes within ' +
    'a fifteen-minute walk of our base.\n\n' +
    'We have been teaching for twenty-five years and climbing for nearly fifty. Our ' +
    'instructors hold a licence from the Polish Mountaineering Association (PZA), which ' +
    'is verified every season. This matters more than it may sound: in Poland the title ' +
    '"climbing instructor" is not protected by law, so anyone may use it. The licence is ' +
    'the part that is actually checked, and you can verify its number against the ' +
    "association's public list.\n\n" +
    'We do not run mass courses. A maximum of four participants per instructor is not ' +
    'a marketing line — it is the regulatory limit, and the condition for everyone ' +
    'climbing every day rather than queuing below a route.',
  accommodation:
    'The school has its own base ten to fifteen minutes from the crags: rooms with ' +
    'private bathrooms, a shared kitchen and a lecture room with a climbing wall. ' +
    'Accommodation costs 70 PLN per night and is not included in the course price. ' +
    'Sleeping bags are not needed.',
  season:
    'The main season runs from May to September; courses usually start on a Saturday or ' +
    'a Monday. In March, April and October dates are arranged individually. There is also ' +
    'a weekend format for people who cannot take six days off in a row.',
  directions:
    'Rzędkowice is about an hour by car from Kraków and from Katowice, both served by ' +
    'international airports. By train, take a service to Zawiercie and continue by bus ' +
    'towards Kroczyce.\n\n' +
    'Write or call in English. We confirm the date by email before asking for any deposit.',
  coursesNote:
    'Prices cover the training itself: an instructor, all technical equipment (harness, ' +
    'helmet, shoes, ropes and hardware) and a certificate. Accommodation, meals and travel ' +
    'are not included.',
}

const TESTIMONIALS = [
  {
    author: 'Kasia',
    subject: 'rock-course' as const,
    period: 'maj 2017',
    published: true,
    onHomepage: true,
    order: 1,
    quote:
      'Cała nasza grupa była zachwycona zajęciami, zarówno częścią praktyczną w terenie ' +
      '(bakcyl wspinania złapany bezpowrotnie), jak i wykładami. Daleko im było do nudnego ' +
      'wyobrażenia o wykładach — moglibyśmy słuchać godzinami opowieści, które nam ' +
      'przytaczałeś. Rozmawialiśmy jeszcze długo po powrocie z zajęć i analizowaliśmy nowo ' +
      'poznane informacje. Ogromna wiedza i doświadczenie robią wrażenie, ale dodatkowo ' +
      'masz niezwykłą umiejętność jasnego tłumaczenia i wyczerpującego odpowiadania na ' +
      'każde pytanie. Takich nauczycieli spotyka się niezwykle rzadko.',
  },
  {
    author: 'Maciek i Lidka',
    subject: 'rock-course' as const,
    period: 'wiosna 2014',
    published: true,
    order: 2,
    quote:
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
    author: 'Ania',
    subject: 'rock-course' as const,
    period: 'październik 2011',
    published: true,
    onHomepage: true,
    order: 3,
    quote:
      'Pierwszy raz widzę skałę, pierwszy raz jej dotykam, nie mówiąc o wchodzeniu na to ' +
      'coś — emocje nie do opisania. Sto procent pozytywnej energii, dwieście procent ' +
      'cierpliwości i spokoju. Takich słów wcześniej nie znałam, wieczorem wszystko ' +
      'analizowałam, głowa mi pękała od tej wiedzy — ale jakoś zaczynało się to kleić ' +
      'w spójną całość. Mijały kolejne dni, a panika rosła: nie ogarnę. Ale od pierwszego ' +
      'siniaka wiedziałam, że to jest to. Z perspektywy czasu naprawdę się dziwię, że mnie ' +
      'nie odesłałeś do domu.',
  },
  {
    author: 'Piotr',
    subject: 'rock-course' as const,
    period: '2012',
    published: true,
    order: 4,
    quote:
      'Część praktyczna kursu u Krzyśka była bardzo dobrym zakończeniem kursu ' +
      'wspinaczkowego w klubie wysokogórskim, ale też okazją do nauczenia się czegoś ' +
      'zupełnie nowego — zarówno z techniki, jak i z taktyki wspinania. Cała nasza ' +
      'czteroosobowa grupa była pod dużym wrażeniem kompetencji i zaangażowania. ' +
      'Praktyczna znajomość rejonów i pragmatyczne podejście do szkolenia zrobiły na mnie ' +
      'bardzo pozytywne wrażenie. Teraz niemal co roku mój starszy syn bierze udział ' +
      'w obozach przygodowo-wspinaczkowych.',
  },
  {
    author: 'Mama Jarka',
    subject: 'camp' as const,
    published: true,
    order: 5,
    quote:
      'Już po obozie mogę powiedzieć, że to był pierwszy wyjazd Jarka bez mamy i z całkiem ' +
      'nowymi dla niego ludźmi. Dziękuję jeszcze raz za to, że tak dobrze wszystko poszło.',
  },
  {
    author: 'Rodzice uczestniczki',
    subject: 'camp' as const,
    published: true,
    order: 6,
    quote:
      'Nie dzwoniliśmy w niedzielę, bo byliśmy pewni, że ma Pan urwanie głowy. Chcemy bardzo ' +
      'podziękować za ten obóz. Sądząc po zdjęciach i relacjach dzieci, wspinanie było ' +
      'naprawdę poważne, a jednocześnie bezpieczne. Na dodatek dzieci zaliczyły dużo ' +
      'samodzielności i mocno się odkomercjalizowały — czego one może tak bardzo nie ' +
      'doceniają, ale my owszem.',
  },
  {
    author: 'B.',
    subject: 'camp' as const,
    published: true,
    order: 7,
    quote:
      'Dziękujemy za bardzo udany obóz. Małgosia już zgłasza chęć wzięcia udziału ' +
      'w przyszłorocznym, wspominała też o turnusie ze starszymi dziećmi, o którym Pan ' +
      'jej mówił. Mam nadzieję, że w przyszłym roku uda się zgrać terminy.',
  },
]

/** Staff. Details taken from the author byline under texts on the old site. */
const INSTRUCTORS = [
  {
    name: 'Krzysztof Wróbel',
    role: 'Szef szkoły, instruktor PZA',
    license: 'PZA 366/WS, uprawnienia państwowe IS 182/K/2002',
    order: 1,
    bio:
      'Wspina się od blisko pięćdziesięciu lat, z Klubem Wysokogórskim Gliwice związany od ' +
      '1982 roku. Instruktor Polskiego Związku Alpinizmu, licencjonowany sędzia wspinaczki ' +
      'sportowej i ekiper PZA, autor nowych dróg i przewodnika wspinaczkowego. Organizator ' +
      'pięciu edycji zawodów Pucharu Polski we wspinaczce sportowej, kilkunastu edycji ' +
      'zawodów dla dzieci oraz kilkudziesięciu obozów w kraju i za granicą.',
  },
]

/**
 * Posts — texts rewritten from the old site.
 *
 * The substance stays, the editing is new: the old versions carried leftovers
 * of Joomla-era SEO (the phrases "kurs wspinaczkowy" and "szkoła wspinania"
 * repeated over and over) and a good number of typos.
 */
const POSTS = [
  {
    slug: '25-lat-abc-wspinania',
    title: '25 lat ABC Wspinania',
    category: 'school-life' as const,
    publishedAt: '2026-09-12',
    featured: true,
    lead:
      'Rok 2026 to dwudziesty piąty sezon działania szkoły. O tym, co się przez ten czas ' +
      'zmieniło w sprzęcie, w rejonie i w ludziach, którzy przyjeżdżają się uczyć — i co ' +
      'zostało dokładnie takie samo.',
    content: richText(
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
    category: 'guides' as const,
    publishedAt: '2026-08-14',
    lead:
      'Polskie prawo nie zabrania szkolić osobom bez żadnych uprawnień. Strona internetowa ' +
      'z nazwą „szkoła wspinania" nie znaczy więc nic. Oto trzy pytania, które warto zadać.',
    content: richText(
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
    category: 'guides' as const,
    publishedAt: '2026-07-22',
    lead:
      'Nie ma ograniczeń formalnych ani zdrowotnych, żeby czterolatek nie mógł się wspinać. ' +
      'Jest za to kilka rzeczy, które warto wiedzieć — zwłaszcza gdy dziecko się boi.',
    content: richText(
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
    category: 'reports' as const,
    publishedAt: '2026-06-18',
    lead:
      'Kilkadziesiąt metrów kreciej norki robi na wszystkich wielkie wrażenie. Relacja ' +
      'z wyjścia jaskiniowego poza programem kursu.',
    content: richText(
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
 * ⚠️ The body of the script runs at the MODULE TOP LEVEL, not inside `main()`.
 *
 * Measured: `payload run` ends the process once module evaluation finishes.
 * Calling `main()` without `await` (even with `.catch()`) returns control
 * immediately, so the runner kills the process in the middle of `getPayload()`
 * — with NO error and exit code 0. The symptom: the script "passes" and the
 * database is empty. Top-level await suspends evaluation and fixes it.
 */
const payload = await getPayload({ config })

await payload.updateGlobal({ slug: 'site-config', data: SITE_CONFIG })
payload.logger.info('Site config saved.')

await payload.updateGlobal({ slug: 'home-page', data: HOME_PAGE })
payload.logger.info('Homepage content saved.')

for (const course of COURSES) {
  const { docs } = await payload.find({
    collection: 'courses',
    where: { slug: { equals: course.slug } },
    // An explicit limit here too — rule 3 has no exception for scripts, and the
    // default of 10 when looking up a unique slug is only confusing.
    limit: 1,
  })

  if (docs[0]) {
    await payload.update({ collection: 'courses', id: docs[0].id, data: course })
    payload.logger.info(`Updated course: ${course.title}`)
  } else {
    await payload.create({ collection: 'courses', data: course })
    payload.logger.info(`Added course: ${course.title}`)
  }
}

// --- Camps ---
const campIds = new Map<string, number>()
for (const camp of CAMPS) {
  const { docs } = await payload.find({
    collection: 'camps',
    where: { slug: { equals: camp.slug } },
    limit: 1,
  })
  const saved = docs[0]
    ? await payload.update({ collection: 'camps', id: docs[0].id, data: camp })
    : await payload.create({ collection: 'camps', data: camp })
  campIds.set(camp.slug, saved.id)
  payload.logger.info(`${docs[0] ? 'Updated' : 'Added'} camp: ${camp.title}`)
}

// --- Sessions ---
const courseIds = new Map<string, number>()
for (const course of COURSES) {
  const { docs } = await payload.find({
    collection: 'courses',
    where: { slug: { equals: course.slug } },
    limit: 1,
  })
  if (docs[0]) courseIds.set(course.slug, docs[0].id)
}

// Sessions have no slug or any other natural key — the only thing telling them
// apart is the (date, relation) pair. Matching on that would mean a change of
// date in this file does NOT update the entry but adds a second one next to the
// old. Measured: after moving the season forward the database held 20 sessions
// instead of 10.
//
// So sessions are deleted wholesale and recreated. That is safe ONLY because
// the script does not run in production (the guard at the top of this file) and
// locally there is no data here worth keeping.
const { docs: oldSessions } = await payload.find({
  collection: 'sessions',
  limit: 500,
  depth: 0,
})
for (const old of oldSessions) {
  await payload.delete({ collection: 'sessions', id: old.id })
}
if (oldSessions.length > 0) {
  payload.logger.info(`Removed ${oldSessions.length} earlier sessions.`)
}

for (const session of SESSIONS) {
  const relation = session.course
    ? { course: courseIds.get(session.course) }
    : { camp: campIds.get(session.camp!) }
  const id = Object.values(relation)[0]
  if (!id) {
    payload.logger.warn(`Skipping session ${session.startDate} — no related entry.`)
    continue
  }

  await payload.create({
    collection: 'sessions',
    data: {
      ...relation,
      startDate: new Date(session.startDate).toISOString(),
      endDate: session.endDate ? new Date(session.endDate).toISOString() : undefined,
      price: session.price,
      spotsLeft: session.spotsLeft,
      status: session.status ?? ('open' as const),
      note: session.note,
    },
  })
}
payload.logger.info(`Saved ${SESSIONS.length} sessions.`)

await payload.updateGlobal({ slug: 'about-page', data: ABOUT_PAGE })
payload.logger.info('About page content saved.')

await payload.updateGlobal({ slug: 'camps-page', data: CAMPS_PAGE })
payload.logger.info('"Obozy i wyjazdy" page saved.')

await payload.updateGlobal({ slug: 'english-page', data: ENGLISH_PAGE })
payload.logger.info('English page content saved.')

// --- Instructors ---
for (const i of INSTRUCTORS) {
  const { docs } = await payload.find({
    collection: 'instructors',
    where: { name: { equals: i.name } },
    limit: 1,
  })
  if (docs[0]) await payload.update({ collection: 'instructors', id: docs[0].id, data: i })
  else await payload.create({ collection: 'instructors', data: i })
}
payload.logger.info(`Saved ${INSTRUCTORS.length} instructors.`)

// --- Testimonials ---
// Matched on the attribution together with the order: the attribution alone is
// not enough, because "Rodzice uczestniczki" could have written more than once.
for (const o of TESTIMONIALS) {
  const { docs } = await payload.find({
    collection: 'testimonials',
    where: {
      and: [{ author: { equals: o.author } }, { order: { equals: o.order } }],
    },
    limit: 1,
  })
  if (docs[0]) await payload.update({ collection: 'testimonials', id: docs[0].id, data: o })
  else await payload.create({ collection: 'testimonials', data: o })
}
payload.logger.info(`Saved ${TESTIMONIALS.length} testimonials.`)

// --- Posts ---
for (const w of POSTS) {
  const data = { ...w, publishedAt: new Date(w.publishedAt).toISOString() }
  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: w.slug } },
    limit: 1,
  })
  if (docs[0]) await payload.update({ collection: 'posts', id: docs[0].id, data: data })
  else await payload.create({ collection: 'posts', data: data })
}
payload.logger.info(`Saved ${POSTS.length} posts.`)

payload.logger.info(
  `Done — ${COURSES.length} courses, ${CAMPS.length} camps, ${SESSIONS.length} sessions, ` +
    `${POSTS.length} posts, ${TESTIMONIALS.length} testimonials, 4 globals.`,
)
process.exit(0)
