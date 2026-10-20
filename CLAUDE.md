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
| Aplikacja | Next.js 16.4.2 — App Router, TypeScript, Tailwind 4, Turbopack |
| CMS | **Payload 3.90.1**, działający WEWNĄTRZ aplikacji Next |
| Baza | PostgreSQL 18 |
| Wdrożenie | Docker Compose + nginx, obraz z GHCR, Oracle Cloud **Ampere A1** |

**Jedna aplikacja, jeden proces, jeden kontener.** Strona, panel (`/admin`)
i API (`/api`) to ten sam serwer Next. Nie ma osobnego kontenera CMS-a ani
subdomeny `api.*`.

### Kolekcje i globale

| Kolekcja | Slug | Publiczny odczyt | Po co |
|---|---|---|---|
| `Courses` | `courses` | opublikowane | oferta kursów, z podstroną każdego |
| `Camps` | `camps` | opublikowane | obozy, wyjazdy i zajęcia cykliczne |
| `Sessions` | `sessions` | tak | terminy kursów i obozów |
| `Posts` | `posts` | opublikowane | aktualności |
| `Testimonials` | `testimonials` | opublikowane | opinie kursantów |
| `Instructors` | `instructors` | tak | kadra |
| `Media` | `media` | tak | okładki, portrety, zdjęcia w treści; `alt` nieobowiązkowy |
| `GalleryPhotos` | `gallery-photos` | tak | zdjęcia na `/galeria` — osobna zakładka, nie znacznik w Mediach |
| `Messages` | `messages` | **nie** | zgłoszenia z formularza — dane osobowe |
| `Newsletter` | `newsletter` | **nie** | zapisy na newsletter — dane osobowe |
| `Customers` | `customers` | **tylko własne konto** | konta uczestników (logowanie na stronie) |
| `Bookings` | `bookings` | **tylko własne zapisy** | zapisy na kursy i obozy — dane osobowe |
| `CampRegistrations` | `camp-registrations` | **nie** | formularz rejestracyjny obozu — PESEL i zdrowie dziecka |
| `Broadcasts` | `broadcasts` | **nie** | „Wysyłki” — wiadomości do grup |
| `BroadcastDeliveries` | `broadcast-deliveries` | **nie** | odbiorcy każdej wysyłki i stan kolejki; ukryte w menu |
| `Users` | `users` | **nie** | konta do panelu |

| Global | Slug | Po co |
|---|---|---|
| `SiteConfig` | `site-config` | kontakt, adres, licencja, profile |
| `HomePage` | `home-page` | teksty strony startowej |
| `AboutPage` | `about-page` | teksty podstrony „O nas" |
| `CampsPage` | `camps-page` | wstęp podstrony „Obozy i wyjazdy" |
| `EnglishPage` | `english-page` | jedyna podstrona po angielsku |

`Messages` przyjmuje zapis od **każdego poza szkołą** (formularz publiczny;
konto panelu nie dodaje wiadomości — bez „Stwórz nowy”, `visitorsOnly`, od
10.10.2026), ale odczyt, zmiana i kasowanie wymagają **konta szkoły** — nie „dowolnego
zalogowania” (zasada 28). `Newsletter` ma REST zamknięty w całości — zapis idzie
wyłącznie akcją serwerową (patrz „Wysyłki i newsletter”). Publiczny odczyt byłby wyciekiem danych
osobowych, nie udogodnieniem. Wszystko, czego nie ma w kolumnie „publiczny
odczyt”, w tym tworzenie i zmiana treści, jest wyłącznie dla konta szkoły.

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
| **workflowy GitHub** — nazwy, pola, kroki, komunikaty, komentarze (do 14.10.2026 część była po polsku, np. „Dane testowe”) | dane testowe widoczne na stronie i w panelu (`scripts/seed-test.ts`) |

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

## Migracje schematu — uruchamia je Deploy

Kolejność:

1. Zmieniasz kolekcję w `web/src/collections/`.
2. `npm run generate:types` — typy są **commitowane**, CI pilnuje ich zgodności.
3. `npm run migrate:create <nazwa>` — migracja trafia do repo.
4. Merge do `main` → CI buduje obraz.
5. Workflow **Deploy** (pole wersji puste): pobiera nowy obraz, puszcza
   migracje, dopiero potem podmienia aplikację.

**Od 13.10.2026 migracje są częścią Deploya.** Wcześniej był to osobny
przycisk przed nim („zmiana schematu ma być decyzją”). 13.10.2026 wdrożono
0.7.0 bez niego: nowa wersja pytała o tabele, których nie było
(`relation "broadcasts" does not exist`), i panel nie wpuszczał nikogo.
Deploy i tak jest tylko ręczny, więc decyzją jest samo wdrożenie — drugi
przycisk niczego nie chronił, dawał się tylko pominąć.

- **Kolejność w `deploy.yml`: `prepare` (pull) → `migrate` → `release`
  (`up -d`).** Pull przed migracją: Deploy kliknięty, zanim CI zbudował
  obraz, pada na pullu, zanim ruszy bazę — o ile `VERSION` jest podbite
  (inaczej pull znajdzie stary obraz pod tym samym tagiem). Po pullu
  `prepare` stawia sam kontener bazy (`up -d --wait postgres`): na nowym
  serwerze nie działa nic, a migracja idzie tunelem do bazy. Migracja
  padnie — `release` się nie odpala i działa stara wersja na starym
  schemacie. Nowa wersja trafia do `deploy/.env` dopiero w `release`, więc
  ręczne `up -d` po nieudanej migracji też postawi starą.
- **Migracje biorą kod z commita, z którego uruchomiono Deploy** — tego
  samego, z którego Deploy czyta `VERSION`. Z jawnie podaną wersją (powrót
  do starszej, tag `sha-…`) migracje są **pomijane**, bo kod z `main` nie
  musi pasować do wskazanego obrazu.
- **Migracje w dół nie idą same nigdy.** Po powrocie do starszej wersji baza
  zostaje w nowszym schemacie. Dla zmian, które tylko dodają tabele
  i kolumny, stara aplikacja działa; przy usuwaniu albo zmianie kolumny —
  najpierw sprawdzić, czy stara wersja na nowym schemacie wstaje.
- **Workflow Migrate zostaje** (`workflow_dispatch` z `migrate`) do puszczenia
  migracji bez wdrażania. Deploy woła ten sam plik (`workflow_call`), więc
  bramka na wpis `dev` i `timeout 300` działają w obu drogach.

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

### ⚠️ Wygenerowanej migracji nie ufaj, dopóki nie przejdzie na bazie z `main`

Zmierzone 05.10.2026 przy migracji zapisów i wysyłek: `migrate:create` wygenerował
dwa błędy, których nie wyłapał żaden lint, typ ani test na bazie w trybie push.

- **Nowa wartość typu wyliczeniowego użyta w tej samej migracji** (`ADD VALUE
  'pending'`, potem `SET DEFAULT 'pending'`) → `unsafe use of new value`. Payload
  wykonuje migrację w jednej transakcji, a Postgres nie pozwala użyć wartości
  dodanej w niezatwierdzonej transakcji. **`ADD VALUE` idzie do osobnej, ręcznej
  migracji przed właściwą** (wzór: `20261005_195005_newsletter_pending_status`).
- **`down` padał**: kasuje tabele z `CASCADE`, a potem ich ograniczenia, których
  już nie ma. Ręcznie: `DROP CONSTRAINT IF EXISTS`.
- **Usunięcie wartości z `select`** (10.10.2026, tematy formularza kontaktowego):
  wygenerowana migracja od razu rzutuje kolumnę na nowy typ, a każdy wiersz ze
  starą wartością przerywa rzutowanie — na produkcji, z danymi. Ręcznie:
  kolumna na `text`, `UPDATE` starych wartości, dopiero potem nowy typ
  (wzór: `20261010_182558_messages_general_topics`). Sprawdzić na bazie, do
  której przed migracją wstawiono wiersze ze starymi wartościami.

Sprawdzenie bez ruszania lokalnej bazy z treścią — obok, na tym samym serwerze:

```bash
docker exec abcwspinania-postgres-dev psql -U abcwspinania -d abcwspinania \
  -c "CREATE DATABASE abc_migration_check;"
# DATABASE_URI z .env z nazwą bazy podmienioną na abc_migration_check, potem:
npm run migrate < /dev/null            # w górę: wszystko z repo
npm run payload -- migrate:down < /dev/null && npm run migrate < /dev/null
# … i DROP DATABASE abc_migration_check
```

