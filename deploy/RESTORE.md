# RESTORE — kopie zapasowe i odtworzenie

Runbook do wykonania **pod presją**, więc komendy są dosłowne i w kolejności.
Jak kopie powstają i dlaczego tak — `deploy/abc-backup.sh` i sekcja
„Kopie zapasowe” w `CLAUDE.md`. Wzór: Next Step Pro (`nsp-backup.sh`, `RESTORE.md`).

> **Serwer istnieje, ale dane są złe** (skasowane, zepsute) → sekcje 1–4.
> **Serwer zniknął całkowicie** → sekcja 8, potem 1–4.
>
> **Ćwiczenie odtwarzania jest w sekcji 5 i nie dotyka produkcji.** Zrób je raz na kwartał.
> Kopia, z której nigdy nie odtwarzano, jest nieodróżnialna od takiej, która nie działa.

Wszystkie komendy wykonujesz **na serwerze** (`ssh abcwspinania`), chyba że napisano „na Macu”.

---

## 0. Jednorazowa konfiguracja (raz na serwer)

Skrypt, harmonogram (03:00) i rotację logu instaluje **workflow Deploy** (`setup-backups.sh`).
Ręcznie robi się tylko to, co jest sekretem — dlatego nie ma tego w repo.

### 0.1 Google Drive + szyfrowanie (`rclone.conf`)

Kopie lądują na Google Drive **zaszyfrowane przed wysłaniem** (remote typu `crypt`).
Bez haseł z `rclone.conf` **nie odczyta ich nikt** — także przez przeglądarkę Drive.
Sposób sprawdzony 06.10.2026: token i hasła ani razu nie pojawiają się na ekranie.

1. **Na Macu** — logowanie do Google (serwer nie ma przeglądarki). Otworzy się
   przeglądarka: wybierz konto, „Zezwól”, poczekaj na „Success”.
   ```bash
   brew install rclone            # jeśli go nie ma
   rclone config create gdrive drive scope=drive.file > /dev/null 2>&1; echo "exit=$?"
   ```
   `scope=drive.file`: rclone widzi tylko pliki, które sam utworzył, nie cały Drive.

2. **Na Macu** — przeniesienie połączenia na serwer, bez wyświetlania tokenu:
   ```bash
   CONF="$(rclone config file | tail -1)"
   { echo "[gdrive]"; sed -n '/^\[gdrive\]$/,/^$/p' "$CONF" | sed '1d'; } \
     | ssh abcwspinania 'sudo install -d -m 700 /root/.config/rclone \
         && sudo install -m 600 /dev/null /root/.config/rclone/rclone.conf \
         && sudo tee /root/.config/rclone/rclone.conf >/dev/null'
   rclone config delete gdrive     # token nie jest już potrzebny na Macu
   ```
   ⚠️ To NADPISUJE `rclone.conf` na serwerze. Przy wymianie samego tokenu na
   działającym serwerze użyj `sudo rclone config` → edytuj `gdrive`.

3. **Na serwerze** — zaszyfrowany folder. Hasła (256 bitów każde) powstają na serwerze
   i nie są nigdzie wypisywane:
   ```bash
   sudo rclone config create abc-crypt crypt remote=gdrive:abcwspinania-kopie \
     filename_encryption=standard directory_name_encryption=true \
     password="$(openssl rand -hex 32)" password2="$(openssl rand -hex 32)" \
     --obscure >/dev/null 2>&1; echo "create=$?"
   sudo rclone listremotes --long   # abc-crypt: crypt, gdrive: drive
   ```

4. ⚠️ **Zapisz cały `rclone.conf` w menedżerze haseł — OD RAZU.** Wykonaj to we
   WŁASNYM terminalu (nie w czacie z Claude), skopiuj wynik do notatki
   „ABC Wspinania — rclone.conf (kopie zapasowe)”:
   ```bash
   ssh abcwspinania 'sudo cat /root/.config/rclone/rclone.conf'
   ```
   Bez tego pliku kopie na Drive to szum: przy utracie serwera **nie ma czego odtworzyć**.

