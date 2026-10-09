# abcwspinania — zasady projektu

Strona i system dla szkoły wspinaczkowej **ABC Wspinania** (Jura
Krakowsko-Częstochowska).

Ten plik niesie **decyzje i ich powody**, w tym wnioski z błędów popełnionych
wcześniej w `anovastudio`. Każda reguła poniżej kosztowała kogoś czas — zanim
którąkolwiek zmienisz, sprawdź, czy przyczyna przestała działać.

Plik **jest wersjonowany** (w anovastudio odpowiednik siedzi w `.gitignore`).
Nie ma w nim sekretów, a jest wszystko, czego potrzebuje ktoś wchodzący do
projektu. Prywatne notatki idą do `pytania.md` — ignorowanego i nigdy niescalanego
z plikiem publicznym.

**Co jest obiecane klientowi, siedzi w `ZAKRES.md`** — osobno, bo to inny rodzaj
wiedzy. Tutaj są decyzje techniczne i ich powody; tam zobowiązania z terminami,
definicją „zrobione" dla każdej pozycji i listą rzeczy świadomie wyłączonych
z zakresu. Zmienia się zakres — najpierw tamten plik.

---

## Stack

| Warstwa | Technologia |
|---|---|
| Aplikacja | Next.js 16.3.5 — App Router, TypeScript, Tailwind 4, Turbopack |
| CMS | **Payload 3.90.1**, działający WEWNĄTRZ aplikacji Next |
| Baza | PostgreSQL 18 |
| Wdrożenie | Docker Compose + nginx, obraz z GHCR, Oracle Cloud **Ampere A1** |

**Jedna aplikacja, jeden proces, jeden kontener.** Strona, panel (`/admin`)
i API (`/api`) to ten sam serwer Next. Nie ma osobnego kontenera CMS-a ani
subdomeny `api.*`.

### Kolekcje i globale

| Kolekcja | Slug | Publiczny odczyt | Po co |
|---|---|---|---|
| `Courses` | `courses` | tak | oferta kursów, z podstroną każdego |
| `Camps` | `camps` | tak | obozy, wyjazdy i zajęcia cykliczne |
| `Sessions` | `sessions` | tak | terminy kursów i obozów |
| `Posts` | `posts` | tak | aktualności |
| `Testimonials` | `testimonials` | tak | opinie kursantów |
| `Instructors` | `instructors` | tak | kadra |
| `Media` | `media` | tak | okładki, portrety, zdjęcia w treści; `alt` nieobowiązkowy |
| `GalleryPhotos` | `gallery-photos` | tak | zdjęcia na `/galeria` — osobna zakładka, nie znacznik w Mediach |
| `Messages` | `messages` | **nie** | zgłoszenia z formularza — dane osobowe |
| `Newsletter` | `newsletter` | **nie** | zapisy na newsletter — dane osobowe |
| `Users` | `users` | **nie** | konta do panelu |

| Global | Slug | Po co |
|---|---|---|
| `SiteConfig` | `site-config` | kontakt, adres, licencja, profile |
| `HomePage` | `home-page` | teksty strony startowej |
| `AboutPage` | `about-page` | teksty podstrony „O nas" |
| `CampsPage` | `camps-page` | wstęp podstrony „Obozy i wyjazdy" |
| `EnglishPage` | `english-page` | jedyna podstrona po angielsku |

`Messages` i `Newsletter` przyjmują zapis od **każdego** (to formularze
publiczne), ale odczyt, zmiana i kasowanie wymagają zalogowania. Publiczny
odczyt byłby wyciekiem danych osobowych, nie udogodnieniem.

⚠️ **Slug globala nie może kończyć się na „s".** Payload wyprowadza nazwę
generowanego typu ze sluga i obcina końcowe „s": `site-settings` dałoby typ
`SiteSetting`, a `strona-o-nas` dawało `StronaONa` i wymagało aliasu
w `content.ts`. Stąd `site-config`, a nie `site-settings`. Przy kolekcjach ta
sama zasada działa NA NASZĄ KORZYŚĆ: `courses` → `Course`, `sessions` →
`Session`, więc typy wychodzą w liczbie pojedynczej i aliasy są zbędne.

Katalog nazywa się `web/`, a nie `frontend/` — po przejściu na Payload zawiera
także backend, więc stara nazwa wprowadzałaby w błąd.

### ⚠️ Język: kod po angielsku, treść po polsku

Ustalone 23.09.2026, po tym jak szkielet urósł do stanu, w którym `getCourses()`
stało obok `getUstawienia()` w jednym pliku. Granica jest jedna i nie ma od niej
wyjątków:

| Po **angielsku** | Po **polsku** |
|---|---|
| nazwy plików, komponentów, funkcji, zmiennych, typów | tekst widoczny na stronie |
| **komentarze i nazwy testów** | `label`, `labels`, `admin.description` w kolekcjach (czyta je klient w panelu) |
| slugi kolekcji i globali (= nazwy tabel w Postgresie) | komunikaty walidacji pokazywane odwiedzającemu |
| nazwy pól (= kolumny w bazie) i wartości `select` | klauzule RODO w `src/lib/consent.ts` |
| nazwy pól formularzy HTTP, parametry zapytań | **adresy podstron** (`/kursy`, `/obozy`, `/terminarz`) |
| komunikaty commitów, logi dla programisty | tekst w `scripts/seed.ts` (to treść, nie kod) |

**Adresy zostają polskie celowo.** To element strony widziany przez
użytkownika i indeksowany przez wyszukiwarkę, a nie szczegół implementacji —
polski serwis ma polskie adresy. Zmiana ich na angielskie zerwałaby też sens
osobnej podstrony `/en`.

**Parametry zapytań są angielskie** (`?level=beginner`, `?show=available`),
bo to warstwa techniczna, a ich wartości pochodzą wprost z enumów w bazie.
Mieszanie ich z polskim dawało `?kategoria=school-life`.

Komentarz po polsku w nowym pliku to nie drobiazg do poprawienia później —
to początek powrotu do stanu sprzed tej zmiany.

### Dlaczego Payload, a nie Strapi

Projekt startował na Strapim i został przepięty 19.09.2026, zanim cokolwiek
trafiło na produkcję. Powody, zmierzone:

- Ten system to w ~80% **aplikacja** (rezerwacje, konta, wykresy), a nie
  strona z treścią. Strapi jest optymalizowany pod tę drugą rolę.
- Strapi trzymał nas na **React 18** i jednym zgłoszeniu `high` (`nodemailer`),
  niedomykalnym bez jego majora. Payload chodzi na naszym React 19.
- Audyt produkcyjny: Strapi **18 zgłoszeń, 1 high** → Payload **7 zgłoszeń,
  0 high**.
- Zależności bezpośrednie: 60 → 32.
- Typy kolekcji są **generowane**, a nie przepisywane ręcznie po obu stronach.
- Krzysiek dostaje **jeden panel** zamiast dwóch.

Koszt, który świadomie przyjęliśmy: `@payloadcms/next` deklaruje wąski zakres
wersji Next (`>=16.3.3 <17.0.0`), więc **majora Next nie podbijemy, dopóki
Payload nie nadgoni**. To lustrzane odbicie problemu, który mieliśmy ze Strapim
i Reactem — tylko z drugiej strony.

---

## ⚠️ Architektura ARM — rzecz, o którą najłatwiej się potknąć

Produkcja stoi na **Oracle Ampere A1, czyli aarch64**. Obraz musi być budowany
pod `linux/arm64`.

Job `docker` w `.github/workflows/ci.yml` leci na `runs-on: ubuntu-24.04-arm`
i buduje `platforms: linux/arm64`. Job lintujący zostaje na `ubuntu-latest` —
tam architektura nie ma znaczenia.

Obraz zbudowany domyślnie (amd64) wstaje na Ampere z `exec format error`
i **widać to dopiero na serwerze, po deployu**. Gdyby runnery ARM okazały się
niedostępne: wróć na `ubuntu-latest`, dodaj `docker/setup-qemu-action@v3`
i zostaw `platforms: linux/arm64` — zadziała, tylko dużo wolniej.

