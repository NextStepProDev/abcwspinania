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

### Kolekcje

| Kolekcja | Publiczny odczyt | Po co |
|---|---|---|
| `Kursy` | tak | oferta kursów, z podstroną każdego |
| `Media` | tak | biblioteka zdjęć, `alt` wymagany |
| `Wiadomosci` | **nie** | zgłoszenia z formularza — dane osobowe |
| `Users` | **nie** | konta do panelu |

`Wiadomosci` przyjmuje zapis od **każdego** (to formularz publiczny), ale odczyt,
zmiana i kasowanie wymagają zalogowania. Publiczny odczyt byłby wyciekiem danych
osobowych, nie udogodnieniem.

Katalog nazywa się `web/`, a nie `frontend/` — po przejściu na Payload zawiera
także backend, więc stara nazwa wprowadzałaby w błąd.

### Dlaczego Payload, a nie Strapi

Projekt startował na Strapim i został przepięty 19.09.2026, zanim cokolwiek
trafiło na produkcję. Powody, zmierzone:

- Ten system to w ~80% **aplikacja** (rezerwacje, konta, TFG, wykresy), a nie
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
- **Node 26** (`node:26-alpine`). **Ta sama liczba musi stać w `node-version:`
  w `ci.yml`.** Dependabot podbija ją wyłącznie w Dockerfile (ekosystem `docker`
  czyta tylko Dockerfile'e) — w anovastudio po bumpie 24 → 26 CI został na 24
  i przez jakiś czas testował kod na innym silniku niż produkcja.
  **Przy następnym majorze zmienić oba miejsca naraz.**
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
├── (frontend)/          ← strona, layout, sitemap, icon, og, error, not-found
└── (payload)/           ← panel i API, boilerplate Payloada
```

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
13. `public/images` i `public/logo` dostają tydzień cache **bez `immutable`** —
    te nazwy nie mają hasha. Podmieniasz zdjęcie → zmień nazwę pliku. Pliki
    z biblioteki mediów mają hash, więc tam `immutable` jest bezpieczne.
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
   (`openssl rand -base64 32`, każdy osobno).
2. Certyfikaty Let's Encrypt w `deploy/certs` — certbot na **dwie** nazwy:
   domena główna i `www`. (Subdomena `api.` już nie jest potrzebna.)
3. Rekordy DNS A dla `@` i `www` na publiczny adres instancji.
4. **Jednorazowe przejęcie wolumenu uploadów na uid 1000** — jest rootowy,
   a aplikacja chodzi jako `node`:
   ```bash
   docker run --rm -v abcwspinania_uploads_prod:/u alpine chown -R 1000:1000 /u
   ```
5. Workflow **Migrate** — założenie schematu na czystej bazie.
6. Konto administratora: wejść na `https://abcwspinania.info/admin`, ekran
   „utwórz pierwszego użytkownika".
   ⚠️ Zrobić to **od razu po pierwszym deployu**. Dopóki nie ma żadnego konta,
   ekran rejestracji pierwszego administratora jest dostępny dla każdego, kto
   zna adres.
7. Zmienna repozytorium `SITE_URL` (odblokowuje smoke test) oraz sekrety:
   `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`, `GHCR_OWNER`,
   `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `PAYLOAD_SECRET`.

**Czego NIE ma już na tej liście:** wyklikiwania uprawnień publicznych w panelu.
Są w kodzie i jadą z deployem.

---

## Świadome braki — nie „przywracaj" ich bez powodu

- **Nie ma workflow pilnującego `VERSION`.** W anovastudio został usunięty:
  Dependabot nie umie edytować tego pliku, a automatyczny bump powodował
  konflikty scalania na tej jednej linii.
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
npm audit --omit=dev --audit-level=high   # bramka BLOKUJĄCA w CI
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
   `Wiadomosci`, bez zmiany tego, co już działa. Zgoda marketingowa do newslettera
   idzie tym samym wzorcem co `src/lib/consent.ts`: treść + wersja, nie samo „tak".
3. **Moduł TFG** — wykaz umów do **14-tego** przez API (OpenAPI/Swagger).
   Wymaga konta technicznego z certyfikatem **powiązanym z zadeklarowanym
   publicznym adresem IP**, więc kolejność jest wymuszona: *najpierw instancja
   Oracle z trwałym adresem, dopiero potem wniosek o konto.*
   **Deklaracja do 21-tego automatyzacji nie podlega** — wyłącznie portal.
   Obowiązek liczy się od **daty podpisania umowy**, nie od daty wyjazdu; wykazu
   nie składa się za miesiąc bez umów, ale deklarację zerową i tak trzeba złożyć.
4. **Panel operacyjny** — kalendarz obozów, wykresy, eksport TFG. W Payloadzie
   to **własne widoki w tym samym panelu** (udokumentowana funkcja), a nie
   osobny obszar w Next.js, jak musiałoby być przy Strapim.

## Do potwierdzenia z klientem

- Czy domena zostaje `abcwspinania.info`. Występuje w `deploy/nginx.conf`
  (trzy bloki `server_name`) i w zmiennej repozytorium `SITE_URL`. Grep po
  `abcwspinania.info` musi zwracać wyłącznie te miejsca.
- Telefon i adres e-mail — `CONTACT` w `web/src/lib/site.ts` czeka z pustymi
  polami. Dopóki telefon jest pusty, strona **nie renderuje** linku `tel:`
  zamiast renderować zepsuty.
- Model treści: `Kursy` to na razie jedyna kolekcja treściowa i celowo minimalna.