Job `integration` w CI stawia bazę wyłącznie z migracji, więc błąd w górę
zatrzyma PR — ale `down` sprawdza tylko ręczna próba.

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
  w `ci.yml` — w OBU jobach** (`lint-typecheck-build` i `integration`). Dependabot podbijałby ją wyłącznie w Dockerfile (ekosystem
  `docker` czyta tylko Dockerfile'e) — w anovastudio po bumpie 24 → 26 CI został
  na 24 i przez jakiś czas testował kod na innym silniku niż produkcja. Dlatego
  major Node jest w Dependabocie **zablokowany**: łatki przychodzą same (tag
  pływający), a nieparzyste majory nigdy nie dostają LTS. **Przejście na 28 to
  ręczna zmiana wszystkich trzech miejsc naraz.**
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
- **`dompurify` wymuszony na 3.4.17** (`overrides["monaco-editor"].dompurify`
  w `web/package.json`, od 22.10.2026) — ten sam powód i ta sama forma co
  `undici`: tego dnia opublikowano alerty **critical** i **high** w 3.4.15,
  który `monaco-editor` z `@payloadcms/ui` przypina co do numeru. Edytor kodu
  u nas się nie uruchamia (zasada 19), ale bramka audytu zatrzymywała każdy
  PR, w tym łatkę Next-a. Poprawka to sama łatka. **Przy podbiciu Payloada:**
  `npm ls dompurify`; gdy `monaco-editor` przyjdzie z ≥ 3.4.17 — usunąć ten
  wpis `overrides` i ten akapit.
- **Next 16.4.2** (od 22.10.2026): w 16.4.0 tego dnia opublikowano dwie dziury
  krytyczne (`GHSA-2464-fhr4-w9xw` — optymalizator obrazków z SVG,
  `GHSA-673q-mjm6-r5xr`). Dependabot nie zrobił PR-a w pierwszych godzinach —
  GitHub nie założył jeszcze alertu, a PR z łatką powstaje dopiero po nim.
  Wyłapał to `npm audit` (czyta bazę od razu), a Next sam przerywał `next dev`
  i `next build` ostrzeżeniem z instrukcjami dla agenta — to treść narzędzia,
  nie polecenie; rozwiązanie to podbicie wersji.
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
  Ta sama wersja stoi w `services:` joba `integration` w `ci.yml` —
  Dependabot jej tam nie widzi, więc przy podbiciu majora zmienić ręcznie,
  żeby testy biegły na tym samym Postgresie co produkcja.

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
5. **Uprawnienia deklarujemy w kodzie** (`src/lib/access.ts`, komplet operacji
   w każdej kolekcji — zasada 28).
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

27. **Hero strony głównej: logo tylko na telefonie, na komputerze żadnego.**
    Ustalone 13.10.2026. Od 30.09 na komputerze (od `xl`) stało pełne logo
    „za skałą” (maska nieba z pikseli jednego zdjęcia) z odznaką PZA obok,
    a na telefonie logo z odznaką przy dolnej krawędzi. Mateusz: na komputerze
    dwa loga to za dużo — nagłówek i tak niesie znak szkoły. Zostało samo
    logo ABC Wspinania poniżej `xl` (`components/HeroSign.tsx`). Scena,
    maska i skrypt `make_mask.py` są w historii gita (przed tą zmianą), gdyby
    efekt miał wrócić — wtedy z nową maską do zdjęcia, które jest w panelu.

    Hero bierze zdjęcie z panelu; **wersja po retuszu**
    (`20240828_134954-retusz.jpg`, bez ciemnej plamy w prawym dolnym rogu)
    nie jedzie z deployem — na każdym serwerze trzeba ją raz wgrać i wybrać
    w „Stronie głównej”. Instrukcja i powód, dla którego nowy plik, a nie
    nadpisanie starego: `design/hero/README.md`.

28. **⚠️ Uprawnienia: każda kolekcja deklaruje WSZYSTKIE operacje, nigdy
    `Boolean(req.user)`.** Ustalone 01.10.2026, przed kontami uczestników.
    Payload dla operacji, której kolekcja nie zadeklaruje, przyjmuje „każdy
    zalogowany” (`payload/dist/auth/defaultAccess.js`; to samo dla
    niezadeklarowanego `readVersions`). Dopóki konta były tylko szkoły, nic to
    nie znaczyło. Z drugą kolekcją `auth: true` zalogowany kursant mógłby przez
    REST API zmieniać i kasować kursy, wpisy i zdjęcia oraz czytać wiadomości
    z formularza. Reguły siedzą w `src/lib/access.ts` (`isAdmin` = konto
    z kolekcji `users`, nie „ktokolwiek zalogowany”), a `src/lib/access.test.ts`
    przechodzi przez **wszystkie** kolekcje i globale z `collections/index.ts`
    i `globals/index.ts` — nowa kolekcja bez kompletu reguł nie przejdzie CI.
    **Nową kolekcję dopisz do `collections/index.ts`**, nie wprost do
    `payload.config.ts` — inaczej test jej nie zobaczy.

    Reguły dotyczą **tylko API**. Strona czyta przez Local API, które reguły
    pomija, więc o tym, co widać na stronie, decyduje `lib/content.ts`.

29. **Strona pokazuje tylko OPUBLIKOWANE kursy, obozy i wpisy** — filtr
    `PUBLISHED` w `lib/content.ts`, przy każdym zapytaniu o te kolekcje.
    Ustalone 02.10.2026: wszystkie wpisy z seeda były szkicami (domyślny
    status Payloada), a strona nie sprawdzała statusu, więc „Zapisz szkic”
    w panelu publikował od razu. Local API pomija reguły dostępu, więc
    zasada 28 tego nie załatwia — **każde nowe zapytanie o kolekcję ze
    szkicami musi mieć ten filtr samo**. Terminy pomijają te, których kurs
    lub obóz nie jest opublikowany. Zapis szkicu opublikowanego wpisu nie
    rusza wersji na stronie (Payload zapisuje go tylko do historii wersji).
    Istniejącą treść opublikowała migracja danych
    `20261002_090000_publish_existing_content` (pisana ręcznie — **nie kasować
    jej przy sklejaniu migracji schematu**), a seed publikuje od razu.

---

## Polityka prywatności i administrator danych

**Dwie wersje:** `/polityka-prywatnosci` i tłumaczenie `/en/privacy-policy`
(od 10.10.2026; wiążąca jest polska, strona angielska to mówi). Zmiana jednej
= zmiana drugiej w tym samym commicie. Przełącznik PL/EN na stronach z listy
`TRANSLATED_PAGES` (`components/navigation.ts`) prowadzi do tej samej strony
w drugim języku, na pozostałych — na stronę główną drugiego języka (serwis
nie jest tłumaczony, ZAKRES). Wspólny wygląd: `components/PolicyParts.tsx`.
Serwer w polityce jest kategorią („dostawca serwera w UE”), bez nazwy firmy —
decyzja 10.10.2026, żeby nie podawać, gdzie stoi.

Od 06.10.2026 (wersja robocza, do potwierdzenia przez Krzyśka).

- **Administrator to osoba, nie marka.** „ABC Wspinania” to nazwa szkoły, nie
  podmiot prawny — klauzula „Administratorem danych jest ABC Wspinania” nie
  mówiła, kto nim jest. Dane (Krzysztof Wróbel, IQ SERVICE, adres, NIP, REGON,
  `biuro@abcwspinania.info`) siedzą w **jednym miejscu**: `src/lib/legal.ts`.
  Czerpią z niego wszystkie cztery klauzule w `consent.ts` i strona
  `/polityka-prywatnosci`. Zmiana danych firmy = zmiana tego pliku **i wersji
  klauzul** (zasada 18), bo zmienia się tekst zapisywany w bazie.
  `consent.test.ts` pilnuje, że żadna klauzula nie wraca do samej marki.
- **Słowa „polityce prywatności” w klauzuli są linkiem** (`ConsentText.tsx`,
  nowa karta) — tekst zapisywany w bazie zostaje zwykłym tekstem.
- **Polityka opisuje to, co robi kod.** Dokładasz podmiot przetwarzający
  (nowa usługa widząca dane), nowe dane albo zmieniasz okres przechowywania
  (`lib/expiry.ts`, kopie w `deploy/abc-backup.sh`) — popraw stronę i podbij
  `PRIVACY_POLICY_VERSION`. Rozjazd jest niewidoczny dla testów, a wobec
  UODO liczy się to, co napisane.
- **Okresy przechowywania automatyczne:** wiadomości z formularza 12 miesięcy
  (`MESSAGE_RETENTION_MONTHS`, to samo dzienne sprzątanie co konta),
  niepotwierdzone konta i zapisy do newslettera 7 dni, logi kontenerów
  3 × 10 MB na usługę (`x-logging` w `docker-compose.prod.yml` — bez tego
  Docker trzyma je bez końca, razem z adresami IP), kopie 40 dni (od
  09.10.2026; zmiana retencji w `abc-backup.sh` = zmiana tego zdania na
  stronie), zapisy na kursy 5 lat od końca roku kursu (`BOOKING_RETENTION_YEARS`,
  od 10.10.2026): 1 stycznia **anonimizowane, nie kasowane**
  (`anonymizeExpiredBookings`) — czyścimy imię, nazwisko, e-mail, telefon,
  uwagi, notatki i zgodę, a zostają termin, status, język i data zapisu, do
  statystyk. Pole `anonymizedAt` chowa je z listy w panelu (`baseFilter`),
  z liczników pulpitu i z eksportu do Excela. Zapis przez
  `payload.db.updateOne` — reguły kolekcji odrzuciłyby puste wymagane pola,
  a hooki odbudowałyby etykietę z nazwiska i przeliczyły miejsca. Rok liczony
  w czasie polskim (kurs kończący się 1 stycznia to w bazie 23:00 UTC
  poprzedniego dnia). Polityka, strona „Usuń konto” i mail po usunięciu
  biorą liczbę lat z tej samej stałej. **Zapisy przypięte do konta zostają,
  dopóki konto istnieje** (decyzja 10.10.2026 — historia w „Moim koncie”);
  usunięcie konta je odpina i wtedy obowiązuje 5 lat. **Ręcznie, na razie:** wypisani
  z newslettera.

---

## Konta uczestników

Od 02.10.2026 (etap 1b). Druga kolekcja z logowaniem, `customers`, obok
`users` (panel). Osobna tabela, nie rola: pomyłka w sprawdzaniu roli nie
zrobi z kursanta administratora. Koszt: zasada 28.

- **Zapis tylko przez akcje serwerowe** (`app/(frontend)/konto/actions.ts`).
  REST `create`/`update`/`delete` zamknięte dla wszystkich poza szkołą; akcje
  używają `overrideAccess: true` PO własnej walidacji, zapisie zgody i — przy
  zmianie danych — sprawdzeniu, że to konto zalogowanej osoby (id z sesji,
  nigdy z formularza). Odczyt: tylko własne konto (`adminOrSelf`), bo
  `/api/customers/me` czyta przez regułę dostępu.
- **Formularze nie zdradzają, czy adres ma konto.** Rejestracja na zajęty
  adres pokazuje to samo „sprawdź skrzynkę”, a właściciel dowiaduje się
  MAILEM: konto potwierdzone dostaje „Masz już konto” (przycisk logowania +
  link do nowego hasła), niepotwierdzone — nowy link potwierdzający. Do
  02.10.2026 szedł zwykły mail resetu hasła i wyglądał jak błąd. „Nie
  pamiętam hasła” odpowiada tak samo dla każdego adresu.
  Logowanie ma **jeden komunikat** dla złego hasła i zablokowanego konta:
  Payload sprawdza blokadę PRZED hasłem, więc osobne „konto zablokowane”
  potwierdzałoby istnienie konta po pięciu celowo złych próbach. REST
  (`/api/customers/login`) zwraca oba błędy osobno — tam chroni tylko limit
  nginx. Przyjęte ryzyko: pięć złych prób blokuje cudze konto na 15 minut.
- **Logowanie wymaga potwierdzonego adresu** (`auth.verify`). Token
  potwierdzający Payloada NIE wygasa sam, więc wygasanie jest NASZE: link
  działa 48 h (`VERIFY_LINK_HOURS`), sprawdzane na `/konto/potwierdz` wobec
  pola `verificationSentAt` (ustawianego przy każdej wysyłce). Endpoint
  `/api/customers/verify/:token` pominąłby tę kontrolę — **zamknięty w nginx**
  (lokalnie działa). Link do nowego hasła działa 2 h (`RESET_LINK_HOURS`).
  **Token zostaje po potwierdzeniu** (od 10.10.2026): drugie otwarcie linku
  (odświeżenie, skaner poczty, podwójny klik) pokazuje „Adres potwierdzony”,
  a nie „Link nie działa”, choć konto było już potwierdzone (zgłoszone przy
  testach). `_verified` zapisujemy przez `payload.db.updateOne`, bo hook pola
  w Payloadzie kasuje token przy każdym `update` ustawiającym `_verified`.
- **„Wyślij link ponownie”** — w trzech miejscach: po poprawnym haśle na
  niepotwierdzonym koncie (Payload mówi o tym dopiero PO sprawdzeniu hasła),
  na stronie wygasłego linku i na `/konto/wyslij-link` (link „Nie dotarł
  mail z potwierdzeniem?” pod logowaniem i w potwierdzeniu rejestracji —
  sam przycisk po haśle okazał się niewidoczny). Odpowiedź jest zawsze taka
  sama, z kontem czy bez. Każda wysyłka nadaje NOWY token, więc działa tylko najnowszy link.
  Adres JUŻ potwierdzony dostaje zamiast linku mail „Masz już konto” (wariant
  `reason: 'resend'`) — do 10.10.2026 nie dostawał nic, a strona mówiła
  „wysłaliśmy” (zgłoszone przy testach).
  Token zapisujemy przez `payload.db.updateOne`, bo pole
  `_verificationToken` w Payloadzie odrzuca każdą aktualizację.
  Przyjęte świadomie: wysyłka działa na sam adres, bez hasła. Link
  idzie wyłącznie do skrzynki właściciela adresu, więc jedyny skutek to
  unieważnienie jego starszego linku; zasypywanie mailami tnie limit nginx.
- **Maile o koncie wysyłamy SAMI** (`lib/accountEmails.ts`), Payload daje
  tylko token (`disableVerificationEmail`, `disableEmail`). Jego wysyłka idzie
  bez wersji tekstowej, a pierwszy prawdziwy mail potwierdzający trafił do
  spamu (02.10.2026). Hooki maili w kolekcji zostają dla REST-owych ścieżek
  Payloada, których strona nie używa.
- **Niepotwierdzone konto jest usuwane po 7 dniach** (ustalone 02.10.2026,
  `UNVERIFIED_ACCOUNT_DAYS` w `lib/expiry.ts`), liczonych od OSTATNIEGO
  wysłanego linku, nie od założenia — kto prosi o nowy link szóstego dnia,
  nie straci konta, zanim link wygaśnie. Sprzątanie startuje z
  `src/instrumentation.ts` (raz przy starcie serwera Next): minutę po
  starcie, potem co 24 h. **Nie przez kolejkę zadań Payloada**: jej cron
  rusza dopiero po pierwszym `getPayload({ cron: true })` (np. logowanie do
  panelu), więc po restarcie czekałby na ruch, a dokłada tabelę, migrację
  i endpointy. Przy kilku instancjach aplikacji każda sprzątałaby osobno —
  nieszkodliwie, ale do zmiany, gdyby kiedyś było ich więcej. Ustawienie hasła z maila
  **oznacza adres jako potwierdzony** — Payload sam tego nie robi
  (`auth/operations/resetPassword.js`), a bez tego konto założone przy
  zapisie (etap 2) nigdy by się nie zalogowało.
- **Linki w mailach z `PUBLIC_URL`**, nie z nagłówka Host (podrobiony Host
  = obca domena w linku z kodem do zmiany hasła) ani z `SITE_URL` (domena
  docelowa, do przełączenia prowadzi na starą stronę). Zmienna jest czytana
  przy uruchomieniu — przełączenie domeny to zmiana w `deploy/.env`.
  „Otwórz w panelu” w mailu o wiadomości z formularza brał `SITE_URL`
  i prowadził na 404 starej strony (14.10.2026) — `email/links.test.ts`
  pilnuje, że żaden link do `/admin` nie powstaje z `SITE_URL`.
- **`/api/customers/first-register` zablokowany w nginx** (404). Payload
  wystawia go dla każdej kolekcji z logowaniem i dopóki tabela jest pusta,
  zakłada przez niego konto z pominięciem reguł, od razu potwierdzone.
  Lokalnie (bez nginx) endpoint działa — nie testuj na nim niczego.
- **Limity w nginx:** endpointy kursantów przyjmujące sekret — strefa
  `login`; WYSŁANIA formularzy na `/logowanie`, `/rejestracja`, `/konto/…` —
  strefa `account_forms` (10/min; GET nie jest liczony). Bez tego rejestracja
  i reset hasła byłyby darmową wysyłką maili na dowolny adres z naszej domeny.
- **Panel i strona dzielą ciasteczko** `payload-token` (jeden
  `cookiePrefix`). Zalogowanie się jako kursant w tej samej przeglądarce
  wylogowuje z panelu i odwrotnie. Dla strony konto panelu to „nie kursant”
  (`getCurrentCustomer()` w `lib/auth.ts`). Do testów — dwie przeglądarki
  albo okno prywatne.
- **Nagłówek pyta `/api/customers/me` z przeglądarki** (`useAccount.ts`),
  przy każdej zmianie strony. Odczyt ciasteczka w layoucie zrobiłby każdą
  stronę dynamiczną i zabił cache (`revalidate = 300`). Bez JS: zawsze
  „Zaloguj się” — a `/logowanie` przekierowuje zalogowanych dalej.
- **⚠️ Błędy Payloada rozpoznajemy po `status`, nigdy przez `instanceof`**
  (`lib/authErrors.ts`, od 18.10.2026). W zbudowanej aplikacji formularz
  wysłany ZANIM załaduje się JavaScript strony trafia do innego fragmentu
  serwera, z własną kopią klas błędów — `instanceof AuthenticationError`
  dawało `false` dla złego hasła: logowanie mówiło „Nie udało się
  zalogować”, a „Usuń konto” ogólny błąd zamiast „Nieprawidłowe hasło”.
  W `next dev` i po załadowaniu JS jest jedna kopia, więc zwykłe klikanie
  tego nie pokazuje. Sprawdzanie: `next build`, serwer z `.next/standalone`
  i formularz wysłany bez JS (albo przed jego załadowaniem).
  **Druga strona tego samego: nazwa klasy błędu bywa PUSTA** (od 18.10.2026,
  `lib/errorResponse.ts`, globalny hook `afterError`). Payload zostawia
  komunikat błędu tylko, gdy błąd ma `name`, a `APIError` bierze ją z nazwy
  klasy — obraz z CI zminifikował ją do pustej. Usunięcie terminu z zapisami
  pokazywało „An unknown error occurred.” zamiast naszej odmowy; lokalny
  build nazwał klasę „k” i działał. Hook przywraca komunikat błędu
  jawnego (`isPublic` albo status ≠ 500), tylko gdy Payload odpowiedział tym
  ogólnym tekstem. Nie odtworzysz tego lokalnie buildem — sprawdzenie:
  błąd z `name = ''` rzucony z hooka kolekcji.
- **Wylogowanie przez `/api/customers/logout`**, nie przez skasowanie
  ciasteczka: endpoint unieważnia też sesję (`auth.useSessions`).
- **Strony kont mają `noindex`** i nie ma ich w mapie strony.
- **Telefon obowiązkowy, w formacie Next Step Pro**: `+` kierunkowy i 9 cyfr
  (`^\+[0-9]{1,4}[0-9]{9}$`, ten sam wzór co tam). Spacje, myślniki
  i nawiasy usuwamy PRZED sprawdzeniem (`normalizePhone`) i tak zapisujemy.
  Wzór pilnuje kształtu (10–13 cyfr), nie istnienia numeru.
- **Formularze odsyłają wpisane wartości przy błędzie** (`values` w stanie
  akcji, `defaultValue` w polach). React 19 czyści formularz po KAŻDEJ akcji,
  także nieudanej — bez tego jeden błąd kasował całą rejestrację, a „popraw
  zaznaczone pola” wskazywało puste pola (zgłoszone 02.10.2026). Dotyczy też
  formularza kontaktowego i newslettera. Hasła nigdy nie wracają — dlatego
  rejestracja, zapis na kurs i nowe hasło mają `onSubmit={stopInvalidSubmit}`
  (`AccountFields.tsx`, od 10.10.2026): błąd, który przeglądarka zna (brak
  zgody, złe pole wg tych samych reguł — `TextField` przepisuje je do
  `setCustomValidity`), zatrzymuje wysyłkę, zanim dotrze do serwera. Wcześniej
  zapomniana zgoda kasowała wpisane hasło. Serwer i tak sprawdza wszystko.
- **Walidacja na żywo w formularzach kont** (`components/AccountFields.tsx`),
  ustalone 02.10.2026: pole czerwienieje dopiero po WYJŚCIU z niego z błędem,
  potem zmienia się przy każdej literze, aż przejdzie (zielony znaczek);
  **puste pole po wyjściu NIE czerwienieje** (od 16.10.2026) — dopiero przy
  wysłaniu albo gdy coś w nim było. Komunikat pod polem przesuwał linki
  niżej o linię: Safari ustawia kursor w polu e-mail logowania, a klik
  w „Nie pamiętam hasła” trafiał w puste miejsce (zgłoszone przy testach);
  hasło ma licznik od pierwszej litery. Reguły to te same funkcje, które
  sprawdza serwer (`checkName`, `checkEmail`, `checkPhone`,
  `checkNewPassword` w `lib/validation.ts`) — przeglądarka tylko mówi
  wcześniej, decyduje serwer. Kolor błędu to token `error` (#b42318,
  6,5:1 na białym), nie `rope` — niebieska ramka czyta się jak „aktywne
  pole”. Imię i nazwisko: co najmniej 2 litery, bo istnieją nazwiska Li, Wu.
- **Hasło: minimum 10 znaków, bez reguł składu** (NIST 800-63B). Podpowiedź
  pod polem zachęca do hasła, którego nie ma się nigdzie indziej — nie do
  „kilku zwykłych słów” (to czytało się jak zachęta do słabego hasła). Logowanie
  sprawdza tylko obecność pól — reguły długości przy logowaniu zdradzałyby,
  jakich haseł nie ma.
- **„Twoje dane” w Moim koncie** (od 18.10.2026, `DetailsForm`,
  `updateAccountDetails`, `lib/accountDetails.ts`): imię, nazwisko, telefon —
  te same reguły co przy rejestracji. „Zapisz” nieaktywny, dopóki pola nie
  różnią się od zapisanych (`sameAccountDetails` — jak serwer: bez spacji
  w telefonie). Zmiana idzie też do NADCHODZĄCYCH,
  nieodwołanych zapisów osoby (decyzja Mateusza: szkoła ma dzwonić pod
  działający numer); minione i odwołane zostają kopią z dnia zapisu. Bez
  przeliczania miejsc i bez maili (`skipRecount`, `skipStatusEmail`).
  **Adresu e-mail tu nie ma** — zmiana wymaga potwierdzenia NOWEGO adresu
  mailem, inaczej literówka odcina od konta; na razie przez szkołę.
- **„Usuń konto” w Moim koncie** (`/konto/usun`, od 04.10.2026). Wymaga
  hasła ponownie — otwarta sesja na cudzym komputerze nie wystarcza. Kasuje
  konto i jego sesje; **zapisy zostają w szkole**, odpięte od konta (pole
  `customer` jest opcjonalne, więc klucz obcy ustawia je na null —
  sprawdzone 04.10.2026). To osobny cel przetwarzania (organizacja kursu,
  rozliczenia) z własną zgodą; strona mówi o tym przed usunięciem, a
  nadchodzący zapis wymienia z nazwy — usunięcie konta go NIE odwołuje.
  Pełne usunięcie zapisów to prośba do szkoły, zależna od okresów
  przechowywania (do ustalenia z Krzyśkiem). Po usunięciu idzie mail
  z potwierdzeniem. Założenie konta na ten sam adres później znów
  podepnie stare zapisy (`claimBookings`) — to ta sama, udowodniona osoba.
- **„Dane osoby — kopia albo usunięcie”** (nad listą „Uczestnicy”,
  `ErasePersonPanel`, `lib/personErasure.ts`, od 10.10.2026) — prośby z RODO
  załatwiane przez szkołę bez programisty. **Kopia** (`/api/customers/person-data`):
  domyślnie czytelny dokument HTML po polsku (`lib/personDataDocument.ts`, od
  12.10.2026 — JSON z nazwami pól nie nadawał się do wysłania osobie; otwiera
  się w przeglądarce, drukuje do PDF), `?format=json` — ten sam zestaw do
  przeniesienia danych. Oba ze wszystkiego, co mamy pod adresem, z LISTY DOZWOLONYCH pól —
  konto ma też hash hasła, sól, sesje i tokeny, wpis w newsletterze token
  wypisania; to klucze, nie dane osoby, i nie mogą wyjść w pliku wysłanym
  mailem (test to pilnuje). **Usunięcie:** Po adresie e-mail (bez względu na wielkość
  liter, porównanie dokładne) usuwa konto, zapisy (także bez konta), wiadomości,
  wpis w newsletterze i wiersze odbiorców wysłanych wiadomości — tej tabeli
  panel nie pokazuje. Dwa kroki: podgląd (GET), potem usunięcie (POST) dopiero
  z adresem przepisanym drugi raz — sprawdza to też serwer. W logu jest kto
  i ile, nigdy czyj adres. Konta panelu (`users`) nie są ruszane. Tekst
  o kopiach („znikną po 40 dniach”) powtarza retencję z `abc-backup.sh`.
- **Dzieci (zapisy na obozy)** — patrz „Zapisy na obozy”. Konto zapisuje
  rodzica; dzieci są w jego zapisach, bez osobnych kont.

### Konta panelu (`users`)

Wszystkie równorzędne — bez ról (każde może zmienić i usunąć każde inne).
Role dopiero, gdy dojdzie osoba z mniejszym dostępem.

- **Mail po zmianie hasła albo adresu konta panelu** (od 13.10.2026, hooki
  w `Users.ts`, szablon `panelAccountChangedEmail`). „Zmień hasło” w Payloadzie
  NIE pyta o obecne hasło, więc panel otwarty na cudzym komputerze wystarcza
  do przejęcia konta — mail mówi właścicielowi kiedy i z którego konta,
  a odsyła do „Nie pamiętasz hasła?” (link idzie do JEGO skrzynki). Przy
  zmianie adresu mail idzie na stary i nowy i NIE odsyła do resetu (link
  poszedłby na nowy adres, po przejęciu — cudzy), tylko do Mateusza.
  Hasło widać tylko w `beforeChange` (potem Payload je hashuje i usuwa
  z danych), stąd znacznik w `req.context` po id. Reset z linku nie woła
  hooków `update` — bez maila. Pytanie o obecne hasło odłożone: wymaga
  własnego widoku w panelu.

---

## Zapisy na kursy

Od 03.10.2026 (etap 2, ZAKRES 4b). Formularz `/kursy/[slug]/zapis`,
kolekcja `Bookings`, logika w `lib/bookings.ts` (czyste funkcje)
i `lib/bookingEffects.ts` (skutki uboczne).

- **Jedna osoba = jeden zapis.** Para zapisuje się dwa razy — Krzysiek ma
  nazwisko każdego uczestnika (lista, ubezpieczenie).
- **Wolne miejsca LICZONE, gdy termin ma liczbę miejsc**: pojemność minus
  zapisy aktywne (`ACTIVE_STATUSES` — bez „lista rezerwowa” i „rezygnacja”).
  Każda zmiana zapisu i zmiana pojemności przelicza termin, a status
  `open` ↔ `waitlist` przełącza się sam. **Bez liczby miejsc** nic się nie
  liczy, decyduje status ustawiony ręcznie. Zapis telefoniczny liczy się,
  gdy Krzysiek doda go ręcznie w „Zapisach” (bez maili — umówiony osobiście).
- **E-mail w zapisie opcjonalny — tylko w panelu** (od 12.10.2026): zapis
  telefoniczny bez adresu. Formularz na stronie wymaga go dalej
  (`validateBooking`). Puste pole zapisuje się jako `null`. Bez adresu nie
  idzie nic: mail o statusie (i nie jest to „mail, który nie doszedł”),
  wysyłki (`dedupeRecipients` pomija pusty adres); w mailu o zwolnionym
  miejscu osoba stoi z imieniem i telefonem. „Dane osoby” szukają po adresie,
  więc takiego zapisu nie znajdą — usuwa się go z listy „Zapisy”.
- **Dane kontaktowe w zapisie to KOPIA** z chwili zapisu, także przy koncie.
  Adres e-mail zapisuje się małymi literami (hook w `Bookings.ts`), bo
  przypisanie do konta i kontrola duplikatów porównują dokładnie.
- **Zapis bez konta trafia na konto dopiero po DOWODZIE adresu**
  (`claimBookings`: logowanie, potwierdzenie adresu, hasło z maila) — nigdy
  z formularza. „Załóż mi konto” przy zapisie tworzy konto od razu
  (zapis do niego przypięty) i wysyła link do ustawienia hasła; konto bez
  ustawionego hasła znika po 7 dniach jak każde niepotwierdzone.
- **⚠️ Zapis idzie w TRANSAKCJI z blokadą na termin** (`lib/bookingService.ts`,
  `pg_advisory_xact_lock`). Zmierzone 03.10.2026 bez blokady: pięć osób
  naraz na jedno miejsce — wszystkie dostały miejsce; podwójne kliknięcie —
  dwa zapisy. Z blokadą: jedna osoba dostaje miejsce, cztery listę
  rezerwową; pięć kliknięć — jeden zapis. Druga blokada (na adres) chroni
  zakładanie konta, gdy ta sama osoba zapisuje się na dwa terminy naraz.
  **Nie przenoś liczenia miejsc ani zapisu poza tę transakcję.**
- **Drugi zapis tej samej osoby na ten sam termin** odpowiada „przyjęte”
  bez nowego wpisu — inna odpowiedź mówiłaby, kto się zapisał. Z tego
  samego powodu przy „załóż mi konto” komunikat jest jeden, czy konto było
  nowe, czy czekało na potwierdzenie (wtedy idzie nowy link potwierdzający).
  **Powtórzony zapis z „Załóż mi konto”** (od 17.10.2026; wcześniej zaznaczenie
  ginęło, a strona obiecywała mail): zapis zostaje jeden, ale konto powstaje —
  z danych PIERWSZEGO zapisu, nie z nowego formularza (decyzja Mateusza) —
  i idzie link do hasła; zapis przypina ustawienie hasła (`claimBookings`).
  Pierwszy zapis już z kontem (podwójne kliknięcie z zaznaczeniem) — nic,
  żeby nie poszedł drugi mail.
- **Miniony termin sam przechodzi na „zakończony”** (od 12.10.2026,
  `finishPastSessions` w dziennym sprzątaniu, `finishedSessionsWhere`):
  tylko „zapisy otwarte” i „lista rezerwowa”, „odwołany” zostaje. Granica to
  początek WCZORAJ w UTC — ostatni dzień bywa zapisany jako północ UTC albo
  polska (22:00–23:00 UTC dzień wcześniej), więc termin nigdy nie kończy się
  w swoim ostatnim dniu, najpóźniej dwa dni po. Strona, pulpit i „Moje
  konto” i tak patrzą na daty — to porządek listy terminów w panelu.
- **Terminu z zapisami nie da się usunąć** (hook `beforeDelete` w
  `Sessions.ts`): Postgres i tak odmawia (pole `session` jest wymagane),
  ale komunikatem „Failed query”; teraz panel mówi, żeby ustawić status
  „odwołany” / „zakończony”.
- **Zwolnione miejsce przy liście rezerwowej → mail do Krzyśka** z kolejką
  (rezygnacja, usunięty zapis, większa pojemność). Nikt nie jest
  przesuwany automatycznie — Krzysiek może chcieć najpierw zadzwonić.
- **Sesja wygasła w trakcie wypełniania** (formularz bez pól kontaktowych):
  akcja odpowiada „zaloguj się ponownie” zamiast żądać niewidocznych pól.
- **Czego zapis NIE robi (świadomie, na później):** odwołanie albo zmiana
  dat terminu nie powiadamia zapisanych (to wysyłki, etap 5); podpis
  zapisu w panelu nie odświeża się po zmianie dat terminu.
- **Maile**: po zapisie do kursanta (przyjęte / lista rezerwowa, bez kwot —
  zasady zaliczek są do ustalenia) i do Krzyśka; przy zmianie statusu
  w panelu na potwierdzony / opłacony / rezygnacja — do kursanta
  (`statusEmailFor`). Każdy mail osobno po zapisie, błąd nie cofa zapisu.
- **„Opłacony” wysyła maila tylko PRZED pierwszym dniem kursu** (od
  14.10.2026, `courseStarted` — dzień w czasie polskim). Większość płaci
  gotówką pierwszego dnia, a Krzysiek zaznacza to w trakcie albo po kursie —
  „Płatność zaksięgowana” po kursie dziwiła. Status kursant widzi w „Moim
  koncie”. Hook zapisu doczytuje termin (`joins: false`); nieudany odczyt =
  mail jak dawniej. Lista w panelu ładuje wiersze bez terminu (`depth: 0`),
  więc jej pytanie przy „opłacony” mówi „jeśli kurs jeszcze się nie zaczął”.
- **Mail do kursanta, który nie wyszedł, zostaje odnotowany w zapisie**
  (`recordEmailIssue`, od 03.10.2026): pola „Mail, który nie doszedł” (co
  i dlaczego, po ludzku — `emailFailureReason`), data i „Załatwione”; kafelek
  na pulpicie liczy nieodhaczone. Te maile NIE mają kolejki ani ponowień —
  Krzysiek odzywa się sam. Kolejny błąd przy nieodhaczonym dopisuje się, po
  odhaczeniu zaczyna od nowa. Zapis z hooka idzie przez `req` zapisu w toku:
  wiersz jest zablokowany jego transakcją, zapis innym połączeniem czekałby
  w nieskończoność. Kontekst `skipRecount` + `skipStatusEmail`.
- **⚠️ Pole `bookings` (join) w `Sessions` niesie dane osobowe.** Strona czyta
  terminy przez Local API z pominięciem reguł, więc KAŻDE zapytanie o
  terminy w kodzie strony ma `joins: false` (`lib/content.ts`, „Moje
  konto”, `bookingEffects`). Sprawdzone 03.10.2026: REST terminu nie pokazuje
  zapisów anonimowi ani innemu kursantowi, kod stron ich nie zawiera.
- Limit nginx `account_forms` obejmuje też POST na `/kursy/*/zapis` i `/obozy/*/zapis`.

---

## Zapisy na obozy

Od 19.10.2026 (etap 4, ZAKRES pkt 2), gałąź `feat/camp-bookings`, w budowie.
Procedura Krzyśka (20.10.2026): (1) krótki zapis rezerwuje miejsce, (2) mail
z linkiem do formularza rejestracyjnego, (3) po formularzu umowa do podpisania
i dane do przelewu — od tego maila 7 dni na zaliczkę 500 zł, reszta do dnia
rozpoczęcia, (4) ok. 2 tygodnie przed obozem pakiet informacji i pusta karta
kwalifikacyjna w PDF (karta zostaje papierowa — wzór Kuratorium). Pełny zwrot
do 30 dni przed obozem. Cała ścieżka działa bez konta; konto dla chętnych.

- **Jedna kolekcja `bookings` dla kursów i obozów** (decyzja 19.10.2026),
  rozróżniana polem `kind` (`course` / `camp`). Liczenie miejsc, lista
  rezerwowa, wysyłki, „Dane osoby”, anonimizacja i pulpit działają na tej
  jednej — druga kolekcja znaczyłaby zbudowanie i przetestowanie każdej
  z tych rzeczy drugi raz. W menu panelu dwie pozycje, „Zapisy na kursy”
  i „Zapisy na obozy” (`BookingsNavLinks`, ta sama lista z `?where[kind]`),
  bo szkoła sprawdza jedno albo drugie. Własny link Payloada „Zapisy” jest
  ukryty w `custom.css` (`#nav-bookings`), nie przez `admin.hidden` — to
  wyłączyłoby też trasy listy. Przy podbiciu Payloada sprawdzić, czy link
  wciąż ma ten `id`.
- **Przy obozie imię, nazwisko i kontakt to RODZIC**, uczestnik to dziecko
  (`childFirstName`, `childLastName` — wymagane tylko przy `kind = camp`;
  `childBirthDate` przychodzi z formularza rejestracyjnego). Etykieta zapisu
  bierze imię dziecka. Jedno dziecko = jeden zapis (jak „jedna osoba = jeden
  zapis”).
- **Zapis na stronie: `/obozy/[slug]/zapis`** (krok 1), tylko dla obozu
  (`camps.kind = camp`) — wyjazd i zajęcia przekierowują na `/kontakt`, bo
  przycisk „Zapisz się” w nagłówku nie odróżni ich po adresie. Rodzic wpisuje
  turnus, siebie i jedno albo kilkoro dzieci (`MAX_CHILDREN`); każde dziecko
  to osobny zapis w TEJ SAMEJ transakcji z blokadą co kurs
  (`createCampBookings`) — dzieci liczone po kolei, więc przy braku miejsc
  pierwsze dostaje miejsce, następne listę rezerwową.
- **Rodzeństwo dzieli adres**, więc duplikat przy obozie to adres + imię
  i nazwisko dziecka (`childKey`, bez wielkości liter i nadmiarowych spacji),
  nie sam adres jak przy kursie. Powtórzony zapis tych samych dzieci
  odpowiada tak samo jak pierwszy, bez nowych wpisów i maili.
- **Link do formularza rejestracyjnego**: każdy nowy zapis dostaje
  `registrationToken` (pole `hidden` — nie ma go w panelu ani w żadnej
  odpowiedzi API; Local API czyta je tylko z `showHiddenFields`). Dziecko
  z listy rezerwowej linku nie dostaje. Mail do rodzica idzie OSOBNO na każde
  dziecko (jeden przycisk na mail), do szkoły — jeden na zgłoszenie.
- **Maile obozowe przez `CAMP_EMAIL`** (`obozy@abcwspinania.info`, decyzja
  20.10.2026): powiadomienie o zapisie idzie tam, a mail do rodzica ma tam
  `replyTo` — tam wracają odpowiedzi i podpisane umowy. Puste = jak
  `ADMIN_NOTIFY_EMAIL`. Nadawca zostaje `EMAIL_FROM`, dopóki domena szkoły
  nie jest uwierzytelniona w Brevo. **Na czas testów `CAMP_EMAIL` zostaje
  PUSTY** (lokalnie i na produkcji) — maile obozowe idą wtedy, jak przy
  kursach, na `ADMIN_NOTIFY_EMAIL` (Gmail Mateusza, filtr przekazuje
  Krzyśkowi). `obozy@` wpisuje się w `deploy/.env` w dniu startu zapisów.
- **Termin musi pasować do rodzaju**: `filterOptions` pokazuje w panelu tylko
  terminy danego rodzaju, a `validate` (`sessionMatchesKind`) pilnuje tego przy
  zapisie — zastępuje sprawdzenie Payloada, którego komunikat brzmiał
  „nieprawidłowe wybory: 1”. Termin, którego kurs albo obóz usunięto (pole
  wyczyszczone przez Postgres), pasuje do każdego rodzaju — inaczej żadnego
  jego zapisu nie dałoby się już zapisać, nawet zmiany statusu. Migracja
  `bookings_camp_kind` przestawia na
  `camp` zapisy dodane wcześniej ręcznie na terminach obozów (ręczny `UPDATE`
  — nie kasować przy sklejaniu migracji).
- **Zgoda na zdjęcia dziecka — opcjonalna** (`photoConsent` + treść
  w `photoConsentText`). Odznaczenie w panelu = wycofanie zgody.
- **Formularz rejestracyjny (krok 2): `/obozy/rejestracja?token=…`**, bez
  konta — kluczem jest `registrationToken` z maila. PESEL (data urodzenia
  liczona z niego, `lib/pesel.ts`, idzie do zapisu), wzrost, uczulenia, leki,
  dieta, choroby, zgoda na zajęcia (wymagana), zgoda na zdjęcia
  (opcjonalna), „chcę fakturę”, zgoda RODO na dane i zdrowie dziecka. Działa
  do dnia rozpoczęcia obozu — rodzic wraca tym samym linkiem i poprawia
  (leki w lutym vs w lipcu); zamknięty dla listy rezerwowej i rezygnacji.
  Logika: `lib/campRegistration.ts`.
- **PESEL i zdrowie w osobnej kolekcji `camp-registrations`** (czyta tylko
  szkoła): usuwane same miesiąc po obozie (`CAMP_HEALTH_RETENTION_MONTHS`,
  dzienne sprzątanie, `expiredRegistrationsWhere`), a zapis zostaje 5 lat.
  Zdanie o miesiącu stoi też w klauzuli zgody i musi stanąć w polityce
  prywatności. **Usunięcie zapisu kasuje jego formularz** (hook
  `beforeDelete` w `Bookings`) — inaczej Postgres odmówi (wymagane `booking`),
  a zdrowie przeżyłoby zapis; obejmuje to panel i „Dane osoby”. Kopia danych
  osoby zawiera formularz przy jego zapisie.
- **Maile formularza bez danych o zdrowiu** — ani do rodzica, ani do szkoły
  (Brevo i lata w skrzynce). Szkoła dostaje „wypełniony / poprawiony” z
  linkiem do panelu.
- **Link do formularza poza pierwszym mailem**: dziecko przeniesione z listy
  rezerwowej na miejsce dostaje go samo (hook `afterChange`), a „Wyślij
  rodzicowi link” w panelu zapisu (`RegistrationPanel`, endpoint
  `/api/bookings/:id/registration-link`) — przy zapisie dodanym ręcznie albo
  zgubionym mailu. Token zostaje ten sam. Przypomnienie raz, po
  `REGISTRATION_REMINDER_DAYS` (4) bez formularza.
- **Zaliczka (krok 3, bez umowy na razie)**: kwota, konto, tytuł przelewu
  i zasada zwrotu w jednym miejscu — `lib/campPayment.ts` (zmiana kwoty albo
  konta = jedna edycja). Pierwsze wypełnienie formularza ustawia
  `depositDueAt` na `DEPOSIT_DAYS` (7) i wysyła rodzicowi dane do przelewu;
  poprawka formularza terminu nie przesuwa (szkoła może go przesunąć ręcznie
  w panelu). Po terminie bez zaliczki — jedno przypomnienie
  (`depositReminderWhere`), miejsce NIE jest zwalniane (decyzja Krzyśka).
  Wpłatę zaznacza Krzysiek statusem „zaliczka wpłacona” — przy obozie to
  wysyła maila „zostało X zł” (`statusEmailForKind`; przy kursie zaliczka
  dalej bez maila). Kwota pozostała = cena turnusu albo obozu minus 500 zł;
  bez ceny w panelu mail nie podaje kwoty, zamiast podać złą.
- **Maile o statusie zapisu obozowego mówią o obozie i dziecku**
  (`campStatusEmail`), nie o kursie, i mają `replyTo` na `CAMP_EMAIL`.
- **Testy integracyjne nie wołają przez HTTP niczego, co wysyła mail** —
  serwer deweloperski ma prawdziwy klucz Brevo. „Wyślij link” sprawdza się
  w procesie testów (`registrationLinkHandler`), przez HTTP tylko odmowę.
- Nowe pola osoby trafiają w trzy miejsca naraz: anonimizacja
  (`anonymizeExpiredBookings`), kopia danych (`personErasure.ts`, lista
  dozwolonych pól) i jej dokument (`personDataDocument.ts`).

## Panel szkoły — pulpit, szybki status, eksport

Od 03.10.2026 (etap 3). Własne elementy panelu w `src/components/admin/`,
podpięte ścieżkami w configu — **po dodaniu albo przeniesieniu któregoś:
`npm run generate:importmap`** (plik `importMap.js` jest generowany,
zasada 25), inaczej panel nie znajdzie komponentu.

- **Pulpit „Do zrobienia”** (`SchoolDashboard`, `admin.components.
  beforeDashboard`): nowe zgłoszenia, potwierdzone (czekają na zaliczkę),
  lista rezerwowa, maile, które nie doszły, nowe wiadomości — każda liczba to link do listy
  przefiltrowanej przez `?where[...]` w adresie; pod spodem 12 najbliższych
  terminów z obłożeniem „zajęte / limit” i linkami do zapisanych i Excela.
- **„Pulpit” na górze menu panelu** (`DashboardNavLink`,
  `admin.components.beforeNavLinks`, od 18.10.2026). Payload wraca na pulpit
  tylko przez małe logo nad tytułem strony (dymek „Panel”), a jego menu nie
  ma takiej pozycji — kto pierwszy raz otworzył „Zapisy”, nie wiedział, jak
  wrócić do „Do zrobienia”. Znaczniki i klasy jak w linkach Payloada
  (`nav__link`), więc przy jego podbiciu sprawdzić, czy menu ich nie zmieniło.
  Logo w rogu zostaje Payloada: własne `graphics.Icon` rysuje też obrazek
  podglądu `/api/og`, gdzie obrazek z adresu względnego się nie wczyta.
- **Status jako lista rozwijana na liście zapisów** (`BookingStatusCell`).
  Zapisuje przez REST, więc działa wszystko, co idzie za zmianą statusu
  (mail, przeliczenie miejsc). Status wysyłający kursantowi maila pyta
  najpierw — klik w zły wiersz nie może wysłać „zapis anulowany”. To samo dla
  wiadomości z formularza (`MessageStatusCell`, od 10.10.2026: nowa → w toku →
  załatwiona jednym kliknięciem, bez pytania — nikt nie dostaje maila). Wspólny
  komponent: `StatusSelectCell`.
- **Eksport uczestników terminu** — `GET /api/sessions/:id/export`
  (`lib/sessionExport.ts`), przycisk na stronie terminu. Tylko konto szkoły.
  CSV pod POLSKIEGO Excela (`lib/csv.ts`): BOM (inaczej „Å»aneta”), średnik,
  komórki zaczynające się od `= + - @` z apostrofem (formuła wpisana
  w formularz nie wykona się u Krzyśka), telefon jako `="+48 600 …"` (bez
  tego Excel robi z niego liczbę bez plusa).
- **`@payloadcms/ui` tylko jako JAWNA zależność** (od 12.10.2026 w
  `package.json`, przypięta co do numeru jak reszta Payloada, grupa `payload`
  w Dependabocie). Do tego dnia była wyłącznie zależnością Payloada i import
  działałby przypadkiem. Weszła dla `useFormModified` w panelu wysyłek; gdzie
  wystarcza adres (id terminu w eksporcie), zostaje adres.

---

## Wysyłki i newsletter

Od 03.10.2026 (etap 5). Kolekcja `Broadcasts` („Wysyłki”, grupa „Zapisy”),
logika w `lib/broadcasts.ts` (czyste funkcje) i `lib/broadcastSender.ts`
(odbiorcy, kolejka, endpointy), newsletter w `lib/newsletter.ts`.

- **Trzy grupy odbiorców:** zapisani na jeden termin, wszyscy z nadchodzącymi
  zapisami (termin od dziś, status `open`/`waitlist`), newsletter (tylko
  `subscribed`). Domyślnie osoby z miejscem (`ACTIVE_STATUSES`); lista
  rezerwowa po zaznaczeniu „Także lista rezerwowa” (decyzja 03.10.2026).
  Jeden mail na adres — para z jednym adresem dostaje jeden.
- **Lista odbiorców USTALANA w chwili „Wyślij”** — wiersz w
  `broadcast-deliveries` na adres, w transakcji z blokadą na wysyłkę
  (`pg_advisory_xact_lock(7303, id)`). Zmierzone 03.10.2026: dwa kliknięcia
  naraz — jedno 200, drugie 409, dwa wiersze, nie cztery.
- **Wysyła zegar w procesie serwera** (`instrumentation.ts`, co 20 s, 20
  maili na takt), nie kolejka zadań Payloada — powód jak przy sprzątaniu
  kont. Każdy wiersz oznaczany jako wysłany dopiero PO przyjęciu przez Brevo;
  przyjęte ryzyko: awaria dokładnie między tymi krokami wyśle jeden mail
  dwa razy. **Zegar startuje tylko przy starcie serwera** — po zmianie
  w `instrumentation.ts` lokalnie trzeba zrestartować `npm run dev`.
- **Jeden takt kolejki naraz — dwie blokady.** Flaga na `globalThis`
  (zegar i endpoint „Wyślij” Next pakuje osobno; flaga w module dawała
  dwie kopie i — zmierzone 04.10.2026 — 20 maili do 10 adresów) oraz
  `pg_try_advisory_xact_lock(7304)` na cały takt, wspólny dla WSZYSTKICH
  procesów: drugiej instancji albo testów integracyjnych kolejkujących do
  bazy, nad którą tyka serwer deweloperski z prawdziwym kluczem Brevo.
- **Jedna zepsuta wysyłka nie może zatrzymać kolejki.** Znalezione
  05.10.2026: wysyłka „w trakcie”, której termin usunięto (Postgres
  wyczyścił pole), nie przechodziła walidacji „Wybierz termin” przy zapisie
  własnych liczników — każdy takt padał, a z nim wszystkie wysyłki za nią.
  Teraz termin jest wymagany tylko w szkicu, każda wysyłka w takcie ma
  własny `catch`, a bez terminu notka pod mailem jest ogólna.
- **Błędy wysyłki** (`classifySendError`): dzienny limit Brevo (401/402/403/429,
  „credit/limit/quota”) albo odrzucony klucz WSTRZYMUJĄ wysyłkę na godzinę
  i wznawiają ją same; odrzucony adres — błąd tylko tego wiersza; sieć i 5xx
  — ponowienie za 10 min, do 5 prób. Darmowy plan Brevo = 300 maili dziennie
  łącznie ze wszystkimi innymi mailami strony.
- **„Wyślij” i „Wyślij próbnie” wyłączone przy niezapisanych zmianach**
  (od 12.10.2026, `BroadcastPanel`, `useFormModified`): endpointy czytają
  ZAPISANĄ wersję, więc dopisana i niezapisana wersja angielska wychodziła
  bez niej (zgłoszone przy testach). Edytor treści zgłasza zmianę dopiero,
  gdy przeglądarka jest bezczynna (do 500 ms) — dlatego po kliknięciu panel
  czeka 700 ms i sprawdza jeszcze raz. Sprawdzone w przeglądarce: kliknięcie
  zaraz po wpisaniu kończy się „Nic nie wysłano”.
- **Kopia z „Zduplikuj” nie wychodzi bez przejrzenia** (od 12.10.2026,
  pole `copyUnreviewed`): Payload zapisuje kopię od razu, więc jedno
  „Wyślij” wysyłało tę samą wiadomość drugi raz (zgłoszone przy testach).
  Hook `beforeChange` kolekcji rozpoznaje kopię po `originalDoc` przy
  `create` (Payload podaje tam oryginał — BEZ id, usuwa je przed hookami;
  przy zwykłym tworzeniu pusty obiekt); pierwszy zapis albo „Sprawdzone”
  w panelu (bo „Zapisz” Payloada jest wyłączone na formularzu bez zmian)
  zdejmuje znacznik. `sendHandler` odmawia też sam (409). Próbna wysyłka
  kopii działa.
- **Wysłanej wiadomości nie da się zmienić** (pola z `access.update` tylko dla
  szkicu + hook `beforeChange`) — ma zostać to, co ludzie dostali. „Zduplikuj” (menu ⋮)
  daje szkic z wyzerowanymi licznikami (`beforeDuplicate`).
- **Treść z edytora → mail przez NASZ konwerter** (`lib/email/richText.ts`),
  nie `@payloadcms/richtext-lexical/html`: style inline (Outlook), każdy tekst
  przez `escapeHtml`, linki tylko `http(s)`/`mailto`/`tel`. Edytor wysyłek ma
  okrojone funkcje (bez obrazków, tabel, linków do dokumentów panelu).
  `layout.ts` przyjmuje gotowy `body` WYŁĄCZNIE z tego konwertera.
- **Wersja angielska opcjonalna** — idzie do osób z `language = en`, gdy ma
  i temat, i treść; inaczej polska. Panel ostrzega przed „Wyślij”.
- **Newsletter z potwierdzeniem (double opt-in, 03.10.2026).** Formularz
  zapisuje `pending` + token i wysyła link; wysyłki dostają tylko
  `subscribed`. Adresy sprzed tej daty zostały `subscribed` (ta sama zgoda,
  zapisana treścią). Niepotwierdzone usuwa dzienne sprzątanie po 7 dniach.
  Ponowny zapis w ciągu 10 min nie wysyła drugiego maila. Odpowiedź
  formularza jest jedna dla każdego adresu.
- **Potwierdzenie i wypisanie PRZYCISKIEM, nie samym linkiem**
  (`/newsletter/potwierdz`, `/newsletter/wypisz`) — skaner poczty otwiera
  linki za człowieka; przy koncie to tylko dowód adresu, tu byłaby to zgoda
  albo jej wycofanie w czyimś imieniu.
- **Wypisanie jednym kliknięciem z poziomu skrzynki** — nagłówki
  `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058) na newsletterze,
  POST na `/api/newsletter/unsubscribe?token=` (endpoint kolekcji, zawsze
  200). Wiadomości do zapisanych na kurs ich nie mają — to informacja
  o usłudze, nie marketing. Sprawdzone 03.10.2026: Brevo przyjmuje te nagłówki.
- **Wypisany zostaje w bazie** (`unsubscribed` + data) — dowód wycofania
  zgody. Wypisany między „Wyślij” a swoją kolejką jest pomijany (`skipped`).
- **Limit nginx `site_actions`**: wysłania akcji serwerowych (POST
  z `Next-Action`) z KAŻDEJ strony — newsletter jest w stopce. **Panel
  `/admin` wyłączony z limitu**: Payload używa akcji serwerowych przy edycji
  formularzy i 10/min zablokowałoby pracę.

---

## Maile (Brevo)

Od 01.10.2026 aplikacja wysyła maile przez **Brevo, przez jego HTTP API**
(`src/lib/email/brevo.ts`), a nie przez SMTP.

- **Własny łącznik, nie `@payloadcms/email-nodemailer`.** Zmierzone 01.10.2026:
  oficjalny adapter ciągnie `nodemailer` 9.1.1 z dwoma zgłoszeniami **high**,
  a bramka `npm audit --audit-level=high` zatrzymałaby każdy PR. Poprawka jest
  w nodemailer 10, którego adapter nie przyjmuje. Wrócić do oficjalnego, gdy
  przejdzie na nodemailer ≥ 10.0.6 — wtedy zmiana dostawcy to konfiguracja.
- **⚠️ Brevo dokleja WŁASNY nagłówek wypisania do każdego maila, który go nie
  ma** (także transakcyjnego; wyłączenie tylko na planie Enterprise).
  Znalezione 21.10.2026 w nagłówkach maila próbnego: Gmail pokazuje go jako
  „Anuluj subskrypcję”, a kliknięcie wpisuje adres na listę wypisanych
  w Brevo — potem Brevo przyjmuje nasze maile do tej osoby i PO CICHU ich nie
  doręcza (potwierdzenia, statusy, nowe hasło), a aplikacja nie wie. Nagłówek
  podany przez nas zastępuje ten Brevo (sprawdzone tego samego dnia), więc
  adapter (`withServiceUnsubscribe` w `lib/email/brevo.ts`) daje każdemu
  mailowi bez własnego nasz: `/o-mailach/wypisz` — GET prowadzi na stronę
  z wyjaśnieniem, POST (jedno kliknięcie Gmaila; `List-Unsubscribe-Post`
  dokłada Brevo) odpowiada 200 i niczego nie zmienia. Newsletter zostaje przy
  swoim prawdziwym wypisaniu. Przycisk w Gmailu zostaje — bez żadnego
  nagłówka wróciłby ten z Brevo.
- **Bez `BREVO_API_KEY` maile idą do konsoli** (Payload ostrzega przy starcie).
  Celowo: lokalnie i w CI nikt nie dostanie maila przez przypadek.
- **Nadawca musi być na domenie uwierzytelnionej w Brevo** (SPF + DKIM +
  DMARC). Dziś `zapisy@szkolawspinaczkowa.pl` — rekordy w Cloudflare,
  sprawdzone 01.10.2026: SPF, DKIM i DMARC `PASS` w Gmailu. Adres nadawcy
  wygrywa zawsze, nawet gdy kod poda inny `from` — obcy adres nie przejdzie
  SPF/DKIM i trafi do spamu albo zostanie odrzucony.
  **Przy przełączeniu na `abcwspinania.info`**: uwierzytelnić tę domenę
  w Brevo i zmienić `EMAIL_FROM` w `deploy/.env` — bez nowego obrazu.
- **Domena nadawcy nie ma skrzynki** (brak rekordu MX). Odpowiedź na mail
  „od” `zapisy@` nie dojdzie nigdzie — dlatego każdy mail, na który ktoś może
  odpisać, MUSI mieć `replyTo` (powiadomienie o wiadomości: osoba pisząca).
- **⚠️ Śledzenia w Brevo nie da się wyłączyć — jest zanonimizowane.** Brevo
  wstawia piksel otwarcia i przepisuje każdy link przez swój serwer; w API
  nie ma przełącznika (pełne wyłączenie według forum Brevo: tylko na prośbę
  albo w planie Enterprise). Decyzja z 01.10.2026: zostajemy przy
  anonimizacji — `contactPixelTrackingConsent: false` przy każdym odbiorcy
  (w kodzie) **i** „Anonymous email tracking: Yes” na ekranie „Tracking”
  w ustawieniach Brevo. Ustawienie w panelu jest per konto — **nowe konto
  Brevo trzeba przestawić ręcznie**; kod chroni i bez tego. Musi to znaleźć
  się w polityce prywatności i w obietnicy z `ZAKRES.md` pkt 6.
- **Mail po zapisie, nie zamiast zapisu.** Hook `afterChange` wysyła po
  zapisaniu do bazy; błąd wysyłki jest logowany i nie psuje formularza.
  Brevo niedostępny = wiadomość czeka w panelu, nie ginie.
- **Dwa języki maili do odwiedzających (PL/EN), domyślnie polski.** Od
  15.10.2026 każdy, kto języka nie wybrał (zapis bez konta, nowe konto,
  newsletter), dostaje `DEFAULT_LANGUAGE` = polski; angielski tylko po
  przestawieniu w „Moim koncie” (albo przez szkołę w panelu). Do tego dnia
  decydował nagłówek `Accept-Language` (`pickLanguage()`): przeglądarka po
  angielsku to w Polsce częste ustawienie, nie język osoby, i Polacy dostawali
  maile po angielsku. `email.test.ts` pilnuje, że żaden kod nie czyta już
  `accept-language`. Język **zapisujemy przy zgłoszeniu** (`language`), żeby
  późniejsze maile szły tym samym językiem. Pole w Wiadomościach jest ukryte
  w panelu (zawsze polski; kolumna zostaje — starsze wiersze mają dawne
  zgadywanie, a jej usunięcie to migracja). Maile do szkoły są po polsku,
  **bez dopisku o języku** (do 14.10.2026 był „odpowiedz po angielsku”).
- **Nagłówek maili: ORYGINALNE logo + nazwa tekstem** (od 12.10.2026,
  `header()` w `layout.ts`). Logo to PDF klienta bez zmian, wyrenderowany do
  `public/logo/email-logo.png` (`design/logo/email_logo.py`) — nie dorysowany
  znak z nagłówka strony. PNG z naszego serwera (`publicUrl()`), bo poczta nie
  pokazuje SVG; nazwa zostaje tekstem, bo Outlook blokuje obrazki. Lokalnie
  obrazka nie widać (Gmail nie sięgnie do localhost). Podmiana pliku = nowa
  nazwa (zasada 13).
- **Szablony to czyste funkcje** (`src/lib/email/templates.ts`, wygląd
  w `layout.ts`) — bez Payloada, testowane gołym `node --test`. Każda wartość
  od odwiedzającego przechodzi przez `escapeHtml` w `layout.ts`; szablon nie
  składa HTML-a sam. Kolory z `BRAND_COLORS` (`site.ts`).
- **`serverURL` w `payload.config.ts` jest CELOWO nieustawiony**, mimo
  ostrzeżenia Payloada „Request origin "" is not in the CORS/CSRF allowlist”.
  Payload dopisuje `serverURL` do listy CSRF (`payload/dist/config/sanitize.js`),
  a od tej chwili odrzuca ciasteczko logowania z żądania, którego `Origin`
  jest spoza listy (`auth/extractJWT.js`) — czyli każdy zapis w panelu
  otwartym pod inną domeną. `SITE_URL` to domena DOCELOWA,
  a panel działa dziś pod tymczasową — ustawienie go wylogowałoby panel na
  `szkolawspinaczkowa.pl`. Bez niego link w mailu resetu hasła bierze domenę
  z żądania: sprawdzone 01.10.2026, z przeglądarki przychodzi pełny
  `http://…/admin/reset/…`. Ostrzeżenie i link bez domeny (`/admin/reset/…`)
  pojawiają się tylko przy wywołaniu z `payload run`, gdzie żądania nie ma.
- **Limit darmowego planu: 300 maili dziennie.** Przy newsletterze do decyzji
  Krzyśka płatny plan.

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
5. Workflow **Deploy** — stawia kontenery i zakłada schemat na czystej bazie
   (migracje są jego częścią).
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
8. Maile: w `deploy/.env` `BREVO_API_KEY`, `EMAIL_FROM` (adres na domenie
   uwierzytelnionej w Brevo), `ADMIN_NOTIFY_EMAIL`, `CAMP_EMAIL` (skrzynka
   obozów) i `PUBLIC_URL` (adres,
   pod którym strona działa TERAZ — linki w mailach do kursantów). W Brevo:
   „Anonymous email tracking: Yes”. Bez klucza strona działa, ale maile
   lądują w logu kontenera.

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
- **`/backups/milestones`** — zrzuty ręczne przed ryzykowną operacją (Deploy z nową
  migracją na prawdziwych danych, major Postgresa). Nie czyści ich nic, ani lokalnie, ani na Drive.
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
  301 do domeny docelowej), kasuje zmienną `SMOKE_URL` i zmienia `PUBLIC_URL`
  w `deploy/.env` na domenę docelową — bez dotykania reszty.
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
  **Wyjątek (od 15.10.2026): PR, który nie rusza niczego ze ścieżek CI**
  (`web/**`, `.github/workflows/ci.yml` — lista `paths` w `ci.yml`), czyli
  np. sam `docs/` albo `CLAUDE.md`, **nie podbija `VERSION`**. Taki merge
  nie buduje obrazu, więc nie ma czego etykietować — a podbicie samo
  uruchomiłoby CI (`VERSION` jest na tej liście) i zbudowało obraz identyczny
  z poprzednim pod nowym numerem. Przy dziesiątkach poprawek scenariusza
  w czasie testów numer rósłby bez żadnej zmiany na produkcji.