5. Sprawdzenie — mała próba zapisu i odczytu przez szyfrowanie:
   ```bash
   echo test | sudo rclone rcat abc-crypt:probe/p.txt && sudo rclone cat abc-crypt:probe/p.txt
   sudo rclone purge abc-crypt:probe
   ```
   ⚠️ `rclone lsl` na tym Drive bywa bardzo wolny (minuta i dłużej) — to nie awaria.

### 0.2 Alarm, gdy kopia się nie zrobi (healthchecks.io)

Bez tego nieudana kopia jest **cicha** — dowiadujesz się dopiero, gdy jest potrzebna.

1. healthchecks.io → nowy check „abcwspinania backup”, **Period 1 day, Grace 2 hours**,
   powiadomienie mailem.
2. Na serwerze (adres z checka):
   ```bash
   echo 'HEALTHCHECK_URL="https://hc-ping.com/<uuid>"' | sudo tee /etc/abc-backup.env >/dev/null
   sudo chmod 600 /etc/abc-backup.env
   ```
   Plik tworzy pusty `setup-backups.sh` i **nigdy go nie nadpisuje** — wartość przeżywa deploye.

### 0.3 ⚠️ `deploy/.env` też do menedżera haseł

Przy utracie serwera potrzebne są **dwie** notatki: `rclone.conf` (klucz do kopii, 0.1)
i `.env` aplikacji — nazwa i hasło bazy, `PAYLOAD_SECRET`, maile. GitHub nie pozwala
odczytać zapisanych sekretów, więc bez tej notatki trzeba by je wymyślać od nowa.
We **własnym terminalu**:
```bash
ssh abcwspinania 'cat ~/abcwspinania/.env'
```
Notatka „ABC Wspinania — deploy/.env (serwer)”. Po każdej zmianie `.env` — zaktualizuj ją.

### 0.4 Pierwsza kopia ręcznie

```bash
sudo /usr/local/bin/abc-backup.sh && sudo tail -15 /var/log/abc-backup.log
sudo rclone lsl abc-crypt:            # db/ i files/ z dzisiejszą datą
```
W healthchecks.io check powinien zrobić się zielony. Potem **sekcja 5 — ćwiczenie**.

---

## 1. Co gdzie leży i wybór kopii

| Co | Lokalnie (7 dni) | Zdalnie (40 dni) |
|---|---|---|
| Baza (co noc) | `/backups/db/<RRRR-MM-DD>.sql.gz` | `abc-crypt:db/` |
| Pliki (`/app/uploads`: Media, Galeria) — **tylko gdy się zmieniły**, najrzadziej co 30 dni; najnowsze zostaje lokalnie zawsze | `/backups/files/<RRRR-MM-DD>.tar.gz` | `abc-crypt:files/` |
| Zrzuty ręczne przed ryzykowną operacją | `/backups/milestones/` (bez limitu) | `abc-crypt:milestones/` (bez limitu) |

- **Archiwum plików nie powstaje co noc.** Skrypt porównuje listę plików (nazwa, rozmiar,
  data modyfikacji) z poprzednią (`/var/lib/abc-backup/files-state`) i pakuje je tylko przy
  zmianie albo gdy ostatnie archiwum ma 30 dni — żeby przycinanie Drive po 40 dniach nigdy
  nie zostawiło go bez archiwum. **Każde archiwum jest pełne**, nie przyrostowe. Do zrzutu
  bazy z dnia `DATE` pasuje **najnowsze archiwum plików z dnia `DATE` albo wcześniejszego**
  (`FILES_DATE` w komendach niżej) — brak nowszego znaczy dokładnie tyle, że pliki od tamtej
  pory się nie zmieniły. Skasowanie pliku stanu wymusza archiwum przy najbliższym przebiegu.
- 40 dni, nie 90 — ustalone 09.10.2026 dla wszystkich czterech projektów z tym samym
  schematem kopii. Polityka prywatności mówi „do 40 dni” — zmiana tej liczby to też
  zmiana polityki.
- Format zrzutu: **plain SQL** (`pg_dump` bez `-F c`) w gzipie → odtwarza `psql`, nie `pg_restore`.
- Kontenery: `abcwspinania-postgres-prod`, `abcwspinania-app-prod`.
  Wolumen plików: `abcwspinania_abcwspinania_uploads_prod`.
