# abcwspinania

Strona i system dla szkoły wspinaczkowej **ABC Wspinania** (Jura
Krakowsko-Częstochowska).

| | |
|---|---|
| `web/` | Next.js 16 + **Payload 3** — strona, panel i API w jednej aplikacji |
| baza | PostgreSQL 18 |
| `deploy/` | Docker Compose + nginx, Oracle Cloud Ampere A1 (ARM64) |

## Start

```bash
docker compose up -d          # baza na porcie 5435

cd web
npm ci
npm run migrate               # zakłada schemat z migracji w repo
npm run dev
```

- strona — <http://localhost:3000>
- panel — <http://localhost:3000/admin> (za pierwszym razem ekran „utwórz
  pierwszego użytkownika")

Aplikacja buduje się **także przy wyłączonej bazie** — sekcje pokazują wtedy
stan pusty. To zamierzone i dzięki temu build w CI nie wymaga Postgresa.

## Zmiana modelu treści

Kolekcje żyją w kodzie, w `web/src/collections/`. Po edycji:

```bash
npm run generate:types        # typy są commitowane, CI pilnuje zgodności
npm run migrate:create <nazwa>
```

## Wdrożenie

Push na `main` → CI buduje obraz ARM64 i wypycha do GHCR. Dalej **ręcznie**:
workflow `Migrate` (jeśli zmienił się schemat), potem `Deploy`.

## Zanim cokolwiek zmienisz

Przeczytaj [`CLAUDE.md`](./CLAUDE.md). Zawiera decyzje projektowe wraz
z powodami — wersje, których **nie wolno podbić**, zmieniony punkt montowania
Postgresa 18, wymóg budowania pod ARM64 i pułapkę z `robots.ts`. Każda z tych
reguł kosztowała kogoś czas.