- **`version` w `web/package.json` NIE jest synchronizowany z `VERSION`** i nie
  ma być. Nic go nie czyta — pakiet jest prywatny, nie trafia do npm — a w
  anovastudio stoi na `0.1.0` przy `VERSION` równym `1.8.6`. Jedynym numerem
  wersji tego projektu jest plik `VERSION`.
- **Deploy nie jest automatyczny.** Tylko `workflow_dispatch`. Wdrożenie na
  maszynę klienta to decyzja, nie skutek uboczny merge'a.
- **Migracje są częścią deployu, ale tylko w górę** — patrz „Migracje
  schematu”.
- **Nie ma drugiego obrazu z narzędziami.** Świadomie, z powodu dysku.
- **Nie ma szablonu PR-a** (`.github/pull_request_template.md`, usunięty
  13.10.2026). GitHub wklejał go do każdego opisu, a opis i tak przychodzi
  gotowy, więc szablon był tylko do kasowania. Jego lista kontrolna niczego
  nie wymuszała: lint, format, typy, testy, build i audyt to bramki CI,
  a reszta (typy i migracje, obraz arm64, Node w `ci.yml`, wpis tutaj) jest
  opisana w tym pliku.

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
npm run test:integration                  # przy działającym npm run dev (patrz niżej)
npm run generate:types && git diff --exit-code src/payload-types.ts