- ⚠️ **Odtwarzaj `psql`-em w wersji ≥ serwera, który robił zrzut** (dziś PostgreSQL 18).
  Komendy niżej uruchamiają `psql` w kontenerze `postgres:18-alpine`, więc to się zgadza samo.

```bash
sudo ls -la /backups/db /backups/files          # lokalnie
sudo rclone lsl abc-crypt:db                    # zdalnie
sudo rclone lsl abc-crypt:files
```

Ustal dwie daty: `DATE` — dzień zrzutu bazy, `FILES_DATE` — **najnowsze archiwum plików
nie późniejsze niż `DATE`** (zwykle wcześniejsze). Czego nie ma lokalnie, ściągnij z Drive
(pobranie, nic nie kasuje):
```bash
DATE=2026-10-21
FILES_DATE=2026-10-14
sudo rclone copy "abc-crypt:db/${DATE}.sql.gz"          /backups/db/
sudo rclone copy "abc-crypt:files/${FILES_DATE}.tar.gz" /backups/files/
```

**Sprawdź kopię, ZANIM na niej cokolwiek oprzesz** (`gunzip -t` nie wystarcza — patrz skrypt):
```bash
sudo gunzip -c /backups/db/${DATE}.sql.gz | tail -20 | grep -q 'PostgreSQL database dump complete' \
  && echo "OK: zrzut kompletny" || echo "UWAGA: zrzut obcięty — weź inną datę"
sudo tar tzf /backups/files/${FILES_DATE}.tar.gz >/dev/null \
  && echo "OK: archiwum czytelne" || echo "UWAGA: archiwum uszkodzone — weź inną datę"
```

---

## 2. Odtworzenie bazy

⚠️ **To kasuje obecną bazę.** Najpierw zrzut stanu bieżącego — nawet uszkodzonego.

```bash
DATE=2026-10-21
cd /home/ubuntu/abcwspinania
PG="docker exec -i abcwspinania-postgres-prod"

# 2.1 Zrzut stanu obecnego — do milestones, którego nic nie przycina
$PG sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip \
  | sudo tee "/backups/milestones/PRZED-ODTWORZENIEM-$(date +%F-%H%M).sql.gz" >/dev/null

# 2.2 Zatrzymaj aplikację — trzyma połączenia i DROP DATABASE nie przejdzie
docker compose -f docker-compose.prod.yml stop app

# 2.3 Pusta baza (łączymy się z bazą 'postgres', bo kasujemy właściwą)
$PG sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";"'
$PG sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";"'

# 2.4 Wlej zrzut. ON_ERROR_STOP=1 jest istotne: bez niego psql leci dalej po błędzie
#     i kończy sukcesem na bazie odtworzonej w połowie.
sudo gunzip -c /backups/db/${DATE}.sql.gz \
  | $PG sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q'
echo "psql zakończył się kodem: $?"   # musi być 0

# 2.5 Aplikacja z powrotem
docker compose -f docker-compose.prod.yml start app
```

⚠️ **Nie uruchamiaj workflow Migrate po odtworzeniu**, chyba że kopia jest sprzed
migracji, którą chcesz ponowić. Zrzut zawiera tabelę `payload_migrations` — odtworzona baza
„pamięta”, które migracje przeszły.

---

## 3. Odtworzenie plików (zdjęcia z Mediów i Galerii)

```bash
FILES_DATE=2026-10-14     # najnowsze archiwum plików ≤ dzień zrzutu bazy (sekcja 1)
cd /home/ubuntu/abcwspinania
VOL=abcwspinania_abcwspinania_uploads_prod

# 3.1 Aplikacja musi stać — trzyma pliki
docker compose -f docker-compose.prod.yml stop app

# 3.2 Kopia bezpieczeństwa obecnego wolumenu
sudo docker run --rm -v ${VOL}:/data:ro -v /backups/milestones:/backup alpine \
  tar czf "/backup/PRZED-ODTWORZENIEM-$(date +%F-%H%M).tar.gz" -C /data .

# 3.3 Wyczyść ZAWARTOŚĆ wolumenu (nie sam wolumen) i rozpakuj archiwum
docker run --rm -v ${VOL}:/data alpine sh -c 'rm -rf /data/* /data/.[!.]* 2>/dev/null; true'
sudo docker run --rm -v ${VOL}:/data -v /backups/files:/backup:ro alpine \
  tar xzf "/backup/${FILES_DATE}.tar.gz" -C /data

# 3.4 Właściciel: aplikacja chodzi jako `node` (uid 1000). Zły właściciel nie psuje
#     wyświetlania, a dopiero pierwsze wgranie zdjęcia w panelu kończy się błędem.
docker run --rm -v ${VOL}:/data alpine chown -R 1000:1000 /data

# 3.5 Aplikacja z powrotem
docker compose -f docker-compose.prod.yml start app
```