**Konsekwencja, o którą łatwo się potknąć drugi raz:** narzędzia, które pobierają
obraz z rejestru, domyślnie proszą o `linux/amd64`. Skan Trivy w CI padał na
`no child with platform linux/amd64 in index`, mimo `exit-code: 0` — bo to awaria
narzędzia, a nie znalezisko. Stąd `TRIVY_PLATFORM: linux/arm64` w `ci.yml`.
Dokładając cokolwiek, co ciągnie ten obraz, sprawdź, czy nie zakłada amd64.

Weryfikacja lokalna (na Macu z Apple Silicon natywna i szybka):

```bash
docker buildx build --platform linux/arm64 -t abcwspinania:local --load web
```

---

## ⚠️ PostgreSQL 18 — punkt montowania się zmienił

Wolumen montujemy pod **`/var/lib/postgresql`**, a NIE pod
`/var/lib/postgresql/data`.

Obrazy `postgres:18+` trzymają dane w podkatalogu z numerem wersji głównej
(`/var/lib/postgresql/18/docker`), żeby dało się użyć `pg_upgrade --link` bez
przechodzenia przez granicę montowania. Przy starym punkcie kontener **nie
wstaje** — zgłasza `there appears to be PostgreSQL data in:
/var/lib/postgresql/data (unused mount/volume)` i kończy jako `unhealthy`.

Sprawdzone 19.09.2026 na `postgres:18-alpine` (18.6). Tło:
<https://github.com/docker-library/postgres/pull/1259>.

Uboczna zmiana w 18: **sumy kontrolne danych są domyślnie włączone**
(`data_checksums=on`); w 17 były wyłączone.

### Podbicie wersji głównej to migracja danych, nie podmiana obrazu

Postgres odmawia startu na katalogu założonym przez inną wersję główną
(`database files are incompatible with server`). Procedura:

1. Zrzut **starą** wersją: `pg_dumpall` z działającego kontenera.
2. Nowa deklaracja wolumenu pod nową nazwą (np. `..._pgdata_prod_v19`).
3. Start nowej wersji na pustym wolumenie i wczytanie zrzutu.
4. **Starą deklarację wolumenu zostaw w pliku compose.** Usunięta znika też
   z widoku `docker compose down -v`, a wtedy jedyna kopia danych ginie z nią.

Major Postgresa jest zablokowany w `.github/dependabot.yml` — w **obu** wpisach
`docker-compose` (`/` i `/deploy`).

---

## Migracje schematu — osobny, ręczny workflow

**Zmiana modelu treści nie jedzie z deployem.** Kolejność:

1. Zmieniasz kolekcję w `web/src/collections/`.
2. `npm run generate:types` — typy są **commitowane**, CI pilnuje ich zgodności.
3. `npm run migrate:create <nazwa>` — migracja trafia do repo.
4. Merge do `main` → CI buduje obraz.
5. Workflow **Migrate** (ręczny, z potwierdzeniem słowem `migruj`).
6. Workflow **Deploy**.

**Dlaczego przez tunel SSH, a nie `docker compose run` na serwerze:** obraz
produkcyjny to `output: standalone` i waży ~80 MB, bo Turbopack wbudowuje
zależności w chunki serwera — nie ma w nim ani CLI Payloada, ani jego modułów.
Drugi obraz z pełnym `node_modules` ważyłby ~1 GB **przy każdej wersji**,
a zapchany dysk to dokładnie to, co kiedyś położyło deploy w anovastudio.
Migracje odpala więc runner, który i tak ma komplet zależności, przez tunel do
bazy wystawionej **wyłącznie na pętli zwrotnej serwera** (`127.0.0.1:5432`).

`push: true` działa tylko lokalnie (`NODE_ENV !== 'production'`). Na produkcji
schemat zmieniają wyłącznie migracje — żeby start kontenera nie mógł przepisać
tabeli z danymi klienta.

---

### ⚠️ Tryb `push` blokuje migracje — i wiesza je bez terminala

Uruchomienie `npm run dev` wpisuje do tabeli `payload_migrations` wiersz `dev`.
Od tej chwili `payload migrate` **zadaje pytanie interaktywne**:

```
? It looks like you've run Payload in dev mode, meaning you've dynamically
  pushed changes to your database. If you'd like to run migrations,
  data loss will occur. Would you like to proceed? › (y/N)
```

Zmierzone 19.09.2026: bez terminala to pytanie **wisi w nieskończoność**,
i to nawet przy zamkniętym wejściu (`< /dev/null`). W workflow oznaczałoby job
stojący do limitu czasu i padający z komunikatem, z którego nic nie wynika.

**Lokalnie:** trybu `push` i jawnych migracji nie da się mieszać. Chcesz
zastosować migracje na bazie, która była pchana w dev — zresetuj ją:
`docker compose down -v && docker compose up -d && npm run migrate`.
W developmencie nie ma danych, których szkoda.

**Na produkcji** `push` jest wyłączony (`NODE_ENV === 'production'`), więc wpis
`dev` nie powinien tam powstać nigdy. Workflow „Migrate" i tak sprawdza to przed
uruchomieniem i **zatrzymuje się**, jeśli ten wpis znajdzie — bo jego obecność
znaczy, że ktoś puścił aplikację w trybie deweloperskim przeciw bazie klienta,
a Payload zapytałby wtedy o zgodę na utratę danych. Drugą linią obrony jest
`timeout 300` na samym poleceniu.

## Wersje bibliotek — czego NIE wolno podbić i dlaczego