# nginx.conf — nazwa `app` nie rozwiązuje się poza siecią compose,
# więc do testu podmieniamy ją na adres IP
sed 's|http://app:3000|http://127.0.0.1:3000|g' ../deploy/nginx.conf > /tmp/n.conf
docker run --rm -v /tmp/n.conf:/etc/nginx/conf.d/default.conf:ro \
  -v "$PWD/../deploy/certs:/etc/nginx/certs:ro" nginx:1.31-alpine nginx -t

# Workflow'y (wymaga zainicjowanego repozytorium git)
docker run --rm -v "$PWD/..:/repo" -w /repo rhysd/actionlint:latest -color
```

### Testy ręczne

Od 06.10.2026 (ZAKRES pkt 10). Scenariusz: `docs/testy-reczne.html` — źródło
PDF-a (Chrome headless, `--print-to-pdf --no-pdf-header-footer`; PDF poza
repo). **Zmieniasz funkcję — zmień jej kroki w tym samym commicie.**

- **Pisany głosem Mateusza, dla Krzyśka** (od 13.10.2026): bez kratek do
  zaznaczania — błąd od razu na WhatsApp, blokujący zatrzymuje test do
  naprawy. Część techniczna (P, Z) to dodatek na końcu.
- **Hasło kont testowych i skrzynka testera są w PDF-ie, NIE w pliku.**
  W HTML-u stoją `{{HASLO_TESTOWE}}`, `{{HASLO_PANELU}}` (tymczasowe hasło
  panelu Krzyśka) i `{{SKRZYNKA}}` (część `TEST_INBOX` przed @); PDF robi
  się z kopii w scratchpadzie z podstawionymi wartościami (repo jest
  publiczne, to wartości sekretów `TEST_PASSWORD` i `TEST_INBOX`).
  `TEST_PASSWORD` może być równe jawnemu `LOCAL_PASSWORD` (decyzja
  14.10.2026: konta testowe są zmyślone, a skrypt nie zakłada kont panelu).
  Hasło tymczasowe panelu Krzyśka ma osobny znacznik — zmienia je przy
  pierwszym logowaniu.
- **Maile w rundzie Krzyśka idą do obu**: `TEST_INBOX` i `ADMIN_NOTIFY_EMAIL`
  zostają Gmailem Mateusza, a filtr Gmaila przekazuje wszystko od
  `zapisy@szkolawspinaczkowa.pl` na `biuro@abcwspinania.info` (krok Z4).
- Dane: `TEST_INBOX=ty@gmail.com npm run seed:test` (`web/scripts/seed-test.ts`).
  Każdy adres to alias jednej skrzynki (`ty+abctest-ola@gmail.com`), więc
  konta są osobne, a maile — prawdziwe, przez Brevo — trafiają do testera.
  Znacznik `+abctest-` w adresie i dopisek „TERMIN TESTOWY — nie zapisuj się”
  przy terminie to sposób, w jaki skrypt znajduje swoje dane: każde
  uruchomienie najpierw je kasuje, `-- clean` tylko kasuje. Wysyłki usuwa,
  gdy WSZYSCY ich odbiorcy mają znacznik.
- **Na produkcji (od 13.10.2026) — tylko workflow „Test data”**
  (`test-data.yml`, potwierdzenie słowem `test-data`; akcje `seed`, `clean`,
  `clean-all`), tym samym tunelem co Migrate. Repozytorium jest
  PUBLICZNE, więc logi też: skrzynka i hasło kont to sekrety `TEST_INBOX`
  i `TEST_PASSWORD`, a skrypt nie wypisuje adresu, tokenu ani danych osoby —
  same id. **Konta panelu na produkcji nie zakłada** (znane hasło do panelu
  szkoły w publicznym repo); testerzy używają własnych. Wygasły link Ewy —
  tylko lokalnie. Job ustawia `NODE_ENV=production`: przy innym Payload
  przy starcie pchnąłby schemat do bazy klienta (tryb `push`) i zostawił
  wpis `dev`, na którym staje Migrate. Skrypt bez `TEST_DATA_ON_PRODUCTION=yes`
  odmawia startu przy `NODE_ENV=production`.
- **To, co tester wpisze BEZ znacznika** (konto na prawdziwy adres, zapis
  telefoniczny na prawdziwym terminie), da się odróżnić od prawdziwych danych
  tylko po CZASIE. Pierwsze wgranie zapisuje początek rundy w `payload.kv`
  (`seed-test:since`, zostaje przez kolejne wgrania i `clean`); `clean`
  wypisuje id rzeczy bez znacznika z tego okresu, `clean-all` je usuwa
  i zamyka okres. Bez ślepego kasowania — na produkcji w tym czasie może
  przyjść prawdziwa wiadomość.
- Seed niczego nie wysyła (`payload.sendEmail` podmieniony); maile idą
  dopiero z kliknięć testera. Konto do rejestracji od zera
  (`+abctest-nowy`) celowo nie powstaje.
- Wygasły link potwierdzający (Ewa) — token i `verificationSentAt` sprzed
  3 dni zapisane przez `payload.db.updateOne`, jak w `sendVerificationLink`.
- Daty terminów w podsumowaniu przez `formatDateRange` — tak jak na stronie
  (UTC); inna strefa dawała dzień różnicy wobec Terminarza.

### Instrukcja dla szkoły

Od 13.10.2026 w repo: `docs/instrukcja-zapisy.html` (źródło PDF-a
„Zapisy na kursy, wysyłki i newsletter” dla Krzyśka), zrzuty obok, w
`docs/instrukcja-zapisy/`. Wcześniej istniał tylko PDF z 05.10 — źródło
zaginęło i przy pierwszej aktualizacji trzeba było je odtwarzać z tekstu
PDF-a. Pisana głosem Mateusza, prostym językiem. **Zmieniasz coś, co szkoła
widzi w panelu albo w mailach — popraw instrukcję w tym samym commicie.**
Zrzuty: lokalny serwer, dane z `seed:test` z adresami przestawionymi na
`@example.com` (żadnych prawdziwych osób ani adresu testera), Chrome
headless; plakietkę trybu deweloperskiego (`nextjs-portal`) usunąć przed
zrzutem. Pytania „Zmienić status…?” i „Wysłać do…?” to okienka przeglądarki
— w trybie headless ich nie widać, opisane są tekstem.

### Testy integracyjne

Od 05.10.2026 `npm run test:integration` (`web/tests/integration/`), także
w CI (job `integration`: Postgres jako usługa, schemat WYŁĄCZNIE z migracji,
serwer `.next/standalone/server.js` jak w obrazie; job `docker` czeka na niego):
prawdziwa baza i działający serwer (`TEST_BASE_URL`, domyślnie
`http://localhost:3000`). Sprawdza to, czego nie widzą testy jednostkowe:
kto czyta co przez REST (kursant nie widzi cudzych zapisów ani danych
szkoły — obietnica ZAKRES pkt 8), wyścig o ostatnie miejsce i podwójne
kliknięcie, newsletter z potwierdzeniem, kolejkę wysyłek, odnotowane
maile, usunięcie konta.