**Pliki odtwarzaj z NAJNOWSZEGO archiwum nie późniejszego niż zrzut bazy.** Baza z 21.
i pliki z 14. są spójną parą tylko wtedy, gdy między 14. a 21. nie powstało nowsze
archiwum — pominięcie nowszego (np. z 18.) da stronę, która odpowiada 200 i ma połamane
obrazki.

---

## 4. Weryfikacja po odtworzeniu

```bash
PG="docker exec abcwspinania-postgres-prod"
# Migracje: ostatnia zastosowana musi odpowiadać wdrożonej wersji
$PG sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT name FROM payload_migrations ORDER BY id DESC LIMIT 3;"'

# Dane: liczby wierszy — porównaj z ostatnim zapisanym wynikiem ćwiczenia (sekcja 5).
# "0" w courses lub media to odtworzenie NIEUDANE, nie puste.
$PG sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
  SELECT '\''courses'\'' t, count(*) FROM courses
  UNION ALL SELECT '\''sessions'\'', count(*) FROM sessions
  UNION ALL SELECT '\''posts'\'',    count(*) FROM posts
  UNION ALL SELECT '\''media'\'',    count(*) FROM media
  UNION ALL SELECT '\''users'\'',    count(*) FROM users
  ORDER BY 1;"'

# Pliki w wolumenie
docker run --rm -v abcwspinania_abcwspinania_uploads_prod:/data:ro alpine \
  sh -c 'echo "plików: $(find /data -type f | wc -l)"; du -sh /data'
```

Na koniec w przeglądarce: **strona główna, jeden kurs, galeria i logowanie do panelu**.

---

## 5. Ćwiczenie odtwarzania (bez dotykania produkcji)

Tymczasowy Postgres w osobnym kontenerze, bez portu i bez wolumenu — znika po `stop`.
Użytkownik i nazwa bazy **takie same jak na produkcji**: zrzut nadaje tabele właścicielowi
o tej nazwie i przy innej przerwie się na pierwszym `ALTER ... OWNER TO`.

```bash
DATE=$(date +%F)
U=$(docker exec abcwspinania-postgres-prod printenv POSTGRES_USER)
D=$(docker exec abcwspinania-postgres-prod printenv POSTGRES_DB)

docker run -d --rm --name abc-restore-drill \
  -e POSTGRES_USER="$U" -e POSTGRES_PASSWORD=drill -e POSTGRES_DB="$D" postgres:18-alpine
until docker exec abc-restore-drill pg_isready -U "$U" -q; do sleep 1; done; sleep 2

sudo gunzip -c /backups/db/${DATE}.sql.gz \
  | docker exec -i abc-restore-drill psql -U "$U" -d "$D" -v ON_ERROR_STOP=1 -q
echo "psql zakończył się kodem: $?"   # 0 = kopia nadaje się do odtworzenia

docker exec abc-restore-drill psql -U "$U" -d "$D" -c "
  SELECT 'courses' t, count(*) FROM courses
  UNION ALL SELECT 'sessions', count(*) FROM sessions
  UNION ALL SELECT 'media',    count(*) FROM media
  UNION ALL SELECT 'migracje', count(*) FROM payload_migrations
  ORDER BY 1;"

docker stop abc-restore-drill

# Archiwum plików — bez rozpakowywania. Najnowsze, nie dzisiejsze: archiwum
# powstaje tylko przy zmianie plików, więc z dzisiejszą datą zwykle go nie ma.
FILES_LATEST=$(sudo ls /backups/files | grep '\.tar\.gz$' | sort | tail -1)
sudo tar tzf "/backups/files/${FILES_LATEST}" | wc -l
```