- **TypeScript stoi na 6.x — to najnowsza wersja, która tu działa, nie zaległość.**
  Zmierzone 19.09.2026: **TS 6.0.3** przechodzi `tsc`, `lint`, `test` i `build`
  kompletem. **TS 7.0.2** przechodzi `tsc --noEmit` czysto, ale `lint` pada twardo:
  `typescript-eslint does not support TS 7.0.` Blokuje nas narzędzie pośredniczące,
  nie sam TypeScript ani Next (wsparcie śledzone dla TS ≥ 7.1,
  typescript-eslint#10940). Blokada w Dependabocie dotyczy **wyłącznie majora 7**;
  wydania 6.x wchodzą normalnie.
- **ESLint zostaje na 9.x.** `eslint-config-next` deklaruje peer `eslint >=9`,
  więc npm wpuszcza 10 bez ostrzeżenia, ale `eslint-plugin-react` woła
  `context.getFilename()` — API usunięte w 10.
- **Wszystkie pakiety Payloada muszą iść w jednej wersji.** `@payloadcms/next`
  deklaruje peer `payload` **co do numeru**, więc rozjazd wywala `npm ci`.
  Dlatego są przypięte dokładnie (`3.90.1`, bez `^`) i podbijane jednym PR-em
  przez grupę `payload` w Dependabocie. Nigdy osobno.
- **Next zostaje na 16, `graphql` na 16.** Oba majory blokuje Payload:
  `@payloadcms/next` ma peer `next <17.0.0`, a `payload` peer `graphql ^16.8.1`.
  Major którejkolwiek wywala `npm ci`, więc w Dependabocie są zablokowane
  i odblokowuje się je razem z podbiciem Payloada.
- **Node 26** (`node:26-alpine`). **Ta sama liczba musi stać w `node-version:`
  w `ci.yml`.** Dependabot podbijałby ją wyłącznie w Dockerfile (ekosystem
  `docker` czyta tylko Dockerfile'e) — w anovastudio po bumpie 24 → 26 CI został
  na 24 i przez jakiś czas testował kod na innym silniku niż produkcja. Dlatego
  major Node jest w Dependabocie **zablokowany**: łatki przychodzą same (tag
  pływający), a nieparzyste majory nigdy nie dostają LTS. **Przejście na 28 to
  ręczna zmiana obu miejsc naraz.**
- **Łatki bezpieczeństwa idą poza harmonogramem** — to nie zasługa
  `dependabot.yml` (ten działa raz w miesiącu), tylko ustawień repozytorium:
  *Dependabot alerts* i *Dependabot security updates*. Włączone 28.09.2026;
  do tego dnia były wyłączone i podatność czekała do następnego miesiąca.
  Dwie granice: obejmują pakiety npm i akcje GitHub, **nie obrazy Dockera**
  (te łata tag pływający i przebudowa obrazu), a **reguły `ignore` działają
  także na nie** — łatka dostępna tylko w zablokowanym majorze nie przyjdzie
  jako PR, zostanie sam alert w zakładce Security.
- **Dwa alerty zamknięte jako „nie dotyczy" (29.09.2026) — sprawdzić przy
  każdym podbiciu Payloada.** Oba średniej wagi, oba w zależnościach, które
  Payload przypina sam, więc Dependabot nie mógł ich załatać i każda jego
  próba kończyła się czerwonym zadaniem.
  - **`undici` 7.29.0** (poprawka w 7.29.1) — `payload` przypina go **co do
    numeru**. Dziura dotyczy klienta WebSocket (`permessage-deflate`),
    a Payload używa `undici` wyłącznie w `uploads/safeFetch` — `Agent` i `fetch`
    przy wgrywaniu pliku z adresu. WebSocketu nigdzie. **Od 30.09.2026
    wymuszony na 7.29.1** — patrz niżej.
  - **`esbuild` 0.18** (poprawka w 0.25) — przychodzi przez `drizzle-kit` →
    `@esbuild-kit`, czyli narzędzie do generowania migracji na maszynie
    programisty. Nie ma go w obrazie, a dziura dotyczy serwera deweloperskiego
    esbuilda, którego nie uruchamiamy.

  Nowszych wersji **nie** wymuszamy przez `overrides`, dopóki alert nie
  blokuje CI: to ingerencja w to, co Payload przypiął, do odkręcenia przy
  jego podbiciu — za dziurę, której tu nie da się wywołać.

  **Wyjątek: `undici` jest wymuszony na 7.29.1** (`overrides.payload.undici`
  w `web/package.json`, od 30.09.2026). 29.09 wieczorem opublikowano dwa
  alerty **high** w 7.29.0 — WebSocket (`GHSA-rfgv-xxqx-mfg5`) i `BalancedPool`
  (`GHSA-w293-vg96-wgc3`). Żaden nas nie dotyczy (Payload woła tylko `Agent`
  i `fetch`), ale bramka `npm audit --audit-level=high` w CI **nie odróżnia
  dziury osiągalnej od nieosiągalnej** i zatrzymała każdy PR, łącznie z #30.
  Czekanie na Payload (3.90.2, najnowszy, wciąż przypina 7.29.0) znaczyło
  brak wdrożeń na czas nieokreślony. Poprawka to sama łatka (ostatnia cyfra).

  **Przy podbiciu Payloada:** `npm view payload@<nowa> dependencies.undici`.
  Jeśli ≥ 7.29.1 — **usunąć blok `overrides`** z `web/package.json` (inaczej
  zostanie po cichu i kiedyś cofnie Payload do starszego `undici`) i ten
  akapit. Potem `npm ls undici esbuild` w `web/`; jeśli `esbuild` wciąż
  sprzed poprawki — sprawdzić, czy nie wszedł do obrazu.
- **Bramka audytu ma listę wyjątków — `web/scripts/audit-gate.mjs`**
  (`npm run audit`, od 03.10.2026). Sam `npm audit` umie tylko „wszystko
  albo nic”, a od 02.10 (przegląd GitHuba; opublikowany 18.09) zgłasza
  alert **high** bez żadnej poprawki:
  **`braces`** (`GHSA-vfj7-8cjw-p6xm`, przepełnienie stosu przy głęboko
  zagnieżdżonym wzorcu). Łańcuch: `@payloadcms/next` → `sass` 1.77.4
  (przypięty co do numeru) → `chokidar` 3 → `braces`. To narzędzia budowania:
  żadnego z nich nie ma w `.next/standalone`, a aplikacja nie rozwija wzorców
  od odwiedzających. Najnowszy Payload 3.x (3.90.2) wciąż przypina ten
  `sass`, a `braces` nie ma wydania z poprawką — bez wyjątku stały WSZYSTKIE
  PR-y i wdrożenia, na czas nieokreślony.
  - Wyjątek obejmuje **jeden identyfikator**, nie pakiet ani poziom — każda
    inna dziura high/critical, także nowa w `braces`, zatrzymuje CI jak dotąd.
  - Wpis, którego audyt już nie zgłasza, **też wywala bramkę** (`STALE`),
    więc wyjątek nie zostanie po cichu po naprawie.
  - **Przy podbiciu Payloada:** `npm view @payloadcms/next@<nowa>
    dependencies.sass` — od `sass` 1.79 jest `chokidar` 4 bez `braces`.
  - Nowy wyjątek tylko z opisem w skrypcie: dlaczego nieosiągalny i kiedy go
    zdjąć. Obniżanie poziomu bramki albo `continue-on-error` — nie.
  - Obok: zadanie Dependabota „dompurify” kończy się na czerwono
    (`security_update_not_possible`) — `dompurify` przypina `monaco-editor`
    z Payloada (zasada 19), alert jest `low`, nie blokuje CI. Na produkcję
    nie wpływa; zniknie przy podbiciu Payloada.
- **PostgreSQL 18** (`postgres:18-alpine`). 19 istnieje tylko jako beta.

---

## Rejestr portów bazy w developmencie

Stan katalogu `Projects` na 19.09.2026:

| Port | Projekt |
|---|---|
| 5432 | next-step-pro-climbing-hub, first-aid-kit-api |
| 5433 | fire-academy-hub, template_project, first-aid-kit-api (dev) |
| 5434 | anovastudio |
| **5435** | **abcwspinania** |

Kolejny projekt bierze 5436. Bez tego rejestru dwa projekty naraz nie wstaną.
Baza deweloperska jest przypięta do `127.0.0.1` — bez tego Docker otwiera port
na wszystkich interfejsach, **z pominięciem zapory hosta**.

---

## Struktura aplikacji — grupy tras

```
web/src/app/
├── robots.ts            ← ⚠️ MUSI być tutaj, nie w grupie
├── manifest.ts          ← ⚠️ tak samo
├── global-not-found.tsx ← 404 dla adresów, których nie zna żadna trasa
├── favicon.ico/         ← ikona dla każdego adresu, też panelu
├── (frontend)/          ← strona, layout, sitemap, icon, og, error, not-found
└── (payload)/           ← panel i API, boilerplate Payloada
```

### 404: dwa wejścia, jedna treść

Od 01.10.2026. Przy dwóch layoutach głównych Next nie ma gdzie wyrenderować
wspólnej 404, więc adres, którego nie zna żadna trasa (`/cokolwiek`), dawał
jego gołą, czarną stronę po angielsku, bez nagłówka i stopki.
`(frontend)/not-found.tsx` łapie wyłącznie `notFound()` wołane przez stronę
(np. nieistniejący kurs).

Rozwiązanie to `app/global-not-found.tsx` — plik Next-a dokładnie na ten
przypadek. **Jest eksperymentalny**: działa dzięki
`experimental.globalNotFound` w `next.config.ts`. Przy każdym podbiciu Next-a
sprawdzić, czy flaga i plik nie zmieniły nazwy, i wejść na zmyślony adres.

Plik renderuje się POZA layoutem, więc niesie własny dokument: `SiteShell`
(`<html>`, nagłówek, stopka, pasek — ten sam komponent, którego używa layout
`(frontend)`), fonty z `lib/fonts.ts` i własny import `globals.css`. Powtarza
też `revalidate = 300`, bo layoutu nie dziedziczy. Obie 404 pokazują
`NotFoundContent` — zmiana wyglądu to jeden plik.

**Nie ma `app/layout.tsx`.** Obie grupy mają własny layout z `<html>` i `<body>`,
bo panel nie może dziedziczyć stylów strony. Next pozwala na wiele layoutów
głównych dokładnie wtedy, gdy nie ma layoutu w korzeniu.

### ⚠️ `robots.ts` i `manifest.ts` nie działają w grupie tras

Zmierzone 19.09.2026 na dwóch osobnych przypadkach: `robots.ts` i `manifest.ts`
umieszczone w `(frontend)/` **nie produkują żadnej trasy** — `/robots.txt`
i `/manifest.webmanifest` znikają z manifestu Next-a, bez błędu i bez ostrzeżenia.

**To nie jest reguła ogólna dla plików konwencji.** `sitemap.ts`, `icon.tsx`,
`error.tsx` i `not-found.tsx` w tym samym katalogu działają normalnie. Dotyczy
dokładnie tych dwóch, więc oba leżą w korzeniu `app/`.

Skutek uboczny: skoro `manifest.ts` jest poza grupą, Next nie dokleja go sam do
`<head>` podstron — layout wskazuje go jawnie przez `metadata.manifest`.

W korzeniu `app/` leży też **`favicon.ico/route.tsx`** — tym razem z wyboru,
nie z przymusu (grupa tras nie zmienia adresu, więc w `(frontend)` działałby
tak samo). Leży tu, bo służy całej aplikacji: panelowi (`admin.meta.icons`
w `payload.config.ts`) i wbudowanej 404 Next-a, która nie ma naszego `<head>`,
nie tylko stronie. Do 30.09.2026 zwracał 404, a panel miał w karcie logo
Payloada.

Jeśli kiedyś zniknie `/robots.txt` albo `/manifest.webmanifest`, to jest
pierwsze miejsce do sprawdzenia: `cat .next/app-path-routes-manifest.json`
pokazuje, co Next faktycznie wystawił.

### Boilerplate w `(payload)/`

Pliki z nagłówkiem „GENERATED AUTOMATICALLY BY PAYLOAD" pochodzą wprost
z szablonu `templates/blank` w wersji **v3.90.1**. Jedna świadoma zmiana:
`layout.tsx` importuje `./custom.css` zamiast `./custom.scss`, bo nie dokładamy
pipeline'u SCSS dla jednego pustego arkusza.

---

## Zasady kodu

1. **Cała treść przez `src/lib/content.ts`.** Payload siedzi w tym samym
   procesie, więc sięgamy do bazy bezpośrednio (Local API) — bez przeskoku
   sieciowego i bez CORS-u.
2. **Fallback na puste dane jest CELOWY.** `withPayloadSafe()` łapie błąd
   połączenia z bazą i renderuje pusto, żeby `next build` w CI przechodził bez
   Postgresa, a awaria na produkcji dawała pustą sekcję zamiast pięćsetki.
   Loguje `warn`, nie `error` — brak bazy przy buildzie to scenariusz
   przewidziany, a nie awaria.
3. **Każde zapytanie o kolekcję podaje `limit` jawnie.** Payload domyślnie
   zwraca **10** pozycji; bez tego lista ucina się bez błędu i bez śladu w logach.
4. **Funkcje formatujące trzymamy w `src/lib/format.ts`, osobno od `content.ts`.**
   `content.ts` ciągnie cały silnik Payloada, więc testy odpalane gołym
   `node --test` nie mogłyby go zaimportować.
5. **Uprawnienia publiczne deklarujemy w kodzie** (`access: { read: () => true }`).
   W poprzednim CMS-ie siedziały w bazie i trzeba je było wyklikać osobno
   w każdym środowisku — to była stała pozycja na liście pierwszego uruchomienia
   i stałe źródło „u mnie działa".
6. **Typy Payloada są commitowane** i pilnowane w CI. Zmieniłeś kolekcję —
   uruchom `npm run generate:types` i dołącz plik do commita.
7. **Metadane eksportujemy jako `generateMetadata()`**, nie `export const metadata`
   — ta druga forma wymaga literału i nie przyjmie wywołania `pageMetadata()`.
8. **Obraz OG przez zwykłą trasę `app/(frontend)/og/route.tsx`**, nie przez
   konwencję `opengraph-image.tsx` — tamta gubiła `og:image` na części podstron.
9. **Treść zwinięta musi BYĆ w HTML-u** (atrybut `hidden`, nie `{open && …}`).
   Googlebot nie klika w rozwijane sekcje.
10. **Fonty z podzbiorem `latin-ext`** — inaczej polskie znaki diakrytyczne lecą
    na krój zapasowy i tekst rozjeżdża się w środku wyrazu.
11. **Dokładnie jeden `<h1>` na stronę** — wymóg, nie preferencja.
12. **Unikalne identyfikatory filtrów SVG** — duplikaty `id` między komponentami
    sprawiają, że jeden filtr nadpisuje drugi.
13. **Nic wgrywanego przez panel nie dostaje `immutable`.** `public/images`
    i `public/logo` mają tydzień cache, pliki z Mediów i z galerii miesiąc —
    wszystkie ze `stale-while-revalidate`, żadne z `immutable`. Powód jest
    jeden dla wszystkich: **Payload nie dokłada hasha do nazwy pliku**
    (zmierzone 23.09.2026 — `skaly.jpg` leży pod `/api/media/file/skaly.jpg`).
    Adres nie zmienia się przy podmianie pliku, a `immutable` znaczy „nie
    pytaj ponownie", więc stara wersja zostawałaby u odwiedzających miesiąc,
    nie do ruszenia nawet odświeżeniem. Przy plikach z `public/` nadal
    obowiązuje: podmieniasz zdjęcie → zmień nazwę pliku.
14. **`upload.limits.fileSize` musi się zgadzać z `client_max_body_size`
    w nginx** (25 MB). Rozjazd daje 413 z nginx, zanim żądanie dojdzie do
    aplikacji — i błąd, którego nie widać w jej logach.
15. **Katalog uploadów liczymy od `process.cwd()`, nie od położenia
    `payload.config.ts`.** W obrazie standalone skompilowany kod leży gdzie
    indziej niż źródła, więc ścieżka wyliczona ze źródeł wskazywałaby w pustkę.
16. **Walidacja formularzy istnieje po stronie serwera, nie tylko w HTML-u.**
    Atrybuty `required` to wygoda dla odwiedzającego — omija je każdy, kto wyśle
    żądanie bez formularza. Reguły siedzą w `src/lib/validation.ts` (czyste
    funkcje, bez importów z Payloada, żeby dało się je testować) i są wołane
    w akcji serwerowej.
17. **Akcje serwerowe wołają Payload z `overrideAccess: false`.** Formularz jest
    publiczny, więc żądanie nie ma zalogowanego użytkownika; ta flaga wymusza
    przejście przez regułę `create` kolekcji zamiast obchodzenia jej. Gdyby ktoś
    kiedyś tę regułę zaostrzył, formularz przestanie działać GŁOŚNO, a nie po
    cichu ją ominie.
18. **Zgodę RODO zapisujemy TREŚCIĄ, nie znacznikiem „tak".** `src/lib/consent.ts`
    trzyma klauzulę i jej wersję; ten sam ciąg trafia pod pole wyboru i do bazy.
    Inaczej po zmianie brzmienia nie da się wykazać, na co dana osoba wyraziła zgodę.
19. **Content-Security-Policy ustawia APLIKACJA (`next.config.ts`), nie nginx.**
    Panel Payloada wymaga luźniejszej polityki niż strona, a rozdzielenie tego
    w nginx wymagałoby osobnego bloku `location /admin`, w którym własny
    `add_header` kasuje dziedziczenie z bloku `server`. Nagłówek wysłany z obu
    miejsc dotarłby do przeglądarki podwójnie. **Nie dodawaj CSP do nginx.**

    Skutek uboczny do zapamiętania: Payload ładuje edytor kodu (`monaco`)
    z `cdn.jsdelivr.net`, a nasze `script-src 'self'` tego zabrania. Dziś to
    nieszkodliwe, bo żadna kolekcja nie ma pola typu `code` ani `json`, więc
    edytor nigdy się nie uruchamia. Gdy ktoś takie pole doda, **edytor po
    prostu się nie pojawi** — bez komunikatu w panelu, z błędem wyłącznie
    w konsoli przeglądarki. Wtedy decyzja: albo wpuścić ten adres do CSP
    (czyli cudzy kod do zalogowanego panelu), albo serwować edytor z własnej
    domeny. To samo `monaco` odpowiada za zgłoszenie `moderate` w `npm audit`
    (`dompurify`) — nie trafia do zbudowanej aplikacji, jest zależnością
    Payloada i zniknie przy jego podbiciu. Nie ruszamy tego osobno.

20. **`alt` w Mediach jest NIEOBOWIĄZKOWY — to decyzja, nie niedopatrzenie.**
    Był wymagany do 23.09.2026. Wymóg kupował gorszą dostępność, nie lepszą:
    przy wgrywaniu zbiorczym stawia blokujący formularz przed każdym plikiem,
    więc przy dwudziestym zdjęciu w pole wpada „zdjęcie" albo „IMG_4471".
    Czytnik ekranu czyta taki śmieć na głos, podczas gdy pusty `alt` każe mu
    zdjęcie ozdobne pominąć — i o to właśnie chodzi w specyfikacji.
    **Każde miejsce renderujące obrazek musi pisać `alt={media.alt ?? ''}`**,
    żeby brak opisu dawał `alt=""`, a nie brakujący atrybut. Robi tak każde
    obecne miejsce — sprawdzisz grepem po `alt ?? ''`. (Stała liczba, która
    tu wcześniej stała, zdezaktualizowała się przy pierwszym nowym obrazku.)

21. **Galeria trzyma stan w ADRESIE, nie w przeglądarce.** Powiększone zdjęcie
    to `/galeria?zdjecie=<id>`, renderowane na serwerze — ta sama zasada, którą
    ma spisaną `Filters.tsx`. Dzięki temu działa bez JS, pojedyncze zdjęcie da
    się wysłać, a przycisk Wstecz zamyka powiększenie bez sztuczek na historii.
    Komponent kliencki (`GalleryLightboxBehavior.tsx`) robi **wyłącznie** to,
    czego HTML nie umie: klawisze, pułapkę na ognisko, blokadę przewijania tła.
    `canonical` zawsze wskazuje `/galeria` bez parametru — inaczej pięćdziesiąt
    adresów z tą samą treścią konkurowałoby w indeksie.

22. **Zdjęcia galerii to OSOBNA kolekcja, nie pole w Mediach.** Najpierw był
    ptaszek „Pokaż w galerii" przy zdjęciu; padł przy pierwszym użyciu przez
    klienta, bo wymagał wejścia w każde zdjęcie osobno — przy pięćdziesięciu
    to pięćdziesiąt przejść przez formularz. Wgranie do własnej kolekcji jest
    całą robotą. To ta sama decyzja co przy obozach wobec kursów: wspólna
    kolekcja z przełącznikiem daje formularz, w którym połowa pól jest zawsze
    nieistotna. Przyjęty koszt: zdjęcie potrzebne i jako okładka kursu, i w
    galerii wgrywa się dwa razy.

23. **⚠️ Kolekcja z uploadem wymaga DWÓCH wpisów poza samą kolekcją:**
    w `images.localPatterns` (`next.config.ts`) **i** jako blok `location`
    w `deploy/nginx.conf`. Pierwszy odpowiada za renderowanie, drugi za
    cache przeglądarki. Bez wpisu w `localPatterns` Payload serwuje pliki pod `/api/<slug>/file/**`,
    a `next/image` z adresem spoza tej listy **rzuca wyjątkiem** — podstrona
    zwraca 500, a nie puste miejsce po obrazku. Zmierzone 23.09.2026 przy
    `gallery-photos`: lint, typy, testy i `build` przeszły komplet, bo strona
    jest dynamiczna i przy budowaniu baza była pusta. Wyszło dopiero po
    wejściu na `/galeria` z prawdziwym plikiem. Brak bloku w nginx nie psuje
    niczego widocznie — pliki po prostu wypadają z długiego cache'u i lecą
    przez `location /`, co przy pięćdziesięciu zdjęciach na stronie widać
    w czasie ładowania, a nie w logach. **Dodajesz kolekcję z plikami —
    dopisz ją w obu miejscach od razu.**

    Nowy blok kopiuj z bloku Mediów, nie z `location /` — musi mieć
    `proxy_hide_header Cache-Control` i powtórzone nagłówki bezpieczeństwa,
    bo własny `add_header` w bloku `location` kasuje dziedziczenie z bloku
    `server`. Polityka cache'u: patrz zasada 13.

24. **Powiększenie bierze ORYGINAŁ przez optymalizator Next-a, a nie drugi
    wariant z Payloada.** Kuszące jest dołożenie `large` do `imageSizes`, ale
    koszt sharpa wróciłby na moment wgrywania — czyli tam, gdzie już raz położył
    wysyłkę (patrz komentarz w `Media.ts` o jednym wariancie zamiast trzech).
    Optymalizator jest już włączony dla `/api/media/file/**` (`next.config.ts`)
    i trzyma wynik 30 dni, więc ten sam rachunek płacimy raz, przy pierwszym
    wyświetleniu. **Nie podawaj `quality`** — Next 16 dopuszcza domyślnie tylko
    75. `priority` jest przestarzałe; pierwszy rząd kafelków dostaje
    `loading="eager"`.

    **Oryginał + `sizes` tylko przy zdjęciach pokazanych DUŻO** (okładka
    artykułu, wyróżniony wpis, zdjęcie na „O nas”, hero, obozy na stronie
    głównej). Karty kursów, obozów, wpisów, portrety i kafelki galerii zostają
    na `medium` (750 px) — celowo. Zmierzone 26.09.2026: przejście ich na
    oryginał dawało na iPhonie (3×) **dwa razy cięższe strony** (galeria
    4,4 → 9,1 MB, `/kursy` 1,4 → 2,9 MB). Dwa powody: srcset wybiera plik po
    SZEROKOŚCI, więc pionowe zdjęcie w karcie o stałej wysokości przychodzi
    w całości, choć widać z niego pasek; a ekran 3× prosi o trzykrotność
    szerokości kafelka, której przy tej wielkości nikt nie odróżni od 2×.
    `medium` działa tu jak sufit i to jest jego zadanie.

    Duże zdjęcia **przycinane** do ramki biorą plik przez `croppedSource()`,
    a nieprzycinane przez `originalSource()` (`src/lib/format.ts`).
    ⚠️ **Payload zapisuje wymiary oryginału BEZ obrotu z EXIF.** Zdjęcie
    z telefonu trzymanego pionowo ma w bazie 4000 × 1800, a na ekranie jest
    pionowe; `medium` (robiony przez sharpa po obrocie) ma już 750 × 1667.
    Kształt zdjęcia oceniaj więc po `medium`, nigdy po `width`/`height`
    oryginału — obie funkcje to robią.

25. **`(payload)/admin/importMap.js` jest GENEROWANY — nie formatuj go.**
    Przepisuje go i `payload run`, i sam serwer deweloperski przy przeliczaniu
    konfiguracji, zawsze bez formatowania. Zanim trafił do `.prettierignore`,
    `format:check` w CI wywalał się po zmianach, które z tym plikiem nie miały
    nic wspólnego, a cała różnica siedziała w cudzysłowach. Jest tam z tego
    samego powodu co migracje i `payload-types.ts`.

26. **Każde przycinane zdjęcie z panelu dostaje
    `style={{ objectPosition: focalPosition(media) }}`.** Ustalone 24.09.2026.
    Klient kadruje zdjęcia punktem centralnym w panelu, a strona przycina je
    wokół niego (`object-cover` + `object-position`). Obrazek bez tej linii
    przycina się od środka **po cichu** — punkt ustawiony w panelu nic na nim
    nie zmienia i nie ma po tym śladu nigdzie poza samym wyglądem. Sprawdzisz
    grepem: każde `object-cover` przy zdjęciu z Payloada ma obok
    `focalPosition(`. Nie dotyczy zdjęć z `public/` (nie mają punktu) ani
    miejsc bez przycinania — okładka w samym artykule
    (`aktualnosci/[slug]`) ma `object-cover`, ale bez stałej wysokości niczego
    nie ucina.

    Narzędzie „przytnij" jest w Mediach **wyłączone** (`crop: false` w
    `Media.ts`): zapisane przycięcie podmienia plik, więc wycięty fragment
    znika też tam, gdzie to samo zdjęcie ma inny kształt. Punkt centralny
    działa dla wszystkich kształtów naraz. Nie włączaj go z powrotem bez tej
    rozmowy z klientem. W `GalleryPhotos` zostaje włączone celowo — galeria
    pokazuje zdjęcie w całości, w jednym kształcie, więc przycięcie jest tam
    zwykłą obróbką zdjęcia, a nie utratą kadru gdzie indziej.

    **W `GalleryPhotos` odwrotnie: punkt centralny jest WYŁĄCZONY**
    (`focalPoint: false`, od 30.09.2026). Galeria niczego nie przycina
    (kolumny zachowują kształt zdjęcia, powiększenie ma `object-contain`),
    więc ustawiony punkt nie zmieniał na stronie nic i tylko mylił klienta.
    Przycięcie w galerii **kasuje oryginał z dysku** (Payload usuwa stary plik
    razem z wariantem `medium`) — stąd ostrzeżenie w opisie kolekcji w panelu.
    Wyłączenie nie wymagało migracji: Payload zostawia kolumny
    `focal_x`/`focal_y`, dopóki kolekcja ma `imageSizes`.

27. **Logo „za skałą” na stronie głównej działa TYLKO z jednym zdjęciem.**
    Od 30.09.2026 pełne logo stoi w hero za skałą: maska nieba
    (`public/images/hero/`) jest zrobiona z pikseli zdjęcia
    `20240828_134954(1).jpg`, a lista pasujących plików i współrzędne logo
    siedzą w `components/HeroSign.tsx`. **Gdy klient podmieni zdjęcie w panelu albo
    przestawi na nim punkt centralny, strona sama wraca do zwykłego logo**
    (`heroSceneFits`) — nic się nie psuje, ale efekt znika bez śladu w logach.
    Nowe zdjęcie = nowa maska (`design/hero/make_mask.py`) i nowe
    współrzędne. Uwaga: oryginał ma w EXIF obrót o 180° — skrypt czytający
    surowe piksele musi go najpierw zastosować.

    Od 30.09.2026 jest też **wersja po retuszu** (`20240828_134954-retusz.jpg`,
    bez ciemnej plamy w prawym dolnym rogu). Maska pasuje do obu, kod
    rozpoznaje oba pliki. **Retusz nie jedzie z deployem** — zdjęcie siedzi
    w panelu, więc na każdym serwerze trzeba je raz wgrać i wybrać w „Stronie
    głównej”. Instrukcja i powód, dla którego nowy plik, a nie nadpisanie
    starego: `design/hero/README.md`.

---

## Budżet pamięci (Ampere A1, 2 OCPU / 12 GB)

Limity **parametryzowane** przez `deploy/.env`. Domyślnie, przy całej maszynie:

| Usługa | Limit | Heap / strojenie |
|---|---|---|
| postgres | 1 GB | `shared_buffers=256MB`, `effective_cache_size=768MB`, `work_mem=8MB`, `max_connections=40` |
| app | 2 GB | `--max-old-space-size=1536` |
| nginx | 128 MB | — |

Profil „pół maszyny" (1 OCPU / 6 GB) czeka zakomentowany w `deploy/.env.example`.

**Zmieniasz `POSTGRES_MEM_LIMIT` — obniż też `shared_buffers`
i `effective_cache_size`.** Sam limit kontenera Postgresowi nic nie mówi; przy
zbyt niskim zostanie ubity przez OOM, zamiast zwolnić. To samo dotyczy
`APP_MEM_LIMIT` i `--max-old-space-size`.

nginx ma **128 MB, nie 32 MB**: w anovastudio z limitem 32m dostawał OOM przy
wysyłce 27 zdjęć naraz do biblioteki mediów.

`setup-swap.sh` (2 GB, swappiness 10) zostaje mimo zapasu pamięci — jako
bezpiecznik przy szczytach sharpa. Skrypt jest idempotentny.

---

## Lista pierwszego uruchomienia na serwerze

1. `deploy/.env` z `.env.example`, sekrety wygenerowane
   (`openssl rand -hex 32`, każdy osobno). **Hex, nie base64:** hasło do bazy
   trafia do `DATABASE_URI` (`postgresql://user:HASŁO@...`), a base64 potrafi
   wylosować `/`, który ten adres rozcina — aplikacja nie łączy się z bazą,
   a komunikat nie mówi nic o haśle.
2. Certyfikaty w `deploy/certs`. Domena za Cloudflare dostaje **Origin
   Certificate** (15 lat, bez odnawiania) — patrz „Domena tymczasowa
   i Cloudflare" niżej. Domena docelowa do dnia przełączenia działa na
   certyfikacie tymczasowym (self-signed w `fullchain.pem`/`privkey.pem`):
   nginx bez niego nie wstaje, a prawdziwego nie da się wystawić, zanim DNS
   wskaże serwer.
3. Rekordy DNS A dla `@` i `www` na publiczny adres instancji.
4. ~~Przejęcie wolumenu uploadów na uid 1000~~ — **niepotrzebne**. Sprawdzone
   26.09.2026 na produkcji: Docker przy pierwszym montowaniu pustego nazwanego
   wolumenu kopiuje właściciela z obrazu, więc `/app/uploads` od razu należy
   do `node` i zapis działa. Punkt został, żeby nikt go nie „przywracał".
5. Workflow **Migrate** — założenie schematu na czystej bazie.
6. Konto administratora: wejść na `https://abcwspinania.info/admin`, ekran
   „utwórz pierwszego użytkownika".
   ⚠️ Zrobić to **od razu po pierwszym deployu**. Dopóki nie ma żadnego konta,
   ekran rejestracji pierwszego administratora jest dostępny dla każdego, kto
   zna adres.
7. Zmienne repozytorium `SITE_URL` (domena **docelowa** — wpiekana w obraz)
   i opcjonalnie `SMOKE_URL` (adres, pod którym smoke test ma sprawdzać
   stronę, gdy docelowa jeszcze nie wskazuje serwera), oraz sekrety:
   `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`, `GHCR_OWNER`,
   `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `PAYLOAD_SECRET`.

   ⚠️ **`SITE_URL` ustawia się PRZED scaleniem, które ma ją zawierać.** Zmiana
   zmiennej niczego nie przebudowuje — działa dopiero przy następnym obrazie.
   Zmierzone 28.09.2026: PR scalony rano, zmienna ustawiona wieczorem, obraz
   0.5.4 wyszedł z `localhost:3000` w mapie strony i adresach kanonicznych,
   a CI był zielony. Sprawdzenie obrazu przed wdrożeniem:
   `grep -rl "https://<domena>" /app/.next | wc -l` w kontenerze — zero
   znaczy, że adres nie wszedł.

**Czego NIE ma już na tej liście:** wyklikiwania uprawnień publicznych w panelu.
Są w kodzie i jadą z deployem.

---

## Przekierowania ze starej strony

Od 05.10.2026 (ZAKRES pkt 1b). Stare adresy Joomli → nowe odpowiedniki,
`redirects()` w `next.config.ts` z listy w `src/lib/legacyRedirects.ts`,
na stałe (308). Działają na każdej domenie — na tymczasowej nikt z nich
nie przychodzi, więc ożyją same w dniu przełączenia.

- **Spis zrobiony przejściem po linkach** starej strony (nie miała mapy):
  około czterdziestu podstron i artykułów. Kalendarz (`/kalendarz/...`
  generuje stronę na każdy dzień) i tagi — jedną regułą na całą sekcję.
- **Tylko DOKŁADNE stare ścieżki, żadnych wzorców na prefiksach nowej
  strony** (`/kursy/*`, `/aktualnosci/*`, `/obozy/*`). Nowy wpis
  `/aktualnosci/25-lat-abc-wspinania` zaczyna się od cyfr jak stare
  `/aktualnosci/107-20lat` — reguła „numerowany adres” połknęłaby go.
- **`legacyRedirects.test.ts` pilnuje**: żadna reguła nie przechwytuje trasy
  z `src/app/(frontend)` ani adresu treści z listy `CONTENT`; każdy cel
  istnieje; każdy znaleziony stary adres jest obsłużony; brak łańcuchów.
  ⚠️ `CONTENT` to adresy z panelu na 05.10.2026 — **zmiana sluga kursu,
  obozu albo wpisu w panelu łamie przekierowanie na niego bez śladu**.
  Przy zmianie sluga: popraw cel w `legacyRedirects.ts` i `CONTENT`.
- Stare artykuły bez odpowiednika → `/aktualnosci`, stare „O ABC” → `/o-nas`.
- **Po przełączeniu domeny**: Search Console, raport „Strony” — stare
  adresy mają przechodzić na nowe, bez 404.

**Przy okazji: mapa strony nie odświeżała się wcale.** `sitemap.ts` nie miał
`revalidate`, więc Next generował ją raz, przy buildzie w CI — bez bazy —
i trzymał na zawsze (`initialRevalidateSeconds: false` w
`.next/prerender-manifest.json`). Produkcja pokazywała w mapie tylko strony
stałe, bez żadnego kursu, obozu ani wpisu. `revalidate` layoutu NIE dociera
do tras metadanych (`sitemap`, `robots`, `manifest`) — każda potrzebuje
własnego. Teraz `revalidate = 3600`.

---

## Kopie zapasowe

Od 06.10.2026 (ZAKRES pkt 7). Wzór: Next Step Pro (`nsp-backup.sh`), działający
tam od 09.2026 — powody każdego kroku przeniesione razem z kodem.

- **Co noc o 03:00** (`/etc/cron.d/abc-backup`) `deploy/abc-backup.sh`: zrzut bazy
  (`pg_dump`, plain SQL, gzip) i archiwum wolumenu uploadów (Media + Galeria; cache
  obrazków pominięty — Next odbuduje go sam). **Archiwum uploadów tylko gdy się
  zmieniły** (odcisk ścieżka|rozmiar|mtime w `/var/lib/abc-backup/files-state`),
  najrzadziej co 30 dni; każde jest pełne, a do zrzutu z dnia X pasuje najnowsze
  archiwum ≤ X, nie „z tej samej daty”. `FILES_REFRESH_DAYS` musi być mniejsze niż
  retencja na Drive — inaczej przycinanie skasowałoby jedyne archiwum (skrypt
  odmawia startu).
- **Dwa poziomy:** dysk serwera (7 dni, `/backups`, tylko root) i Google Drive
  (40 dni, od 09.10.2026; wcześniej 90) przez `rclone` z remote'em **`crypt`** —
  szyfrowanie PRZED wysłaniem. Polityka prywatności (`/polityka-prywatnosci`,
  wchodzi z zapisami) mówi „do 40 dni” — każda zmiana retencji wymaga poprawki
  strony i `PRIVACY_POLICY_VERSION`.
  Drive na start Mateusza (decyzja 06.10.2026); przeniesienie na konto szkoły
  albo przekazanie haseł Krzyśkowi — do ustalenia.
- **Każdy plik powstaje jako `.part` i dostaje właściwą nazwę dopiero po
  sprawdzeniu**: zrzut — po znaczniku `PostgreSQL database dump complete` (obcięty
  zrzut gzipuje się poprawnie i przechodzi `gunzip -t`), archiwum — po `tar tzf`.
  Sprawdzone 06.10.2026: zrzut ucięty w połowie zostaje `.part` i kończy przebieg błędem.
- **`rclone copy`, nigdy `sync`** — inaczej lokalne sprzątanie po 7 dniach
  kasowałoby też kopie na Drive.
- **`/backups/milestones`** — zrzuty ręczne przed ryzykowną operacją (Migrate na
  prawdziwych danych, major Postgresa). Nie czyści ich nic, ani lokalnie, ani na Drive.
- **Alarm przez healthchecks.io** (`/etc/abc-backup.env`, `HEALTHCHECK_URL`):
  start, sukces albo `/fail`. Cisza = awaria. Bez skonfigurowanego Drive przebieg
  robi kopie lokalne i **kończy się błędem** — brak kopii poza serwerem ma być widać.
- **Instaluje je workflow Deploy** (`setup-backups.sh`, jak swap): skrypt, cron,
  logrotate, katalogi, `rclone` z apt. Idempotentne, błąd nie blokuje wdrożenia.
  **Sekretów nie dotyka**: `/root/.config/rclone/rclone.conf` (token Google
  i hasła szyfrowania) i `HEALTHCHECK_URL` ustawia się ręcznie raz —
  `deploy/RESTORE.md`, sekcja 0. ⚠️ **`rclone.conf` musi być w menedżerze haseł**:
  bez niego kopie na Drive są nie do odczytania, także przez nas. **I `deploy/.env`
  z serwera też** (sekcja 0.3) — GitHub nie oddaje zapisanych sekretów, a przy
  odbudowie `POSTGRES_USER` i `POSTGRES_DB` muszą być takie jak w zrzucie.
- **Odbudowa po utracie całego serwera: `RESTORE.md`, sekcja 8** (06.10.2026) —
  nowa maszyna, sekrety z menedżera haseł, Deploy, kopia z Drive, dopiero na końcu DNS.
- **Odtwarzanie i ćwiczenie: `deploy/RESTORE.md`.** Ćwiczenie raz na kwartał, na
  tymczasowym kontenerze, z wynikiem zapisanym w tabeli. Przećwiczone lokalnie
  06.10.2026 (zrzut z bazy deweloperskiej wlany bez błędu, liczby wierszy zgodne).
  Użytkownik tymczasowej bazy musi nazywać się jak na produkcji — inaczej zrzut
  przerywa się na `ALTER ... OWNER TO`.
- Wszystkie ścieżki i nazwy w skrypcie można nadpisać zmiennymi środowiska (próba
  na Macu); wartości domyślne są produkcyjne.
- **⚠️ Nigdy `polecenie | grep -q` przy `set -o pipefail`.** Znalezione przy
  pierwszym prawdziwym przebiegu (06.10.2026): `rclone listremotes | grep -qx
  abc-crypt:` — grep kończy na pierwszej linii, rclone dostaje SIGPIPE przy drugiej
  (`gdrive:`), a `pipefail` robi z trafienia porażkę (kod 141). Skonfigurowany Drive
  wyglądał na brak. Lokalnie niewidoczne: bez rclone nie było drugiej linii. Wynik
  najpierw do zmiennej, potem `grep -q ... <<<"$zmienna"` — tak samo przy znaczniku
  końca zrzutu.
- **Konfiguracja Drive na serwerze zrobiona 06.10.2026** (`RESTORE.md`, sekcja 0.1):
  token z Maca przeniesiony bez wyświetlania, hasła szyfrowania wygenerowane na
  serwerze. Pierwsza pełna kopia: 67 s (108 MB zdjęć). **Ćwiczenie odtworzenia z kopii
  pobranej z Drive: zgodne z produkcją** (wynik w tabeli `RESTORE.md`, sekcja 5).

---

## Domena tymczasowa i Cloudflare

Ustalone 26.09.2026. Do czasu przełączenia `abcwspinania.info` (pod którą wciąż
działa stara strona klienta) nowa strona stoi pod **`szkolawspinaczkowa.pl`**,
za Cloudflare. Domena była wcześniej nieużywana — nie ma historii w Google ani
poczty, więc przejęcie jej niczego nie odcina.

- **Google nie może jej zaindeksować.** Blok nginx dla tej domeny wysyła
  `X-Robots-Tag: noindex, nofollow`. Nagłówek, a nie `Disallow` w robots.txt —
  zakaz czytania ukryłby przed Google sam `noindex`.
- **`SITE_URL` wskazuje od razu domenę DOCELOWĄ**, nie tymczasową. Mapa strony,
  adresy kanoniczne i dane strukturalne mówią Google o `abcwspinania.info`
  od pierwszego dnia, więc przy przełączeniu nie ma czego przestawiać ani
  przebudowywać. Smoke test sprawdza w tym czasie `SMOKE_URL`.
- **Bloki nginx dla domeny docelowej nie wiedzą o tymczasowej.** W dniu
  przełączenia usuwa się fragment oznaczony w `nginx.conf` (albo zamienia na
  301 do domeny docelowej) i kasuje zmienną `SMOKE_URL` — bez dotykania
  reszty.
- **Certyfikat Origin z Cloudflare musi leżeć w `certs/` PRZED wdrożeniem
  configu**, który go wskazuje. Brak pliku: `nginx -t` pada w deployu, a przy
  najbliższym restarcie kontenera nginx nie wstaje — razem z domeną docelową.
  Tryb SSL w Cloudflare: **Full (strict)**.
- **Lista adresów Cloudflare (`set_real_ip_from`) jest wpisana ręcznie.** Bez
  niej limit logowania liczy wszystkich odwiedzających jako jeden adres
  Cloudflare i pięć cudzych pomyłek blokuje panel każdemu. Cloudflare rzadko
  zmienia pulę, ale adres spoza listy psuje to po cichu — przy przełączaniu
  domeny docelowej porównać z <https://www.cloudflare.com/ips>.

---

## Świadome braki — nie „przywracaj" ich bez powodu

- **Nie ma workflow pilnującego `VERSION`.** W anovastudio został usunięty:
  Dependabot nie umie edytować tego pliku, a automatyczny bump powodował
  konflikty scalania na tej jednej linii. **Podbijamy ręcznie, w każdym PR-ze**
  (ustalone 24.09.2026) — ostatnia cyfra przy poprawkach i drobiazgach,
  środkowa przy nowej funkcji. Powód nie jest porządkowy: CI etykietuje obraz
  zawartością tego pliku, więc dwa scalenia bez podbicia **nadpisują tę samą
  etykietę** i „wdróż wersję 0.1.0" przestaje znaczyć cokolwiek konkretnego.
  Od pierwszego wdrożenia u Krzyśka oznacza to brak możliwości cofnięcia się
  do wcześniejszego stanu.
- **`version` w `web/package.json` NIE jest synchronizowany z `VERSION`** i nie
  ma być. Nic go nie czyta — pakiet jest prywatny, nie trafia do npm — a w
  anovastudio stoi na `0.1.0` przy `VERSION` równym `1.8.6`. Jedynym numerem
  wersji tego projektu jest plik `VERSION`.
- **Deploy nie jest automatyczny.** Tylko `workflow_dispatch`. Wdrożenie na
  maszynę klienta to decyzja, nie skutek uboczny merge'a.
- **Migracje nie są częścią deployu** — patrz wyżej.
- **Nie ma drugiego obrazu z narzędziami.** Świadomie, z powodu dysku.

---

## Proces

- **Zmiany w Dockerfile lub w pliku blokady buduj lokalnie przed wypchnięciem.**
  `npm ci` w czystym kontenerze wyłapuje rozjazd blokady, a `--platform
  linux/arm64` dodatkowo braki binariów natywnych dla aarch64.
- **Nie oceniaj kompletności obrazu po `ls node_modules`.** Zmierzone: ani
  `@payloadcms/db-postgres`, ani `drizzle-orm` nie istnieją w obrazie jako
  katalogi, a aplikacja czyta z Postgresa bez zarzutu — Turbopack wbudował je
  w chunki serwera. Jedyny wiarygodny test to **uruchomić obraz**. Uwaga na
  pułapkę: uruchomienie `.next/standalone/server.js` z wnętrza drzewa projektu
  NIE jest takim testem, bo Node znajduje brakujące moduły piętro wyżej.
- **Sprzątanie obrazów w deployu idzie PRZED `pull`**, nie po. Pull przerwany na
  braku miejsca kończy deploy na czerwono. Kasowanie jest jawne, po tagach,
  z `KEEP=2` — `docker image prune -af --filter until=` przy magazynie containerd
  przepuszcza obrazy otagowane i uzbierają się wszystkie wersje od początku projektu.
- **`nginx.conf` jest montowany z hosta**, więc `up -d` go nie przeładuje przy
  niezmienionym tagu obrazu — deploy robi jawne `nginx -t` i `nginx -s reload`.

### Weryfikacja lokalna

```bash
docker compose up -d                  # baza na 5435
cd web
npm ci
npm run migrate                       # schemat z migracji w repo
npm run dev                           # strona :3000, panel :3000/admin

npm run lint && npx tsc --noEmit && npm test && npm run build
npm run audit                             # bramka BLOKUJĄCA w CI (npm audit + wyjątki)
npm run generate:types && git diff --exit-code src/payload-types.ts

# nginx.conf — nazwa `app` nie rozwiązuje się poza siecią compose,
# więc do testu podmieniamy ją na adres IP
sed 's|http://app:3000|http://127.0.0.1:3000|g' ../deploy/nginx.conf > /tmp/n.conf
docker run --rm -v /tmp/n.conf:/etc/nginx/conf.d/default.conf:ro \
  -v "$PWD/../deploy/certs:/etc/nginx/certs:ro" nginx:1.31-alpine nginx -t

# Workflow'y (wymaga zainicjowanego repozytorium git)
docker run --rm -v "$PWD/..:/repo" -w /repo rhysd/actionlint:latest -color
```

---

## Następne etapy — świadomie poza tym szkieletem

1. **Rezerwacje i konta uczestników.** W Payloadzie logowanie to właściwość
   kolekcji (`auth: true`), więc konta uczestników będą **drugą kolekcją z tym
   samym mechanizmem** — nie osobnym światem, jak wtyczka users-permissions
   w Strapim obok kont administratorów.
2. **Powiadomienia mailowe i newsletter** (Brevo). Adaptera e-mail jeszcze nie
   ma — Payload ostrzega o tym przy starcie i pisze maile do konsoli.
   Co z tego wynika DZIŚ:
   - formularz kontaktowy działa (wiadomości lądują w bazie i w panelu),
     ale **nikt nie dostaje powiadomienia** — Krzysiek musi zaglądać do panelu;
   - **odzyskiwanie hasła do panelu nie zadziała**, bo mail z linkiem nie wyjdzie.
     Do czasu wpięcia Brevo hasło resetuje się ręcznie, przez bazę.
   Powiadomienie o nowej wiadomości dojdzie jako hook `afterChange` na kolekcji
   `Messages`, bez zmiany tego, co już działa. Zgoda marketingowa do newslettera
   idzie tym samym wzorcem co `src/lib/consent.ts`: treść + wersja, nie samo „tak".
3. **Panel operacyjny** — kalendarz obozów, wykresy. W Payloadzie
   to **własne widoki w tym samym panelu** (udokumentowana funkcja), a nie
   osobny obszar w Next.js, jak musiałoby być przy Strapim.

## Do potwierdzenia z klientem

- Czy domena zostaje `abcwspinania.info`. Występuje w `deploy/nginx.conf`
  (trzy bloki `server_name`) i w zmiennej repozytorium `SITE_URL`. Grep po
  `abcwspinania.info` musi zwracać wyłącznie te miejsca.
- Telefon i adres e-mail — wpisuje je Krzysiek w globalu `site-config`
  w panelu, bez commita i deployu. Dopóki telefon jest pusty, strona **nie
  renderuje** linku `tel:` zamiast renderować zepsuty.
- Model treści: sześć kolekcji treściowych (`Courses`, `Camps`, `Sessions`,
  `Posts`, `Testimonials`, `Instructors`) i pięć globali. Etykiety w panelu
  są po polsku — to je widzi Krzysiek.