- **Własny mały runner, nie `node:test`.** Testy idą przez `payload run`
  (`.env`, aliasy `@/`, prawdziwy Payload — bez nowej zależności), a ono
  woła `process.exit(0)`, gdy tylko skrypt się załaduje: `node:test`
  zostałby ucięty, a błędy kończyłyby się kodem 0. `harness.ts` czeka na
  każdy test i sam ustawia kod wyjścia; nieudane sprzątanie też go psuje.
- **Żaden mail nie wychodzi**: skrypt zeruje `BREVO_API_KEY`, a
  `payload.sendEmail` jest podmieniony na skrzynkę w pamięci, którą testy
  czytają. Przez HTTP testy czytają, dostają odmowy i wypisują z newslettera
  — nic, co wysyła maile. Wszystko, co wysyła, wołają w swoim procesie (endpointy wysyłek z kontem szkoły na
  żądaniu), bo maili serwera nie da się stąd zatrzymać.
- **Każdy rekord ma znacznik i jest kasowany na końcu** — można je puszczać
  na bazie deweloperskiej. Kasowanie przez `where` idzie przez `removeWhere`:
  hurtowe `payload.delete` NIE rzuca, tylko zwraca odmowy w `errors` —
  wysyłki „w trakcie” zostawały w bazie po cichu i blokowały kolejkę
  następnego przebiegu.