**Ćwiczenie z kopii z Drive** (to sprawdza też szyfrowanie i hasła): zamiast lokalnej kopii
najpierw `sudo rclone copy "abc-crypt:db/${DATE}.sql.gz" /tmp/drill/` i wlej tamten plik.

**Zapisz wynik** (data, liczby wierszy) poniżej — przy awarii to jedyne, z czym porównasz.

| Data ćwiczenia | Kopia z | courses | sessions | media | migracje | Kto |
|---|---|---|---|---|---|---|
| 2026-10-06 | Drive (`abc-crypt:`), kopia z 06.10 | 7 | 10 | 16 | 6 | Claude z Mateuszem; zgodne z produkcją, 78/78 plików |
| | | | | | | |

---

## 6. Zrzut ręczny przed ryzykowną operacją

Przed workflow **Migrate** na bazie z prawdziwymi danymi i przed podbiciem majora Postgresa:

```bash
F="/backups/milestones/PRZED-$(date +%F-%H%M).sql.gz"
docker exec abcwspinania-postgres-prod sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip | sudo tee "$F" >/dev/null
sudo gunzip -c "$F" | tail -20 | grep -q 'PostgreSQL database dump complete' && echo "OK: $F"
```

`milestones/` nie czyści nic — ani 7 dni lokalnie, ani 40 na Drive. Kasujesz ręcznie.

---

## 7. Gdy coś nie działa

| Objaw | Przyczyna | Co zrobić |
|---|---|---|
| W logu `rclone remote abc-crypt: is not configured` | Brak `rclone.conf` | Sekcja 0.1 (albo wgraj plik z menedżera haseł, `chmod 600`) |
| `syntax error at or near "\restrict"` | `psql` starszy niż serwer zrzutu | Odtwarzaj w kontenerze `postgres:18-alpine` (sekcje 2, 5) |
| `database ... is being accessed by other users` | Aplikacja trzyma połączenia | `docker compose -f docker-compose.prod.yml stop app` przed DROP |
| `role "..." does not exist` przy ćwiczeniu | Inny użytkownik niż na produkcji | Sekcja 5 — `U` i `D` z kontenera produkcyjnego |
| Strona działa, obrazki połamane | Archiwum plików starsze niż najnowsze ≤ dzień zrzutu | Weź **najnowsze** archiwum z `abc-crypt:files` nie późniejsze niż zrzut (sekcja 1) |
| Wgranie zdjęcia w panelu rzuca błędem | Zły właściciel wolumenu | `chown -R 1000:1000` (3.4) |
| `token expired` / `invalid_grant` w logu | Token Google unieważniony (zmiana hasła, odebrany dostęp) | `rclone authorize "drive"` na Macu i podmiana tokenu: `sudo rclone config` → edytuj `gdrive` |
| Kopii z potrzebnego dnia nie ma nigdzie | Kopie milczały | `/var/log/abc-backup.log` i healthchecks.io (sekcja 0.2) |

---

## 8. Serwer zniknął całkowicie (nowa maszyna)

Kolejność ma znaczenie: **DNS przestawiasz na końcu**. Do tego czasu odwiedzający widzą
starą (niedziałającą) stronę zamiast pustej nowej — a pusta baza ma otwarty ekran
„utwórz pierwszego administratora” dla każdego, kto zna adres.

Potrzebne z menedżera haseł: **`rclone.conf`** (0.1) i **`deploy/.env`** (0.3).

### 8.1 Nowa maszyna

1. Oracle Cloud → nowa instancja Ubuntu 24.04, ARM (Ampere A1), z publicznym IP.
   Porty 80 i 443 otwarte (Security List i zapora Ubuntu — patrz CLAUDE.md, „Lista
   pierwszego uruchomienia”). Klucz SSH: ten sam, którego używa Deploy (`DEPLOY_SSH_KEY`).
2. Na maszynie: Docker z wtyczką compose, użytkownik w grupie `docker`, `sudo` bez
   hasła dla tego użytkownika (Deploy woła `sudo -n`).
