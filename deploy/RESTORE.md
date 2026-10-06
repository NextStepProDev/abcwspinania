# RESTORE — kopie zapasowe i odtworzenie

Runbook do wykonania **pod presją**, więc komendy są dosłowne i w kolejności.
Jak kopie powstają i dlaczego tak — `deploy/abc-backup.sh` i sekcja
„Kopie zapasowe” w `CLAUDE.md`. Wzór: Next Step Pro (`nsp-backup.sh`, `RESTORE.md`).

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

1. **Na Macu** — token Google (serwer nie ma przeglądarki):
   ```bash
   brew install rclone
   rclone authorize "drive"
   ```
   Otworzy się przeglądarka, logujesz się na konto Google, na którym mają leżeć kopie.
   W terminalu pojawi się blok `{"access_token":...}` — skopiuj go całego.

2. **Na serwerze** — konfiguracja dwóch remote'ów:
   ```bash
   sudo rclone config
   ```
   - `n` (new remote) → nazwa **`gdrive`** → typ **`drive`** → client_id/secret puste →
     scope **`drive.file`** (rclone widzi tylko pliki, które sam utworzył) →
     root_folder_id i service_account puste → advanced `n` → auto config **`n`** →
     wklej token z kroku 1 → team drive `n` → `y`.
   - `n` → nazwa **`abc-crypt`** → typ **`crypt`** → remote **`gdrive:abcwspinania-kopie`** →
     filename_encryption `standard` → directory_name_encryption `true` →
     hasło: **`g` (wygeneruj), 256 bitów** → salt: **`g`, 256 bitów** → `y`.
   - `q` (wyjdź).

3. ⚠️ **Zapisz oba wygenerowane hasła (i cały plik) w menedżerze haseł — OD RAZU.**
   ```bash
   sudo cat /root/.config/rclone/rclone.conf
   ```
   Skopiuj całą zawartość jako notatkę „ABC Wspinania — rclone.conf (kopie zapasowe)”.
   Bez tego pliku kopie na Drive to szum: przy utracie serwera **nie ma czego odtworzyć**.

4. Sprawdzenie:
   ```bash
   sudo rclone listremotes --long   # gdrive: drive, abc-crypt: crypt
   sudo rclone mkdir abc-crypt:     # tworzy zaszyfrowany katalog na Drive
   sudo rclone lsd abc-crypt:       # bez błędu = token i szyfrowanie działają
   ```

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

### 0.3 Pierwsza kopia ręcznie

```bash
sudo /usr/local/bin/abc-backup.sh && sudo tail -15 /var/log/abc-backup.log
sudo rclone lsl abc-crypt:            # db/ i files/ z dzisiejszą datą
```
W healthchecks.io check powinien zrobić się zielony. Potem **sekcja 5 — ćwiczenie**.

---

## 1. Co gdzie leży i wybór kopii

| Co | Lokalnie (7 dni) | Zdalnie (90 dni) |
|---|---|---|
| Baza | `/backups/db/<RRRR-MM-DD>.sql.gz` | `abc-crypt:db/` |
| Pliki (`/app/uploads`: Media, Galeria) | `/backups/files/<RRRR-MM-DD>.tar.gz` | `abc-crypt:files/` |
| Zrzuty ręczne przed ryzykowną operacją | `/backups/milestones/` (bez limitu) | `abc-crypt:milestones/` (bez limitu) |

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

Potrzebnej daty nie ma lokalnie — ściągnij z Drive (pobranie, nic nie kasuje):
```bash
DATE=2026-10-21
sudo rclone copy "abc-crypt:db/${DATE}.sql.gz"    /backups/db/
sudo rclone copy "abc-crypt:files/${DATE}.tar.gz" /backups/files/
```

**Sprawdź kopię, ZANIM na niej cokolwiek oprzesz** (`gunzip -t` nie wystarcza — patrz skrypt):
```bash
sudo gunzip -c /backups/db/${DATE}.sql.gz | tail -20 | grep -q 'PostgreSQL database dump complete' \
  && echo "OK: zrzut kompletny" || echo "UWAGA: zrzut obcięty — weź inną datę"
sudo tar tzf /backups/files/${DATE}.tar.gz >/dev/null \
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
DATE=2026-10-21
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
  tar xzf "/backup/${DATE}.tar.gz" -C /data

# 3.4 Właściciel: aplikacja chodzi jako `node` (uid 1000). Zły właściciel nie psuje
#     wyświetlania, a dopiero pierwsze wgranie zdjęcia w panelu kończy się błędem.
docker run --rm -v ${VOL}:/data alpine chown -R 1000:1000 /data

# 3.5 Aplikacja z powrotem
docker compose -f docker-compose.prod.yml start app
```

**Bazę i pliki odtwarzaj z TEJ SAMEJ daty.** Baza z 21., a pliki z 14. dadzą stronę, która
odpowiada 200 i ma połamane obrazki.

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

# Archiwum plików — bez rozpakowywania
sudo tar tzf /backups/files/${DATE}.tar.gz | wc -l
```

**Ćwiczenie z kopii z Drive** (to sprawdza też szyfrowanie i hasła): zamiast lokalnej kopii
najpierw `sudo rclone copy "abc-crypt:db/${DATE}.sql.gz" /tmp/drill/` i wlej tamten plik.

**Zapisz wynik** (data, liczby wierszy) poniżej — przy awarii to jedyne, z czym porównasz.

| Data ćwiczenia | Kopia z | courses | sessions | media | migracje | Kto |
|---|---|---|---|---|---|---|
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

`milestones/` nie czyści nic — ani 7 dni lokalnie, ani 90 na Drive. Kasujesz ręcznie.

---

## 7. Gdy coś nie działa

| Objaw | Przyczyna | Co zrobić |
|---|---|---|
| W logu `rclone remote abc-crypt: is not configured` | Brak `rclone.conf` | Sekcja 0.1 (albo wgraj plik z menedżera haseł, `chmod 600`) |
| `syntax error at or near "\restrict"` | `psql` starszy niż serwer zrzutu | Odtwarzaj w kontenerze `postgres:18-alpine` (sekcje 2, 5) |
| `database ... is being accessed by other users` | Aplikacja trzyma połączenia | `docker compose -f docker-compose.prod.yml stop app` przed DROP |
| `role "..." does not exist` przy ćwiczeniu | Inny użytkownik niż na produkcji | Sekcja 5 — `U` i `D` z kontenera produkcyjnego |
| Strona działa, obrazki połamane | Baza i pliki z różnych dni | Odtwórz oba z tej samej daty |
| Wgranie zdjęcia w panelu rzuca błędem | Zły właściciel wolumenu | `chown -R 1000:1000` (3.4) |
| `token expired` / `invalid_grant` w logu | Token Google unieważniony (zmiana hasła, odebrany dostęp) | `rclone authorize "drive"` na Macu i podmiana tokenu: `sudo rclone config` → edytuj `gdrive` |
| Kopii z potrzebnego dnia nie ma nigdzie | Kopie milczały | `/var/log/abc-backup.log` i healthchecks.io (sekcja 0.2) |