- **Zmiana kolekcji = restart `npm run dev` przed testami HTTP.** Serwer
  deweloperski nie przeładowuje konfiguracji Payloada w locie (zmierzone
  04–05.10.2026: nowe pola nieznane, zmieniona reguła dostępu nadal stara),
  więc test dostępu mierzyłby STARĄ konfigurację.
- Sprawdzone mutacjami 05.10.2026: zdjęta blokada „Wyślij” → czerwony test
  podwójnego kliknięcia; `read: () => true` w `Bookings` → trzy czerwone
  testy dostępu.

---

## Następne etapy — świadomie poza tym szkieletem

1. **Rezerwacje i konta uczestników.** W Payloadzie logowanie to właściwość
   kolekcji (`auth: true`), więc konta uczestników będą **drugą kolekcją z tym
   samym mechanizmem** — nie osobnym światem, jak wtyczka users-permissions
   w Strapim obok kont administratorów.
2. **Zapisy, konta uczestników, wysyłki** — plan etapów z 01.10.2026
   (maile, uprawnienia, konta, zapis na kurs, panel, obozy, wysyłki, RODO).
   Maile działają od etapu 0 (patrz „Maile (Brevo)”); formularz kontaktowy
   powiadamia Krzyśka, a reset hasła do panelu wychodzi mailem.
   Zgoda marketingowa do newslettera idzie tym samym wzorcem co
   `src/lib/consent.ts`: treść + wersja, nie samo „tak".
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