3. Katalog aplikacji i sekrety:
   ```bash
   mkdir -p ~/abcwspinania/certs
   nano ~/abcwspinania/.env            # wklej notatkę „deploy/.env” z menedżera haseł
   chmod 600 ~/abcwspinania/.env
   ```
   ⚠️ **`POSTGRES_USER` i `POSTGRES_DB` muszą być TAKIE SAME jak w starym `.env`** —
   zrzut nadaje tabele właścicielowi o tej nazwie (sekcja 5). Hasła mogą być nowe.
   Brak notatki: wygeneruj nowe hasła (`openssl rand -hex 32`, każde osobno), nazwy
   użytkownika i bazy odczytaj ze zrzutu: `gunzip -c <zrzut> | grep -m1 'OWNER TO'`.
4. Certyfikaty do `~/abcwspinania/certs/` — Origin Certificate z Cloudflare (panel
   Cloudflare → SSL/TLS → Origin Server → nowy certyfikat; pliki o nazwach z
   `deploy/nginx.conf`, dyrektywy `ssl_certificate`). Bez nich nginx nie wstanie.

### 8.2 Aplikacja (na razie z pustą bazą)

1. GitHub → Settings → Secrets → **`DEPLOY_HOST`** = nowe IP. Gdy hasła bazy lub
   `PAYLOAD_SECRET` są nowe — podmień też `POSTGRES_PASSWORD` i `PAYLOAD_SECRET`.
2. Workflow **Deploy**. Stawia kontenery i instaluje kopie zapasowe (`rclone`, skrypt,
   harmonogram). Smoke test może się nie udać, dopóki DNS wskazuje stary adres — to nic.
   **Nie uruchamiaj Migrate** — schemat przyjdzie razem ze zrzutem.

### 8.3 Klucz do kopii i pobranie z Drive

```bash
sudo install -d -m 700 /root/.config/rclone
sudo nano /root/.config/rclone/rclone.conf     # wklej notatkę „rclone.conf”
sudo chmod 600 /root/.config/rclone/rclone.conf
sudo rclone lsd abc-crypt:                      # db/ i files/ = klucz działa

sudo rclone lsl abc-crypt:db | sort -k2,3 | tail -5      # najnowsze zrzuty bazy
sudo rclone lsl abc-crypt:files | sort -k2,3 | tail -5   # archiwa plików (tylko dni ze zmianą)
DATE=2026-10-21          # ← najnowsza data zrzutu bazy
FILES_DATE=2026-10-14    # ← najnowsze archiwum plików nie późniejsze niż DATE
sudo rclone copy "abc-crypt:db/${DATE}.sql.gz"          /backups/db/
sudo rclone copy "abc-crypt:files/${FILES_DATE}.tar.gz" /backups/files/
```
Potem **sprawdzenie kopii z sekcji 1** (znacznik końca zrzutu, `tar tzf`).
`abc-crypt:` niewidoczny albo `lsd` z błędem → zła notatka; sekcja 7.

### 8.4 Dane

Sekcja **2** (baza — krok 2.1 pomiń, bieżąca baza jest pusta) z `DATE` i sekcja **3**
(pliki) z `FILES_DATE` z kroku 8.3. Potem sekcja **4** — liczby wierszy porównaj z ostatnim ćwiczeniem
(tabela w sekcji 5).

### 8.5 Ruch na nową maszynę

1. Cloudflare → DNS → rekordy **A** dla `@` i `www` → nowe IP (proxy włączone).
2. Po kilku minutach: strona główna, kurs, galeria, logowanie do panelu.
3. Workflow **Deploy** jeszcze raz — tym razem smoke test musi przejść.
4. Alarm kopii: `HEALTHCHECK_URL` z healthchecks.io (check „abcwspinania backup” →
   adres pingu) do `/etc/abc-backup.env` (sekcja 0.2). Potem pierwsza kopia ręcznie (0.4).
5. Zaktualizuj notatkę „deploy/.env”, jeśli hasła są nowe, i adres serwera w
   konfiguracji SSH na Macu (`~/.ssh/config`, host `abcwspinania`).

