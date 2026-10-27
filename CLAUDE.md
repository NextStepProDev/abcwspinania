# abcwspinania — project rules

Website and system for the **ABC Wspinania** climbing school (Jura
Krakowsko-Częstochowska).

This file carries **decisions and their reasons**, including lessons from
mistakes made earlier in `anovastudio`. Every rule below cost someone time —
before you change any of them, check whether its cause has stopped applying.

The file **is versioned** (in anovastudio its counterpart sits in
`.gitignore`). It holds no secrets, and it holds everything someone joining
the project needs. Private notes go to `pytania.md` — ignored and never merged
into the public file.

**Commitments to the client are not in the repo** — they are Mateusz's private
notes, outside git (like `pytania.md`). Here are the technical decisions and
their reasons.

---

## Stack

| Layer | Technology |
|---|---|
| Application | Next.js 16.4.3 — App Router, TypeScript, Tailwind 4, Turbopack |
| CMS | **Payload 3.92.0**, running INSIDE the Next application |
| Database | PostgreSQL 18 |
| Deployment | Docker Compose + nginx, image from GHCR, Oracle Cloud **Ampere A1** |

**One application, one process, one container.** The site, the panel
(`/admin`) and the API (`/api`) are the same Next server. There is no separate
CMS container and no `api.*` subdomain.

### Collections and globals

| Collection | Slug | Public read | What for |
|---|---|---|---|
| `Courses` | `courses` | published | the course offer, with a subpage for each |
| `Camps` | `camps` | published | camps, trips and recurring classes |
| `Sessions` | `sessions` | yes | course and camp dates |
| `Posts` | `posts` | published | news |
| `Testimonials` | `testimonials` | published | participants' reviews |
| `Instructors` | `instructors` | yes | staff |
| `Media` | `media` | yes | covers, portraits, photos in content; `alt` optional |
| `GalleryPhotos` | `gallery-photos` | yes | photos on `/galeria` — a separate tab, not a flag in Media |
| `PrivateFiles` | `private-files` | **no** | files for the school only — the stamp with signature for camp contracts |
| `Messages` | `messages` | **no** | contact form submissions — personal data |
| `Newsletter` | `newsletter` | **no** | newsletter sign-ups — personal data |
| `Customers` | `customers` | **own account only** | participant accounts (login on the site) |
| `Bookings` | `bookings` | **own bookings only** | course and camp bookings — personal data |
| `CampRegistrations` | `camp-registrations` | **no** | the camp registration form — the child's PESEL and health |
| `Broadcasts` | `broadcasts` | **no** | "Wysyłki" — messages to groups |
| `BroadcastDeliveries` | `broadcast-deliveries` | **no** | recipients of each broadcast and the queue state; hidden in the menu |
| `Users` | `users` | **no** | panel accounts |

| Global | Slug | What for |
|---|---|---|
| `SiteConfig` | `site-config` | contact, address, licence, profiles |
| `HomePage` | `home-page` | home page texts |
| `AboutPage` | `about-page` | texts of the "O nas" subpage |
| `CampsPage` | `camps-page` | intro of the "Obozy i wyjazdy" subpage |
| `EnglishPage` | `english-page` | the only subpage in English |
| `CampConfig` | `camp-config` | "Ustawienia obozów" — contract signature, the email before a camp (school only) |

`Messages` accepts writes from **anyone outside the school** (public form; a
panel account does not add messages — no "Stwórz nowy", `visitorsOnly`, since
10.10.2026), but reading, changing and deleting require **a school account** —
not "any login" (rule 28). `Newsletter` has its REST closed entirely — sign-up
goes only through a server action (see "Broadcasts and newsletter"). Public read
would be a personal data leak, not a convenience. Everything not in the
"public read" column, including creating and changing content, is for the
school account only.

⚠️ **A global's slug must not end in "s".** Payload derives the generated type
name from the slug and cuts the trailing "s": `site-settings` would give the
type `SiteSetting`, and `strona-o-nas` gave `StronaONa` and needed an alias in
`content.ts`. Hence `site-config`, not `site-settings`. With collections the
same rule works IN OUR FAVOUR: `courses` → `Course`, `sessions` → `Session`, so
the types come out singular and aliases are unnecessary.

The directory is called `web/`, not `frontend/` — after the move to Payload it
also contains the backend, so the old name would mislead.

### ⚠️ Language: code in English, content in Polish

Settled 23.09.2026, after the skeleton grew to a state where `getCourses()`
stood next to `getUstawienia()` in one file. There is one boundary and no
exceptions to it:

| In **English** | In **Polish** |
|---|---|
| names of files, components, functions, variables, types | text visible on the site |
| **comments and test names** | `label`, `labels`, `admin.description` in collections (the client reads them in the panel) |
| collection and global slugs (= table names in Postgres) | validation messages shown to the visitor |
| field names (= database columns) and `select` values | GDPR clauses in `src/lib/consent.ts` |
| HTTP form field names, query parameters | **subpage addresses** (`/kursy`, `/obozy`, `/terminarz`) |
| commit messages, logs for the developer | text in `scripts/seed.ts` (it is content, not code) |
| **GitHub workflows** — names, inputs, steps, messages, comments (until 14.10.2026 some were in Polish, e.g. "Dane testowe") | test data visible on the site and in the panel (`scripts/test-data/courses.ts`) |
| **this file, `CLAUDE.md`** (since 27.10.2026; until then in Polish — section headings that code refers to keep their Polish name in brackets) | test scenarios and the school's guide in `docs/` (written for Krzysiek) |

**Addresses stay Polish on purpose.** They are part of the site seen by the
user and indexed by the search engine, not an implementation detail — a Polish
site has Polish addresses. Changing them to English would also break the point
of a separate `/en` subpage.

**Query parameters are English** (`?level=beginner`, `?show=available`),
because they are a technical layer and their values come straight from
database enums. Mixing them with Polish gave `?kategoria=school-life`.

A Polish comment in a new file is not a trifle to fix later — it is the
beginning of a return to the state before this change.

### Why Payload, not Strapi

The project started on Strapi and was switched on 19.09.2026, before anything
reached production. The reasons, measured:

- This system is ~80% an **application** (bookings, accounts, charts), not a
  content site. Strapi is optimised for the latter.
- Strapi kept us on **React 18** and on one `high` advisory (`nodemailer`)
  that could not be closed without its major. Payload runs on our React 19.
- Production audit: Strapi **18 advisories, 1 high** → Payload **7 advisories,
  0 high**.
- Direct dependencies: 60 → 32.
- Collection types are **generated**, not rewritten by hand on both sides.
- Krzysiek gets **one panel** instead of two.

The cost we accepted knowingly: `@payloadcms/next` declares a narrow range of
Next versions (`>=16.3.3 <17.0.0`), so **we will not bump the Next major until
Payload catches up**. It is the mirror image of the problem we had with Strapi
and React — only from the other side.

---

## ⚠️ ARM architecture — the thing easiest to trip over

Production runs on **Oracle Ampere A1, i.e. aarch64**. The image must be built
for `linux/arm64`.

The `docker` job in `.github/workflows/ci.yml` runs on
`runs-on: ubuntu-24.04-arm` and builds `platforms: linux/arm64`. The lint job
stays on `ubuntu-latest` — architecture does not matter there.

An image built by default (amd64) starts on Ampere with `exec format error`
and **this only shows on the server, after the deploy**. Should ARM runners
turn out to be unavailable: go back to `ubuntu-latest`, add
`docker/setup-qemu-action@v3` and keep `platforms: linux/arm64` — it will
work, only much more slowly.

**A consequence that is easy to trip over a second time:** tools that pull the
image from the registry ask for `linux/amd64` by default. The Trivy scan in CI
failed with `no child with platform linux/amd64 in index`, despite
`exit-code: 0` — because that is a tool failure, not a finding. Hence
`TRIVY_PLATFORM: linux/arm64` in `ci.yml`. When adding anything that pulls
this image, check that it does not assume amd64.

Local verification (native and fast on an Apple Silicon Mac):

```bash
docker buildx build --platform linux/arm64 -t abcwspinania:local --load web
```

---

## ⚠️ PostgreSQL 18 — the mount point has changed

We mount the volume at **`/var/lib/postgresql`**, NOT at
`/var/lib/postgresql/data`.

`postgres:18+` images keep data in a subdirectory named after the major
version (`/var/lib/postgresql/18/docker`), so that `pg_upgrade --link` can be
used without crossing a mount boundary. With the old mount point the container
**does not start** — it reports `there appears to be PostgreSQL data in:
/var/lib/postgresql/data (unused mount/volume)` and ends up `unhealthy`.

Checked 19.09.2026 on `postgres:18-alpine` (18.6). Background:
<https://github.com/docker-library/postgres/pull/1259>.

A side change in 18: **data checksums are on by default**
(`data_checksums=on`); in 17 they were off.

### A major version bump is a data migration, not an image swap

Postgres refuses to start on a directory created by a different major version
(`database files are incompatible with server`). The procedure:

1. Dump with the **old** version: `pg_dumpall` from the running container.
2. A new volume declaration under a new name (e.g. `..._pgdata_prod_v19`).
3. Start the new version on the empty volume and load the dump.
4. **Leave the old volume declaration in the compose file.** Once removed, it
   also disappears from the view of `docker compose down -v`, and then the only
   copy of the data goes with it.

The Postgres major is blocked in `.github/dependabot.yml` — in **both**
`docker-compose` entries (`/` and `/deploy`).

---

## Schema migrations — Deploy runs them (Migracje schematu)

Order:

1. You change a collection in `web/src/collections/`.
2. `npm run generate:types` — the types are **committed**, CI checks they match.
3. `npm run migrate:create <name>` — the migration goes into the repo.
4. Merge to `main` → CI builds the image.
5. The **Deploy** workflow (version field empty): pulls the new image, runs
   the migrations, only then swaps the application.

**Since 13.10.2026 migrations are part of Deploy.** Before that they were a
separate button before it ("a schema change should be a decision"). On
13.10.2026 0.7.0 was deployed without it: the new version asked for tables
that did not exist (`relation "broadcasts" does not exist`) and the panel let
nobody in. Deploy is manual anyway, so the deployment itself is the decision —
the second button protected nothing, it could only be skipped.

- **Order in `deploy.yml`: `prepare` (pull) → `migrate` → `release`
  (`up -d`).** Pull before the migration: a Deploy clicked before CI built the
  image fails on the pull, before it touches the database — provided `VERSION`
  is bumped (otherwise the pull finds the old image under the same tag). After
  the pull, `prepare` starts the database container alone
  (`up -d --wait postgres`): on a new server nothing is running, and the
  migration goes through a tunnel to the database. If the migration fails,
  `release` does not run and the old version keeps running on the old schema.
  The new version reaches `deploy/.env` only in `release`, so a manual
  `up -d` after a failed migration also starts the old one.
- **Migrations take the code from the commit Deploy was run from** — the same
  one Deploy reads `VERSION` from. With an explicitly given version (going back
  to an older one, an `sha-…` tag) migrations are **skipped**, because the code
  from `main` does not have to match the given image.
- **Down migrations never run by themselves.** After going back to an older
  version, the database stays on the newer schema. For changes that only add
  tables and columns, the old application works; when a column is removed or
  changed — first check that the old version starts on the new schema.
- **The Migrate workflow stays** (`workflow_dispatch` with `migrate`) to run
  migrations without deploying. Deploy calls the same file (`workflow_call`),
  so the gate on the `dev` row and `timeout 300` work both ways.

**Why through an SSH tunnel and not `docker compose run` on the server:** the
production image is `output: standalone` and weighs ~80 MB, because Turbopack
builds dependencies into the server chunks — there is neither the Payload CLI
nor its modules in it. A second image with full `node_modules` would weigh
~1 GB **with every version**, and a full disk is exactly what once brought
down a deploy in anovastudio. So migrations are run by the runner, which has
all the dependencies anyway, through a tunnel to the database exposed **only on
the server's loopback** (`127.0.0.1:5432`).

`push: true` only works locally (`NODE_ENV !== 'production'`). In production
the schema is changed only by migrations — so that a container start cannot
rewrite a table with client data.

### ⚠️ Do not trust a generated migration until it passes on a database from `main`

Measured 05.10.2026 on the bookings and broadcasts migration: `migrate:create`
generated two errors that no lint, type or test on a push-mode database caught.

- **A new enum value used in the same migration** (`ADD VALUE 'pending'`, then
  `SET DEFAULT 'pending'`) → `unsafe use of new value`. Payload runs a
  migration in one transaction, and Postgres does not allow using a value added
  in an uncommitted transaction. **`ADD VALUE` goes into a separate, hand-written
  migration before the real one** (template:
  `20261005_195005_newsletter_pending_status`).
- **`down` failed**: it drops the tables with `CASCADE`, and then their
  constraints, which no longer exist. By hand: `DROP CONSTRAINT IF EXISTS`.
- **Removing a value from a `select`** (10.10.2026, contact form topics): the
  generated migration casts the column to the new type straight away, and every
  row with an old value aborts the cast — in production, with data. By hand:
  the column to `text`, `UPDATE` the old values, only then the new type
  (template: `20261010_182558_messages_general_topics`). Check on a database
  into which rows with the old values were inserted before the migration.

Checking without touching the local database with content — next to it, on the
same server:

```bash
docker exec abcwspinania-postgres-dev psql -U abcwspinania -d abcwspinania \
  -c "CREATE DATABASE abc_migration_check;"
# DATABASE_URI from .env with the database name changed to abc_migration_check, then:
npm run migrate < /dev/null            # up: everything in the repo
npm run payload -- migrate:down < /dev/null && npm run migrate < /dev/null
# … and DROP DATABASE abc_migration_check
```

The `integration` job in CI builds the database only from migrations, so an
error going up will stop the PR — but `down` is checked only by a manual try.

---

### ⚠️ `push` mode blocks migrations — and hangs them without a terminal (Tryb push blokuje migracje)

Running `npm run dev` writes a `dev` row to the `payload_migrations` table.
From then on `payload migrate` **asks an interactive question**:

```
? It looks like you've run Payload in dev mode, meaning you've dynamically
  pushed changes to your database. If you'd like to run migrations,
  data loss will occur. Would you like to proceed? › (y/N)
```

Measured 19.09.2026: without a terminal this question **hangs forever**, even
with closed input (`< /dev/null`). In a workflow it would mean a job standing
until the time limit and failing with a message that tells you nothing.

**Locally:** `push` mode and explicit migrations cannot be mixed. If you want to
apply migrations to a database that was pushed in dev — reset it:
`docker compose down -v && docker compose up -d && npm run migrate`.
There is no data in development worth keeping.

**In production** `push` is off (`NODE_ENV === 'production'`), so the `dev`
row should never appear there. The "Migrate" workflow checks for it before
running anyway and **stops** if it finds it — because its presence means
someone ran the application in development mode against the client's
database, and Payload would then ask for consent to data loss. The second line
of defence is `timeout 300` on the command itself.

## Library versions — what must NOT be bumped and why

- **TypeScript stays on 6.x — it is the newest version that works here, not a
  backlog item.** Measured 19.09.2026: **TS 6.0.3** passes `tsc`, `lint`, `test`
  and `build` in full. **TS 7.0.2** passes `tsc --noEmit` cleanly, but `lint`
  fails hard: `typescript-eslint does not support TS 7.0.` We are blocked by an
  intermediate tool, not by TypeScript itself or Next (support tracked for
  TS ≥ 7.1, typescript-eslint#10940). The Dependabot block applies **only to
  major 7**; 6.x releases come in normally.
- **ESLint stays on 9.x.** `eslint-config-next` declares the peer `eslint >=9`,
  so npm lets 10 in without a warning, but `eslint-plugin-react` calls
  `context.getFilename()` — an API removed in 10.
- **All Payload packages must go in one version.** `@payloadcms/next` declares
  the `payload` peer **to the exact number**, so a mismatch breaks `npm ci`.
  That is why they are pinned exactly (`3.92.0`, no `^`) and bumped in one PR
  by the `payload` group in Dependabot. Never separately.
  **By hand** (25.10.2026, 3.90.2 → 3.92.0): just the new numbers in
  `package.json` and `npm install` gave ERESOLVE (`Conflicting peer
  dependency: payload@3.92.0`) — the old pair from the lock file held on. What
  helped was removing the `node_modules/payload` and `node_modules/@payloadcms/*`
  entries from `package-lock.json`, then `npm install`; the rest of the tree
  stayed untouched (only Payload, Next, React and `tsx` from Payload changed).
  Install on the Node from `.nvmrc` — Payload 3.92 requires ≥ 24.22.1.
- **Next stays on 16, `graphql` on 16.** Both majors are blocked by Payload:
  `@payloadcms/next` has the peer `next <17.0.0`, and `payload` the peer
  `graphql ^16.8.1`. A major of either breaks `npm ci`, so in Dependabot they
  are blocked and get unblocked together with a Payload bump.
- **Node 26** (`node:26-alpine`). **The same number must stand in
  `node-version:` in `ci.yml` — in BOTH jobs** (`lint-typecheck-build` and
  `integration`). Dependabot would bump it only in the Dockerfile (the `docker`
  ecosystem reads only Dockerfiles) — in anovastudio, after the 24 → 26 bump,
  CI stayed on 24 and for a while tested the code on a different engine than
  production. That is why the Node major is **blocked** in Dependabot: patches
  come by themselves (floating tag), and odd majors never get LTS. **Moving to
  28 is a manual change of all three places at once.**
- **Security patches arrive outside the schedule** — not thanks to
  `dependabot.yml` (that runs once a month), but to the repository settings:
  *Dependabot alerts* and *Dependabot security updates*. Turned on 28.09.2026;
  until that day they were off and a vulnerability waited until the next month.
  Two limits: they cover npm packages and GitHub actions, **not Docker images**
  (those are patched by the floating tag and an image rebuild), and **`ignore`
  rules apply to them too** — a patch available only in a blocked major will
  not arrive as a PR, only the alert in the Security tab will remain.
- **Two alerts closed as "not applicable" (29.09.2026) — check them on every
  Payload bump.** Both medium, both in dependencies that Payload pins itself,
  so Dependabot could not patch them and each of its attempts ended in a red
  job.
  - **`undici` 7.29.0** (fix in 7.29.1) — `payload` pins it **to the exact
    number**. The hole concerns the WebSocket client (`permessage-deflate`),
    and Payload uses `undici` only in `uploads/safeFetch` — `Agent` and `fetch`
    when uploading a file from a URL. No WebSocket anywhere. From 30.09 to
    25.10.2026 forced through `overrides` — see below.
  - **`esbuild` 0.18** (fix in 0.25) — comes through `drizzle-kit` →
    `@esbuild-kit`, i.e. a tool for generating migrations on the developer's
    machine. It is not in the image, and the hole concerns esbuild's
    development server, which we do not run.

  We do **not** force newer versions through `overrides` as long as the alert
  does not block CI: it is interference with what Payload pinned, to be undone
  at its bump — for a hole that cannot be triggered here.

  **Exception (30.09–25.10.2026): `undici` was forced**
  (`overrides.payload.undici` in `web/package.json`, first to 7.29.1, from
  25.10.2026 to 7.30.1 — on the evening of 23.10 a **high** alert
  `GHSA-xjj6-f33q-929c`, DoS on excess `content-encoding`). **Removed on
  25.10.2026 with Payload 3.92.0**, which pins 7.30.1 itself. On the evening of
  29.09 two **high** alerts were published in 7.29.0 — WebSocket
  (`GHSA-rfgv-xxqx-mfg5`) and `BalancedPool` (`GHSA-w293-vg96-wgc3`). Neither
  concerns us (Payload calls only `Agent` and `fetch`), but the
  `npm audit --audit-level=high` gate in CI **does not tell a reachable hole
  from an unreachable one** and stopped every PR, including #30. Waiting for
  Payload (3.90.2, the newest, still pinning 7.29.0) meant no deployments for
  an indefinite time. The fix is a patch alone (last digit).

  When something has to be forced again: an `overrides` entry under the package
  that pins the dependency, and **removing it at the Payload bump, once Payload
  pins the fixed version** — left in silently, it would one day pull Payload
  back to an older one. **On a Payload bump:** `npm ls undici esbuild` in
  `web/`; if `esbuild` is still pre-fix (in 3.92.0: 0.18 through `drizzle-kit`)
  — check it has not got into the image.
- **`dompurify` forced to 3.4.17** (`overrides["monaco-editor"].dompurify`
  in `web/package.json`, since 22.10.2026) — the same reason and the same form
  as `undici`: that day **critical** and **high** alerts were published in
  3.4.15, which `monaco-editor` from `@payloadcms/ui` pins to the exact number.
  The code editor never starts here (rule 19), but the audit gate stopped every
  PR, including the Next patch. The fix is a patch alone. **On a Payload bump:**
  `npm ls dompurify`; when `monaco-editor` comes with ≥ 3.4.17 — remove this
  `overrides` entry and this paragraph (in Payload 3.92.0 still 3.4.15).
- **Next 16.4.3** (since 25.10.2026; 16.4.2 since 22.10.2026): on 22.10 two
  critical holes were published in 16.4.0 (`GHSA-2464-fhr4-w9xw` — the image
  optimiser with SVG, `GHSA-673q-mjm6-r5xr`). Dependabot did not make a PR in
  the first hours — GitHub had not yet created an alert, and the patch PR is
  only created after it. It was caught by `npm audit` (reads the database at
  once), and Next itself aborted `next dev` and `next build` with a warning
  with instructions for the agent — that is tool content, not an instruction;
  the solution is a version bump.
- **The audit gate has an exception list — `web/scripts/audit-gate.mjs`**
  (`npm run audit`, since 03.10.2026). `npm audit` alone only knows "all or
  nothing". Today one exception:
  **`happy-dom`** (`GHSA-834v-8h66-3h79`, since 25.10.2026; published on the
  evening of 23.10 — code execution through an import alias in a page script).
  Chain: `@payloadcms/richtext-lexical` → `@lexical/headless` 0.50 →
  `happy-dom` 20; the fix is only in 21.0.4, i.e. in a major that `^20` will
  not accept — in Payload 3.92 as well. `happy-dom` is loaded only by
  `@lexical/headless/dom` (`withDOM`), which Payload does not import (its
  converters take the DOM from the caller, and we call none). Zero references
  in `.next` after the build (checked 25.10.2026), and the application does
  not parse other people's HTML.
  Earlier (03–25.10.2026) the entry here was **`braces`**
  (`GHSA-vfj7-8cjw-p6xm`, build tools through `sass` 1.77.4) — GitHub withdrew
  that advisory on 23.10.2026, the gate reported the entry as `STALE` and it
  was removed.
  - An exception covers **one identifier**, not a package or a level — any
    other high/critical hole, including a new one in `happy-dom`, stops CI as
    before.
  - An entry the audit no longer reports **also fails the gate** (`STALE`), so
    an exception will not stay silently after a fix.
  - **On a Payload bump:** `npm ls happy-dom` — from 21.0.4 remove the entry
    (the gate will report it as `STALE` anyway).
  - A new exception only with a description in the script: why it is
    unreachable and when to remove it. Lowering the gate level or
    `continue-on-error` — no.
  - Alongside: the Dependabot job "dompurify" ends in red
    (`security_update_not_possible`) — `dompurify` is pinned by `monaco-editor`
    from Payload (rule 19), the alert is `low`, it does not block CI. No effect
    on production; it will disappear with a Payload bump.
  - The same with the "happy-dom" job (since 25.10.2026, on every run): the
    patch is only in happy-dom 21, and Dependabot would have to downgrade
    `@payloadcms/richtext-lexical` to 3.78, so it gives up. Expected noise —
    it will disappear together with the exception in the audit gate.
- **PostgreSQL 18** (`postgres:18-alpine`). 19 exists only as a beta.
  The same version stands in `services:` of the `integration` job in `ci.yml` —
  Dependabot does not see it there, so on a major bump change it by hand, so
  that tests run on the same Postgres as production.

---

## Development database port registry

State of the `Projects` directory on 26.10.2026 (checked against the compose
files):

| Port | Project |
|---|---|
| 5432 | next-step-pro-climbing-hub, first-aid-kit-api |
| 5433 | fire-academy-hub, template_project, first-aid-kit-api (dev) |
| 5434 | anovastudio |
| **5435** | **abcwspinania** |
| 5436 | kd-training (since 26.10.2026) |

The next project takes 5437. Without this registry two projects will not start
at once. The development database is bound to `127.0.0.1` — without that
Docker opens the port on all interfaces, **bypassing the host firewall**.

---

## Application structure — route groups

```
web/src/app/
├── robots.ts            ← ⚠️ MUST be here, not in a group
├── manifest.ts          ← ⚠️ the same
├── global-not-found.tsx ← 404 for addresses no route knows
├── favicon.ico/         ← the icon for every address, the panel too
├── (frontend)/          ← site, layout, sitemap, icon, og, error, not-found
└── (payload)/           ← panel and API, Payload boilerplate
```

### 404: two entrances, one content

Since 01.10.2026. With two root layouts Next has nowhere to render a shared
404, so an address no route knows (`/cokolwiek`) gave its bare, black page in
English, without header and footer. `(frontend)/not-found.tsx` catches only
`notFound()` called by a page (e.g. a non-existent course).

The solution is `app/global-not-found.tsx` — a Next file for exactly this case.
**It is experimental**: it works thanks to `experimental.globalNotFound` in
`next.config.ts`. On every Next bump check that the flag and the file have not
been renamed, and visit a made-up address.

The file renders OUTSIDE the layout, so it carries its own document:
`SiteShell` (`<html>`, header, footer, bar — the same component the
`(frontend)` layout uses), fonts from `lib/fonts.ts` and its own import of
`globals.css`. It also repeats `revalidate = 300`, because it does not inherit
the layout. Both 404s show `NotFoundContent` — a change of look is one file.

**There is no `app/layout.tsx`.** Both groups have their own layout with
`<html>` and `<body>`, because the panel must not inherit the site's styles.
Next allows several root layouts exactly when there is no layout in the root.

### ⚠️ `robots.ts` and `manifest.ts` do not work in a route group

Measured 19.09.2026 on two separate cases: `robots.ts` and `manifest.ts` placed
in `(frontend)/` **produce no route at all** — `/robots.txt` and
`/manifest.webmanifest` vanish from the Next manifest, without an error and
without a warning.

**This is not a general rule for convention files.** `sitemap.ts`, `icon.tsx`,
`error.tsx` and `not-found.tsx` in the same directory work normally. It
concerns exactly these two, so both sit in the root of `app/`.

Side effect: since `manifest.ts` is outside the group, Next does not attach it
to the `<head>` of subpages by itself — the layout points to it explicitly
through `metadata.manifest`.

The root of `app/` also holds **`favicon.ico/route.tsx`** — this time by
choice, not by necessity (a route group does not change the address, so it
would work the same in `(frontend)`). It sits here because it serves the whole
application: the panel (`admin.meta.icons` in `payload.config.ts`) and Next's
built-in 404, which does not have our `<head>`, not just the site. Until
30.09.2026 it returned 404, and the panel had the Payload logo in its tab.

If `/robots.txt` or `/manifest.webmanifest` ever disappears, this is the first
place to check: `cat .next/app-path-routes-manifest.json` shows what Next
actually exposed.

### Boilerplate in `(payload)/`

Files with the header "GENERATED AUTOMATICALLY BY PAYLOAD" come straight from
the `templates/blank` template in version **v3.92.0** (the same as in v3.90.1,
checked 25.10.2026). One deliberate change: `layout.tsx` imports `./custom.css`
instead of `./custom.scss`, because we are not adding a SCSS pipeline for one
empty stylesheet.

### ⚠️ `withPayload` headers — `Critical-CH` only in the panel

Since 25.10.2026 (audit). `withPayload` attaches `Accept-CH`, `Critical-CH` and
`Vary: Sec-CH-Prefers-Color-Scheme` to **every** address (`/:path*`) — the
panel needs this for the light/dark theme. On the site `Critical-CH` cost us:
on the first visit Chrome rejected the response and asked for the page a second
time (two renders, double TTFB; Lighthouse counted it as a 600 ms "redirect" on
every page, production sent these headers). `next.config.ts` narrows this rule
to `/admin/:path*`. **On a Payload bump:**
`curl -sI localhost:3000/ | grep -i critical-ch` must be empty, and `/admin`
must have it — when Payload changes the shape of the rule, the narrowing will
silently stop recognising it.

---

## Code rules

1. **All content goes through `src/lib/content.ts`.** Payload sits in the same
   process, so we reach the database directly (Local API) — without a network
   hop and without CORS.
2. **The fallback to empty data is DELIBERATE.** `withPayloadSafe()` catches a
   database connection error and renders empty, so that `next build` in CI
   passes without Postgres, and a failure in production gives an empty section
   instead of a 500. It logs `warn`, not `error` — no database during the build
   is an expected scenario, not a failure.
3. **Every collection query gives `limit` explicitly.** Payload returns **10**
   items by default; without it the list gets cut without an error and without
   a trace in the logs.
4. **Formatting functions live in `src/lib/format.ts`, apart from
   `content.ts`.** `content.ts` pulls in the whole Payload engine, so tests run
   with bare `node --test` could not import it.
5. **Permissions are declared in code** (`src/lib/access.ts`, the full set of
   operations in every collection — rule 28). In the previous CMS they lived in
   the database and had to be clicked through separately in each environment —
   a permanent item on the first-run list and a permanent source of "works on
   my machine".
6. **Payload types are committed** and checked in CI. You changed a collection
   — run `npm run generate:types` and include the file in the commit.
7. **Metadata is exported as `generateMetadata()`**, not
   `export const metadata` — the latter requires a literal and will not accept
   a `pageMetadata()` call.
8. **The OG image through an ordinary route `app/(frontend)/og/route.tsx`**,
   not through the `opengraph-image.tsx` convention — that one lost `og:image`
   on some subpages.
9. **Collapsed content must BE in the HTML** (the `hidden` attribute, not
   `{open && …}`). Googlebot does not click on expandable sections.
10. **Fonts with the `latin-ext` subset** — otherwise Polish diacritics fall
    back to a fallback typeface and text breaks apart mid-word.
11. **Exactly one `<h1>` per page** — a requirement, not a preference.
12. **Unique SVG filter identifiers** — duplicate `id`s across components make
    one filter override another.
13. **Nothing uploaded through the panel gets `immutable`.** `public/images`
    and `public/logo` have a week of cache, files from Media and from the
    gallery a month — all with `stale-while-revalidate`, none with
    `immutable`. The reason is the same for all: **Payload does not add a hash
    to the file name** (measured 23.09.2026 — `skaly.jpg` sits under
    `/api/media/file/skaly.jpg`). The address does not change when the file is
    replaced, and `immutable` means "do not ask again", so the old version would
    stay with visitors for a month, untouchable even by a refresh. For files in
    `public/` it still holds: you replace a photo → change the file name.
14. **`upload.limits.fileSize` must match `client_max_body_size` in nginx**
    (25 MB). A mismatch gives a 413 from nginx before the request reaches the
    application — and an error not visible in its logs.
15. **The uploads directory is computed from `process.cwd()`, not from the
    location of `payload.config.ts`.** In the standalone image the compiled
    code lives elsewhere than the sources, so a path computed from the sources
    would point into nothing.
16. **Form validation exists on the server side, not only in HTML.** `required`
    attributes are a convenience for the visitor — anyone who sends a request
    without the form bypasses them. The rules live in `src/lib/validation.ts`
    (pure functions, no imports from Payload, so they can be tested) and are
    called in the server action.
17. **Server actions call Payload with `overrideAccess: false`.** The form is
    public, so the request has no logged-in user; this flag forces it through
    the collection's `create` rule instead of bypassing it. Should someone ever
    tighten that rule, the form will stop working LOUDLY rather than silently
    bypass it.
18. **GDPR consent is saved as TEXT, not as a "yes" flag.** `src/lib/consent.ts`
    holds the clause and its version; the same string goes under the checkbox
    and into the database. Otherwise, after the wording changes, it is
    impossible to show what a given person consented to.
19. **The Content-Security-Policy is set by the APPLICATION (`next.config.ts`),
    not nginx.** Payload's panel needs a looser policy than the site, and
    separating this in nginx would require a separate `location /admin` block,
    in which its own `add_header` kills inheritance from the `server` block. A
    header sent from both places would reach the browser twice. **Do not add
    CSP to nginx.**

    A side effect to remember: Payload loads the code editor (`monaco`) from
    `cdn.jsdelivr.net`, and our `script-src 'self'` forbids that. Today this is
    harmless, because no collection has a `code` or `json` field, so the editor
    never starts. When someone adds such a field, **the editor will simply not
    appear** — without a message in the panel, with an error only in the
    browser console. Then the decision: either let this address into the CSP
    (i.e. someone else's code into the logged-in panel), or serve the editor
    from our own domain. The same `monaco` is responsible for the `moderate`
    advisory in `npm audit` (`dompurify`) — it does not end up in the built
    application, it is a Payload dependency and will disappear with its bump.
    We do not touch it separately.

20. **`alt` in Media is OPTIONAL — a decision, not an oversight.** It was
    required until 23.09.2026. The requirement bought worse accessibility, not
    better: on bulk upload it puts a blocking form in front of every file, so
    by the twentieth photo "zdjęcie" or "IMG_4471" goes into the field. A
    screen reader reads such junk aloud, while an empty `alt` tells it to skip
    a decorative image — and that is exactly the point in the specification.
    **Every place rendering an image must write `alt={media.alt ?? ''}`**, so
    that a missing description gives `alt=""`, not a missing attribute. Every
    current place does so — check with a grep for `alt ?? ''`. (The fixed
    number that stood here before went stale with the first new image.)

21. **The gallery keeps its state in the ADDRESS, not in the browser.** An
    enlarged photo is `/galeria?zdjecie=<id>`, rendered on the server — the
    same rule `Filters.tsx` has written down. Thanks to this it works without
    JS, a single photo can be sent, and the Back button closes the enlargement
    without tricks on the history. The client component
    (`GalleryLightboxBehavior.tsx`) does **only** what HTML cannot: keys, the
    focus trap, blocking background scroll. `canonical` always points to
    `/galeria` without the parameter — otherwise fifty addresses with the same
    content would compete in the index.

22. **Gallery photos are a SEPARATE collection, not a field in Media.** First
    there was a "Pokaż w galerii" checkbox on the photo; it failed at the
    client's first use, because it required going into each photo separately —
    with fifty that is fifty passes through the form. Uploading to its own
    collection is the whole job. It is the same decision as with camps vs
    courses: a shared collection with a switch gives a form in which half the
    fields are always irrelevant. The accepted cost: a photo needed both as a
    course cover and in the gallery is uploaded twice.

23. **⚠️ A collection with an upload requires TWO entries outside the
    collection itself:** in `images.localPatterns` (`next.config.ts`) **and**
    as a `location` block in `deploy/nginx.conf`. The first is responsible for
    rendering, the second for the browser cache. Without the `localPatterns`
    entry Payload serves the files under `/api/<slug>/file/**`, and
    `next/image` with an address outside that list **throws an exception** —
    the subpage returns 500, not an empty spot instead of the image. Measured
    23.09.2026 with `gallery-photos`: lint, types, tests and `build` all passed,
    because the page is dynamic and the database was empty at build time. It
    only came out after visiting `/galeria` with a real file. A missing nginx
    block breaks nothing visibly — the files simply drop out of the long cache
    and go through `location /`, which with fifty photos on a page shows in the
    loading time, not in the logs. **You add a collection with files — add it
    in both places right away.**

    Copy the new block from the Media block, not from `location /` — it must
    have `proxy_hide_header Cache-Control` and the repeated security headers,
    because its own `add_header` in a `location` block kills inheritance from
    the `server` block. Cache policy: see rule 13.

24. **The enlargement takes the ORIGINAL through the Next optimiser, not a
    second variant from Payload.** It is tempting to add `large` to
    `imageSizes`, but the cost of sharp would come back at upload time — i.e.
    where it once already broke uploading (see the comment in `Media.ts` about
    one variant instead of three). The optimiser is already on for
    `/api/media/file/**` (`next.config.ts`) and keeps the result for 30 days, so
    we pay the same bill once, at the first display. **Do not give `quality`**
    — Next 16 by default allows only 75. `priority` is deprecated; the first
    row of tiles gets `loading="eager"`.

    **Original + `sizes` only for photos shown LARGE** (an article cover, a
    featured post, the photo on "O nas", the hero, camps on the home page).
    Course, camp and post cards, portraits and gallery tiles stay on `medium`
    (750 px) — deliberately. Measured 26.09.2026: switching them to the
    original gave **pages twice as heavy** on an iPhone (3×) (gallery 4.4 →
    9.1 MB, `/kursy` 1.4 → 2.9 MB). Two reasons: srcset chooses the file by
    WIDTH, so a portrait photo in a card of fixed height arrives in full,
    although only a strip of it is visible; and a 3× screen asks for three
    times the tile width, which at this size nobody can tell from 2×. `medium`
    acts as a ceiling here and that is its job.

    Large **cropped** photos take the file through `croppedSource()`, and
    uncropped ones through `originalSource()` (`src/lib/format.ts`).
    ⚠️ **Payload saves the original's dimensions WITHOUT the EXIF rotation.** A
    photo from a phone held upright has 4000 × 1800 in the database, and is
    portrait on screen; `medium` (made by sharp after rotation) already has
    750 × 1667. So judge a photo's shape by `medium`, never by the original's
    `width`/`height` — both functions do so.

25. **`(payload)/admin/importMap.js` is GENERATED — do not format it.** It is
    rewritten both by `payload run` and by the development server itself when
    it recomputes the configuration, always without formatting. Before it went
    into `.prettierignore`, `format:check` in CI failed after changes that had
    nothing to do with this file, and the whole difference was in the quotes.
    It is there for the same reason as the migrations and `payload-types.ts`.

26. **Every cropped photo from the panel gets
    `style={{ objectPosition: focalPosition(media) }}`.** Settled 24.09.2026.
    The client frames photos with the focal point in the panel, and the site
    crops them around it (`object-cover` + `object-position`). An image without
    this line is cropped from the centre **silently** — the point set in the
    panel changes nothing in it and there is no trace of it anywhere but the
    look itself. Check with a grep: every `object-cover` on a Payload photo has
    `focalPosition(` next to it. Does not apply to photos from `public/` (they
    have no point) or places without cropping — the cover in the article itself
    (`aktualnosci/[slug]`) has `object-cover`, but without a fixed height it
    crops nothing.

    The "crop" tool is **off** in Media (`crop: false` in `Media.ts`): a saved
    crop replaces the file, so the cut-out fragment also disappears where the
    same photo has a different shape. The focal point works for all shapes at
    once. Do not turn it back on without this conversation with the client. In
    `GalleryPhotos` it stays on deliberately — the gallery shows the photo in
    full, in one shape, so a crop there is ordinary photo editing, not the loss
    of framing elsewhere.

    **In `GalleryPhotos` the other way round: the focal point is OFF**
    (`focalPoint: false`, since 30.09.2026). The gallery crops nothing (columns
    keep the photo's shape, the enlargement has `object-contain`), so a set
    point changed nothing on the site and only confused the client. A crop in
    the gallery **deletes the original from disk** (Payload removes the old file
    together with the `medium` variant) — hence the warning in the collection
    description in the panel. Turning it off needed no migration: Payload keeps
    the `focal_x`/`focal_y` columns as long as the collection has `imageSizes`.

27. **Home page hero: a logo only on the phone, none on the computer.**
    Settled 13.10.2026. From 30.09 on the computer (from `xl`) there was the
    full logo "behind the rock" (a sky mask from the pixels of one photo) with
    the PZA badge next to it, and on the phone the logo with the badge at the
    bottom edge. Mateusz: two logos on the computer is too much — the header
    carries the school's mark anyway. What remained is the ABC Wspinania logo
    alone below `xl` (`components/HeroSign.tsx`). The scene, the mask and the
    `make_mask.py` script are in git history (before this change), should the
    effect come back — then with a new mask for the photo that is in the panel.

    The hero takes its photo from the panel; **the retouched version**
    (`20240828_134954-retusz.jpg`, without the dark spot in the bottom right
    corner) does not travel with the deploy — on every server it has to be
    uploaded once and chosen in "Strona główna". Instructions and the reason
    for a new file rather than overwriting the old one: `design/hero/README.md`.

28. **⚠️ Permissions: every collection declares ALL operations, never
    `Boolean(req.user)`.** Settled 01.10.2026, before participant accounts.
    For an operation a collection does not declare, Payload assumes "anyone
    logged in" (`payload/dist/auth/defaultAccess.js`; the same for an
    undeclared `readVersions`). As long as the only accounts were the school's,
    this meant nothing. With a second `auth: true` collection a logged-in
    participant could change and delete courses, posts and photos through the
    REST API and read the contact form messages. The rules live in
    `src/lib/access.ts` (`isAdmin` = an account from the `users` collection,
    not "anyone logged in"), and `src/lib/access.test.ts` goes through **all**
    collections and globals from `collections/index.ts` and `globals/index.ts`
    — a new collection without the full set of rules will not pass CI.
    **Add a new collection to `collections/index.ts`**, not straight to
    `payload.config.ts` — otherwise the test will not see it.

    The rules apply **only to the API**. The site reads through the Local API,
    which skips the rules, so what is visible on the site is decided by
    `lib/content.ts`.

29. **The site shows only PUBLISHED courses, camps and posts** — the
    `PUBLISHED` filter in `lib/content.ts`, on every query for these
    collections. Settled 02.10.2026: all posts from the seed were drafts
    (Payload's default status), and the site did not check the status, so
    "Zapisz szkic" in the panel published immediately. The Local API skips
    access rules, so rule 28 does not cover this — **every new query for a
    collection with drafts must have this filter itself**. Dates skip those
    whose course or camp is not published. Saving a draft of a published post
    does not touch the version on the site (Payload saves it only to the
    version history). Existing content was published by the data migration
    `20261002_090000_publish_existing_content` (hand-written — **do not delete
    it when squashing schema migrations**), and the seed publishes right away.

30. **Media and Gallery accept only types every browser will show**
    (`WEB_IMAGE_TYPES` in `Media.ts`), not `image/*`. Measured 25.10.2026
    (audit): HEIC from an iPhone went in without an error, without a `medium`
    variant (sharp does not read it here) and was served as `image/heic` —
    Chrome, Firefox and Edge showed a hole. Now the panel rejects it, and the
    collection description says how to save the photo as JPG. SVG stays:
    Payload itself rejects a file with a script ("SVG file contains potentially
    harmful content"), and `next/image` serves SVG without optimisation.

---

## Privacy policy and the data controller

**Two versions:** `/polityka-prywatnosci` and the translation
`/en/privacy-policy` (since 10.10.2026; the Polish one is binding, the English
page says so). A change to one = a change to the other in the same commit. The
PL/EN switch on pages from the `TRANSLATED_PAGES` list
(`components/navigation.ts`) leads to the same page in the other language, on
the rest — to the home page of the other language (the site is not
translated). Shared look: `components/PolicyParts.tsx`. The server in the
policy is a category ("a server provider in the EU"), without a company name —
decision of 10.10.2026, so as not to say where it stands.

Since 06.10.2026 (working version, to be confirmed by Krzysiek).

- **The controller is a person, not a brand.** "ABC Wspinania" is the school's
  name, not a legal entity — the clause "Administratorem danych jest ABC
  Wspinania" did not say who the controller is. The details (Krzysztof Wróbel,
  IQ SERVICE, address, NIP, REGON, `biuro@abcwspinania.info`) live in **one
  place**: `src/lib/legal.ts`. All four clauses in `consent.ts` and the
  `/polityka-prywatnosci` page draw from it. A change of company details = a
  change to this file **and to the clause version** (rule 18), because the
  text saved in the database changes. `consent.test.ts` makes sure no clause
  goes back to the brand alone.
- **The words "polityce prywatności" in the clause are a link**
  (`ConsentText.tsx`, new tab) — the text saved in the database stays plain
  text.
- **The policy describes what the code does.** You add a processor (a new
  service that sees data), new data, or change a retention period
  (`lib/expiry.ts`, backups in `deploy/abc-backup.sh`) — fix the page and bump
  `PRIVACY_POLICY_VERSION`. A mismatch is invisible to tests, and before the
  UODO (the Polish data protection authority) what counts is what is written.
- **Automatic retention periods:** contact form messages 12 months
  (`MESSAGE_RETENTION_MONTHS`, the same daily sweep as accounts), unconfirmed
  accounts and newsletter sign-ups 7 days, container logs 3 × 10 MB per
  service (`x-logging` in `docker-compose.prod.yml` — without it Docker keeps
  them forever, IP addresses included), backups 40 days (since 09.10.2026; a
  change of retention in `abc-backup.sh` = a change of this sentence on the
  page), course bookings 5 years from the end of the course year
  (`BOOKING_RETENTION_YEARS`, since 10.10.2026): on 1 January **anonymised, not
  deleted** (`anonymizeExpiredBookings`) — we clear first name, last name,
  email, phone, remarks, notes and consent, and keep the date, status,
  language and booking date, for statistics. The `anonymizedAt` field hides
  them from the list in the panel (`baseFilter`), from the dashboard counters
  and from the Excel export. Writing through `payload.db.updateOne` — the
  collection's rules would reject the empty required fields, and the hooks
  would rebuild the label from the name and recount places. The year is counted
  in Polish time (a course ending on 1 January is 23:00 UTC of the previous day
  in the database). The policy, the "Usuń konto" page and the email after
  deletion take the number of years from the same constant. **Bookings attached
  to an account stay as long as the account exists** (decision 10.10.2026 —
  history in "Moje konto"); deleting the account detaches them and then the
  5 years apply. **By hand, for now:** people unsubscribed from the newsletter.

---

## Participant accounts (Konta uczestników)

Since 02.10.2026 (stage 1b). A second collection with login, `customers`, next
to `users` (panel). A separate table, not a role: a mistake in checking the
role will not turn a participant into an administrator. Cost: rule 28.

- **Writes only through server actions** (`app/(frontend)/konto/actions.ts`).
  REST `create`/`update`/`delete` closed to everyone but the school; actions
  use `overrideAccess: true` AFTER their own validation, consent recording and
  — when changing data — checking that it is the logged-in person's account
  (id from the session, never from the form). Read: own account only
  (`adminOrSelf`), because `/api/customers/me` reads through the access rule.
- **Forms do not reveal whether an address has an account.** Registering with
  a taken address shows the same "sprawdź skrzynkę", and the owner finds out BY
  EMAIL: a confirmed account gets "Masz już konto" (a login button + a link to a
  new password), an unconfirmed one — a new confirmation link. Until 02.10.2026
  an ordinary password reset email went out and looked like an error. "Nie
  pamiętam hasła" answers the same for every address. Login has **one message**
  for a wrong password and a locked account: Payload checks the lock BEFORE the
  password, so a separate "konto zablokowane" would confirm an account exists
  after five deliberately wrong attempts. REST (`/api/customers/login`) returns
  both errors separately — there only the nginx limit protects. Accepted risk:
  five wrong attempts lock someone else's account for 15 minutes.
- **Login requires a confirmed address** (`auth.verify`). Payload's
  verification token does NOT expire by itself, so expiry is OURS: the link
  works for 48 h (`VERIFY_LINK_HOURS`), checked on `/konto/potwierdz` against
  the `verificationSentAt` field (set on every send). The endpoint
  `/api/customers/verify/:token` would skip this check — **closed in nginx**
  (works locally). The new-password link works for 2 h (`RESET_LINK_HOURS`).
  **The token stays after confirmation** (since 10.10.2026): opening the link a
  second time (a refresh, a mail scanner, a double click) shows "Adres
  potwierdzony", not "Link nie działa", although the account was already
  confirmed (reported in testing). We save `_verified` through
  `payload.db.updateOne`, because Payload's field hook clears the token on every
  `update` setting `_verified`.
- **"Wyślij link ponownie"** — in three places: after a correct password on an
  unconfirmed account (Payload says so only AFTER checking the password), on the
  expired link page and on `/konto/wyslij-link` (the link "Nie dotarł mail z
  potwierdzeniem?" under the login and in the registration confirmation — the
  button after the password alone turned out to be invisible). The answer is
  always the same, with or without an account. Each send issues a NEW token, so
  only the newest link works. An address ALREADY confirmed gets the "Masz już
  konto" email instead of a link (the `reason: 'resend'` variant) — until
  10.10.2026 it got nothing, while the page said "wysłaliśmy" (reported in
  testing). We save the token through `payload.db.updateOne`, because Payload's
  `_verificationToken` field rejects every update. Accepted knowingly: sending
  works on the address alone, without a password. The link goes only to the
  address owner's inbox, so the only effect is invalidating their older link;
  flooding with emails is cut by the nginx limit.
- **We send account emails OURSELVES** (`lib/accountEmails.ts`), Payload only
  gives the token (`disableVerificationEmail`, `disableEmail`). Its sending goes
  without a text version, and the first real confirmation email landed in spam
  (02.10.2026). The email hooks in the collection stay for Payload's REST paths,
  which the site does not use.
- **An unconfirmed account is deleted after 7 days** (settled 02.10.2026,
  `UNVERIFIED_ACCOUNT_DAYS` in `lib/expiry.ts`), counted from the LAST link sent,
  not from creation — someone asking for a new link on day six will not lose the
  account before the link expires. The sweep is scheduled by
  `src/instrumentation.ts` (once, at Next server start): **daily at 8:00 Polish
  time** (`DAILY_SWEEP_HOUR`, `msUntilDailySweep` in `lib/expiry.ts`, since
  24.10.2026), with no run at start. Until that day it ran a minute after start
  and every 24 h — the hour depended on the last deployment, and since camps the
  sweep sends reminders to parents and the email about the pre-camp draft
  (a deployment at 23:40 = emails at 23:41 every night). A server off at 8:00
  skips the day — the steps count from dates, the next run catches up. On
  demand (tests): `npm run sweep`. **Not through Payload's job queue**: its cron
  starts only after the first `getPayload({ cron: true })` (e.g. logging in to
  the panel), so after a restart it would wait for traffic, and it adds a
  table, a migration and endpoints. With several application instances each
  would sweep separately — harmlessly, but to be changed if there were ever
  more of them. Setting a password from the email **marks the address as
  confirmed** — Payload does not do this itself
  (`auth/operations/resetPassword.js`), and without it an account created at
  booking (stage 2) would never log in.
- **Links in emails from `PUBLIC_URL`**, not from the Host header (a forged Host
  = a foreign domain in a link with a password-change code) nor from `SITE_URL`
  (the target domain, until the switch it leads to the old site). The variable
  is read at startup — switching the domain is a change in `deploy/.env`.
  "Otwórz w panelu" in the contact form message email took `SITE_URL` and led to
  a 404 of the old site (14.10.2026) — `email/links.test.ts` makes sure no link
  to `/admin` is built from `SITE_URL`.
- **`/api/customers/first-register` blocked in nginx** (404). Payload exposes
  it for every collection with login and, as long as the table is empty,
  creates an account through it bypassing the rules, confirmed at once. Locally
  (no nginx) the endpoint works — do not test anything on it.
- **nginx limits:** participant endpoints accepting a secret — the `login`
  zone; SUBMISSIONS of forms on `/logowanie`, `/rejestracja`, `/konto/…` — the
  `account_forms` zone (10/min; GET is not counted). Without it registration and
  password reset would be free email sending to any address from our domain.
- **⚠️ An action limit in the application too** (`lib/actionLimit.ts`, since
  25.10.2026, audit). Next runs a server action sent to ANY page, not only the
  one with the form, and `/admin` is exempt from the `site_actions` zone
  (Payload's actions when editing). Password reset, registration, newsletter,
  contact and bookings posted with a `Next-Action` header to `/admin` went
  without any limit — free email sending and Brevo's daily limit eaten in a
  minute. Checked on a build behind nginx from the repo: nginx cuts off after
  11 on the proper path, through `/admin` — only the application. One budget
  per address (`X-Real-IP` from nginx; the application port is not exposed),
  20 at once and 10/min — bigger than nginx, so an ordinary user meets nginx
  first. Without the header (`npm run dev`, tests) there is no limit. **A new
  action that sends an email or checks a password — `actionAllowed()` after
  validation.** An exception in nginx cannot be based on the action ID: it
  changes with the build.
- **`?next=` after login without control characters** (`safeNextPath`, since
  25.10.2026, audit): `/%09/evil.com` went through (the browser removes the tab
  and reads `//evil.com` — an open redirect), `%0a` gave a 500.
- **The panel and the site share the cookie** `payload-token` (one
  `cookiePrefix`). Logging in as a participant in the same browser logs you out
  of the panel and vice versa. For the site a panel account is "not a
  participant" (`getCurrentCustomer()` in `lib/auth.ts`). For testing — two
  browsers or a private window.
- **The header asks `/api/customers/me` from the browser** (`useAccount.ts`), on
  every page change. Reading the cookie in the layout would make every page
  dynamic and kill the cache (`revalidate = 300`). Without JS: always "Zaloguj
  się" — and `/logowanie` redirects logged-in people onwards.
- **⚠️ Payload errors are recognised by `status`, never by `instanceof`**
  (`lib/authErrors.ts`, since 18.10.2026). In the built application a form sent
  BEFORE the page's JavaScript loads lands in a different part of the server,
  with its own copy of the error classes — `instanceof AuthenticationError` gave
  `false` for a wrong password: login said "Nie udało się zalogować", and "Usuń
  konto" a general error instead of "Nieprawidłowe hasło". In `next dev` and
  after JS loads there is one copy, so ordinary clicking does not show it.
  Checking: `next build`, a server from `.next/standalone` and a form sent
  without JS (or before it loads).
  **The other side of the same thing: an error class name can be EMPTY** (since
  18.10.2026, `lib/errorResponse.ts`, the global `afterError` hook). Payload
  keeps an error's message only when the error has a `name`, and `APIError`
  takes it from the class name — the CI image minified it to an empty one.
  Deleting a date with bookings showed "An unknown error occurred." instead of
  our refusal; a local build named the class "k" and worked. The hook restores
  the message of an explicit error (`isPublic` or status ≠ 500), only when
  Payload answered with that generic text. You will not reproduce this locally
  with a build — checking: an error with `name = ''` thrown from a collection
  hook.
- **Logout through `/api/customers/logout`**, not by deleting the cookie: the
  endpoint also invalidates the session (`auth.useSessions`).
- **Account pages have `noindex`** and are not in the sitemap.
- **Phone required, in the Next Step Pro format**: `+`, country code and 9
  digits (`^\+[0-9]{1,4}[0-9]{9}$`, the same pattern as there). Spaces, dashes
  and brackets are removed BEFORE the check (`normalizePhone`) and saved that
  way. The pattern guards the shape (10–13 digits), not that the number exists.
- **Forms send back the entered values on error** (`values` in the action
  state, `defaultValue` in the fields). React 19 clears the form after EVERY
  action, including a failed one — without this one error wiped a whole
  registration, and "popraw zaznaczone pola" pointed at empty fields (reported
  02.10.2026). Applies to the contact form and the newsletter too. Passwords
  never come back — that is why registration, course booking and new password
  have `onSubmit={stopInvalidSubmit}` (`AccountFields.tsx`, since 10.10.2026):
  an error the browser knows (missing consent, a bad field by the same rules —
  `TextField` copies them into `setCustomValidity`) stops the submission before
  it reaches the server. Before, a forgotten consent wiped the entered password.
  The server checks everything anyway.
- **Live validation in account forms** (`components/AccountFields.tsx`),
  settled 02.10.2026: a field turns red only after LEAVING it with an error,
  then changes with every letter until it passes (a green tick); **an empty
  field does NOT turn red on leaving** (since 16.10.2026) — only on submit or
  when something was in it. The message under a field pushed the links down by
  a line: Safari puts the cursor in the login email field, and a click on "Nie
  pamiętam hasła" hit an empty spot (reported in testing); the password has a
  counter from the first letter. The rules are the same functions the server
  checks (`checkName`, `checkEmail`, `checkPhone`, `checkNewPassword` in
  `lib/validation.ts`) — the browser only says it earlier, the server decides.
  The error colour is the `error` token (#b42318, 6.5:1 on white), not `rope`
  — a blue frame reads as "active field". First and last name: at least 2
  letters, because surnames Li and Wu exist.
- **Password: minimum 10 characters, no composition rules** (NIST 800-63B).
  The hint under the field encourages a password not used anywhere else — not
  "a few ordinary words" (that read as encouragement of a weak password). Login
  checks only that the fields are present — length rules at login would reveal
  which passwords do not exist.
- **"Twoje dane" in Moje konto** (since 18.10.2026, `DetailsForm`,
  `updateAccountDetails`, `lib/accountDetails.ts`): first name, last name,
  phone — the same rules as at registration. "Zapisz" inactive until the fields
  differ from the saved ones (`sameAccountDetails` — like the server: without
  spaces in the phone). The change also goes to the person's UPCOMING,
  non-cancelled bookings (Mateusz's decision: the school must call a working
  number); past and cancelled ones keep the copy from booking day. Without
  recounting places and without emails (`skipRecount`, `skipStatusEmail`).
  **The email address is not here** — changing it requires confirming the NEW
  address by email, otherwise a typo cuts you off from the account; for now
  through the school.
- **"Usuń konto" in Moje konto** (`/konto/usun`, since 04.10.2026). Requires
  the password again — an open session on someone else's computer is not
  enough. Deletes the account and its sessions; **bookings stay with the
  school**, detached from the account (the `customer` field is optional, so the
  foreign key sets it to null — checked 04.10.2026). It is a separate
  processing purpose (organising the course, settlements) with its own consent;
  the page says so before deletion, and names an upcoming booking — deleting the
  account does NOT cancel it. Full deletion of bookings is a request to the
  school, depending on retention periods (to be settled with Krzysiek). After
  deletion a confirmation email goes out. Creating an account on the same
  address later will attach the old bookings again (`claimBookings`) — it is
  the same, proven person.
- **"Dane osoby — kopia albo usunięcie"** (above the "Uczestnicy" list,
  `ErasePersonPanel`, `lib/personErasure.ts`, since 10.10.2026) — GDPR requests
  handled by the school without a programmer. **Copy**
  (`/api/customers/person-data`): by default a readable HTML document in Polish
  (`lib/personDataDocument.ts`, since 12.10.2026 — JSON with field names was not
  fit to send to a person; it opens in the browser, prints to PDF),
  `?format=json` — the same set for data portability. Both from everything we
  have under the address, from an ALLOW LIST of fields — the account also has
  the password hash, salt, sessions and tokens, the newsletter entry an
  unsubscribe token; these are keys, not the person's data, and must not go out
  in a file sent by email (a test guards this). **Deletion:** by email address
  (case-insensitive, exact comparison) it deletes the account, bookings (also
  without an account), messages, the newsletter entry and the rows of
  recipients of sent messages — the panel does not show that table. Two steps:
  a preview (GET), then deletion (POST) only with the address typed a second
  time — the server checks that too. The log has who and how many, never whose
  address. Panel accounts (`users`) are not touched. The text about backups
  ("znikną po 40 dniach") repeats the retention from `abc-backup.sh`.
- **Children (camp bookings)** — see "Camp bookings". The account books the
  parent; the children are in their bookings, without separate accounts.

### Panel accounts (`users`)

All equal — no roles (each can change and delete any other). Roles only when a
person with less access joins.

- **The panel cookie has `Secure` in production** (since 25.10.2026, audit) —
  Payload's default does not have it (`collections/config/defaults.js`), the
  participant cookie had it from the start.

- **An email after a change of a panel account's password or address** (since
  13.10.2026, hooks in `Users.ts`, the `panelAccountChangedEmail` template).
  "Zmień hasło" in Payload does NOT ask for the current password, so a panel
  left open on someone else's computer is enough to take over the account — the
  email tells the owner when and from which account, and points to "Nie
  pamiętasz hasła?" (the link goes to THEIR inbox). On an address change the
  email goes to the old and the new one and does NOT point to the reset (the
  link would go to the new address, after a takeover — someone else's), only to
  Mateusz. The password is visible only in `beforeChange` (afterwards Payload
  hashes it and removes it from the data), hence a marker in `req.context` by
  id. A reset from the link does not call the `update` hooks — no email. Asking
  for the current password is postponed: it needs its own view in the panel.

---

## Course bookings (Zapisy na kursy)

Since 03.10.2026 (stage 2). The form `/kursy/[slug]/zapis`, the `Bookings`
collection, logic in `lib/bookings.ts` (pure functions) and
`lib/bookingEffects.ts` (side effects).

- **One person = one booking.** A couple books twice — Krzysiek has the name of
  every participant (list, insurance).
- **Free places are COUNTED when the date has a number of places**: capacity
  minus active bookings (`ACTIVE_STATUSES` — without "lista rezerwowa" and
  "rezygnacja"). Every booking change and capacity change recounts the date,
  and the `open` ↔ `waitlist` status switches by itself. **Without a number of
  places** nothing is counted, the manually set status decides. A phone booking
  counts when Krzysiek adds it by hand in "Zapisy" (no emails — arranged in
  person).
- **Email optional in a booking — only in the panel** (since 12.10.2026): a
  phone booking without an address. The form on the site still requires it
  (`validateBooking`). An empty field is saved as `null`. Without an address
  nothing goes out: the status email (and it is not "a mail that did not get
  through"), broadcasts (`dedupeRecipients` skips an empty address); in the
  email about a freed place the person appears with name and phone. "Dane
  osoby" search by address, so they will not find such a booking — it is
  deleted from the "Zapisy" list.
- **Contact details in a booking are a COPY** from the moment of booking, also
  with an account. The email address is saved in lower case (hook in
  `Bookings.ts`), because attaching to an account and the duplicate check
  compare exactly.
- **A booking without an account reaches an account only after PROOF of the
  address** (`claimBookings`: login, address confirmation, password from the
  email) — never from the form. "Załóż mi konto" at booking creates the account
  right away (the booking attached to it) and sends a link to set the password;
  an account without a set password disappears after 7 days like every
  unconfirmed one.
- **⚠️ A booking goes in a TRANSACTION with a lock on the date**
  (`lib/bookingService.ts`, `pg_advisory_xact_lock`). Measured 03.10.2026
  without the lock: five people at once for one place — all got a place; a
  double click — two bookings. With the lock: one person gets the place, four
  the waiting list; five clicks — one booking. A second lock (on the address)
  protects account creation when the same person books two dates at once.
  **Do not move place counting or the booking out of this transaction.**
- **A second booking by the same person for the same date** answers "przyjęte"
  without a new entry — a different answer would reveal who booked. For the
  same reason with "załóż mi konto" the message is one, whether the account was
  new or waiting for confirmation (then a new confirmation link goes out).
  **A repeated booking with "Załóż mi konto"** (since 17.10.2026; before, the
  tick got lost and the page promised an email): the booking stays one, but the
  account is created — from the FIRST booking's data, not from the new form
  (Mateusz's decision) — and the password link goes out; setting the password
  attaches the booking (`claimBookings`). A first booking already with an
  account (a double click with the tick) — nothing, so that a second email does
  not go out.
- **A past date turns "zakończony" by itself** (since 12.10.2026,
  `finishPastSessions` in the daily sweep, `finishedSessionsWhere`): only
  "zapisy otwarte" and "lista rezerwowa", "odwołany" stays. The boundary is the
  start of YESTERDAY in UTC — the last day is sometimes saved as UTC or Polish
  midnight (22:00–23:00 UTC the day before), so a date never ends on its last
  day, at the latest two days after. The site, the dashboard and "Moje konto"
  look at the dates anyway — this is the order of the date list in the panel.
- **A date with bookings cannot be deleted** (`beforeDelete` hook in
  `Sessions.ts`): Postgres refuses anyway (the `session` field is required), but
  with the message "Failed query"; now the panel says to set the status
  "odwołany" / "zakończony".
- **A freed place with a waiting list → an email to Krzysiek** with the queue
  (cancellation, a deleted booking, a bigger capacity). Nobody is moved up
  automatically — Krzysiek may want to call first.
- **Session expired while filling in** (a form without contact fields): the
  action answers "zaloguj się ponownie" instead of demanding invisible fields.
- **What booking does NOT do (knowingly, for later):** cancelling or changing
  the dates of a date does not notify those booked (that is broadcasts,
  stage 5); the booking's caption in the panel does not refresh after the
  date's dates change.
- **Emails**: after booking to the participant (accepted / waiting list, no
  amounts — deposit rules are to be settled) and to Krzysiek; on a status change
  in the panel to confirmed / paid / cancelled — to the participant
  (`statusEmailFor`). Each email separately after booking, an error does not
  undo the booking.
- **"Opłacony" sends an email only BEFORE the first day of the course** (since
  14.10.2026, `courseStarted` — the day in Polish time). Most pay in cash on
  the first day, and Krzysiek marks it during or after the course — "Płatność
  zaksięgowana" after the course was odd. The participant sees the status in
  "Moje konto". The booking hook reads the date (`joins: false`); a failed read
  = an email as before. The panel list loads rows without the date
  (`depth: 0`), so its question at "opłacony" says "jeśli kurs jeszcze się nie
  zaczął".
- **An email to the participant that did not go out is recorded in the
  booking** (`recordEmailIssue`, since 03.10.2026): fields "Mail, który nie
  doszedł" (what and why, in plain words — `emailFailureReason`), date and
  "Załatwione"; a dashboard tile counts the unticked ones. These emails have NO
  queue or retries — Krzysiek gets in touch himself. A further error on an
  unticked one is appended, after ticking it starts over. The write from the
  hook goes through the `req` of the save in progress: the row is locked by its
  transaction, a write over another connection would wait forever. Context
  `skipRecount` + `skipStatusEmail`.
- **⚠️ The `bookings` field (join) in `Sessions` carries personal data.** The
  site reads dates through the Local API bypassing the rules, so EVERY date
  query in site code has `joins: false` (`lib/content.ts`, "Moje konto",
  `bookingEffects`). Checked 03.10.2026: a date's REST does not show bookings to
  an anonymous user or to another participant, the page code does not contain
  them.
- The nginx `account_forms` limit also covers POST to `/kursy/*/zapis` and
  `/obozy/*/zapis`.

---

## Camp bookings (Zapisy na obozy)

Since 19.10.2026 (stage 4), deployed 25.10.2026 (0.11.0).
Krzysiek's procedure (20.10.2026): (1) a short booking reserves the place,
(2) an email with a link to the registration form, (3) after the form the
contract to sign and the transfer details — from this email 7 days for the
500 zł deposit, the rest by the start day, (4) about 2 weeks before the camp an
information pack and an empty qualification card as PDF (the card stays on
paper — the Kuratorium template). Full refund up to 30 days before the camp.
The whole path works without an account; an account for those who want one.

- **One `bookings` collection for courses and camps** (decision 19.10.2026),
  told apart by the `kind` field (`course` / `camp`). Place counting, the
  waiting list, broadcasts, "Dane osoby", anonymisation and the dashboard work
  on this one — a second collection would mean building and testing each of
  these things a second time. The panel menu has two items, "Zapisy na kursy"
  and "Zapisy na obozy" (`BookingsNavLinks`, the same list with `?where[kind]`),
  because the school checks one or the other. Payload's own "Zapisy" link is
  hidden in `custom.css` (`#nav-bookings`), not through `admin.hidden` — that
  would also switch off the list routes. On a Payload bump check that the link
  still has this `id`.
- **On a camp the first name, last name and contact are the PARENT**, the
  participant is the child (`childFirstName`, `childLastName` — required only
  with `kind = camp`; `childBirthDate` comes from the registration form). The
  booking label takes the child's name. One child = one booking (like "one
  person = one booking").
- **Booking on the site: `/obozy/[slug]/zapis`** (step 1), only for a camp
  (`camps.kind = camp`) — a trip and classes redirect to `/kontakt`, because the
  "Zapisz się" button in the header cannot tell them apart by the address. The
  parent enters the turnus, themselves and one or more children
  (`MAX_CHILDREN`); each child is a separate booking in THE SAME transaction
  with a lock as a course (`createCampBookings`) — children counted in order,
  so with no places the first gets a place, the next the waiting list. **When
  there are more children than free places**, the form warns and gives a choice
  (decision 21.10.2026): the first on the places, the rest on the waiting list,
  or all on the waiting list (`togetherOrWaitlist` — siblings together or not
  at all; the server counts again under the lock). Krzysiek can always add
  places and change a status by hand.
- **Siblings share an address**, so a camp duplicate is the address + the
  child's first and last name (`childKey`, ignoring case and extra spaces), not
  the address alone as with a course. A repeated booking of the same children
  answers the same as the first, without new entries and emails.
- **One link, one form, one contract per sign-up** (decision 21.10.2026, as in
  Krzysiek's contract template): children with a place from one sign-up share
  one `registrationToken` (a `hidden` field — it is not in the panel or in any
  API response; the Local API reads it only with `showHiddenFields`). Token =
  sign-up: the form has a part for each child, and the parent's address, the
  invoice and the consents are once. A child from the waiting list gets no
  token — once a place frees up it gets ITS OWN (its own form and its own
  contract). To the parent one email after booking, one with the transfer
  details (deposit × children, one transfer, one deadline), one reminder per
  sign-up; to the school one per sign-up.
- **Camp emails through `CAMP_EMAIL`** (`obozy@abcwspinania.info`, decision
  20.10.2026): the booking notification goes there, and the email to the parent
  has it as `replyTo` — replies and signed contracts come back there. Empty =
  like `ADMIN_NOTIFY_EMAIL`. The sender stays `EMAIL_FROM` until the school's
  domain is authenticated in Brevo. **For the time of testing `CAMP_EMAIL` stays
  EMPTY** (locally and in production) — camp emails then go, as with courses, to
  `ADMIN_NOTIFY_EMAIL` (Mateusz's Gmail, a filter forwards to Krzysiek). `obozy@`
  is entered in `deploy/.env` on the day bookings open.
- **The date must match the kind**: `filterOptions` shows in the panel only
  dates of the given kind, and `validate` (`sessionMatchesKind`) enforces this on
  save — it replaces Payload's check, whose message read "nieprawidłowe wybory:
  1". A date whose course or camp was deleted (the field cleared by Postgres)
  matches every kind — otherwise none of its bookings could ever be saved again,
  not even a status change. The `bookings_camp_kind` migration switches to
  `camp` the bookings added earlier by hand on camp dates (a hand-written
  `UPDATE` — do not delete when squashing migrations).
- **Consent to photos of the child — optional, but an ANSWER is required**
  (`photoConsent` + the text in `photoConsentText`). Since 24.10.2026 the
  registration form asks "zgadzam się / nie zgadzam się", with nothing ticked in
  advance, and does not submit without a choice (`PhotoChoice`,
  `PHOTO_CHOICE_MISSING`). Before, it was a checkbox: Mateusz's concern was that
  parents skip it, and Krzysiek then weeds out photos. Consent ticked in advance
  or "untick if not" is not consent under GDPR (CJEU Planet49, recital 32) —
  hence a choice, not a default "yes". With "no", `false` is saved without
  text; a form sent earlier, when corrected, has ticked what was saved.
  Unticking in the panel = withdrawing consent.
- **Registration form (step 2): `/obozy/rejestracja?token=…`**, without an
  account — the key is the `registrationToken` from the email. Per child: PESEL
  (birth date computed from it, `lib/pesel.ts`, goes to the booking), height,
  allergies, medication, diet, illnesses, photo consent (optional). Once: the
  parent's home address (for the contract and invoice, copied onto every
  booking — it is in anonymisation and the data copy), "chcę fakturę", consent
  to the activities (required), GDPR consent to the child's data and health.
  Works until the camp's start day — the parent comes back with the same link
  and corrects (medication in February vs in July); closed for the waiting list
  and cancellation. "Zapisz zmiany" on a correction is inactive until the
  answers differ from the saved ones (since 24.10.2026, `answersOf` — like
  "Zapisz" in Moje konto); without JS it stays active so the form can be sent.
  Logic: `lib/campRegistration.ts`.
- **PESEL and health in a separate collection `camp-registrations`** (read only
  by the school): deleted by themselves a month after the camp
  (`CAMP_HEALTH_RETENTION_MONTHS`, daily sweep, `expiredRegistrationsWhere`),
  while the booking stays 5 years. The sentence about a month is also in the
  consent clause and must be in the privacy policy. **Deleting a booking
  deletes its form** (`beforeDelete` hook in `Bookings`) — otherwise Postgres
  will refuse (required `booking`), and the health data would outlive the
  booking; this covers the panel and "Dane osoby". The person's data copy
  contains the form with its booking.
- **Form emails without health data** — neither to the parent nor to the school
  (Brevo and years in an inbox). The school gets "wypełniony / poprawiony" with a
  link to the panel.
- **The form link outside the first email**: a child moved from the waiting
  list to a place gets it automatically (`afterChange` hook), and "Wyślij
  rodzicowi link" in the booking panel (`RegistrationPanel`, endpoint
  `/api/bookings/:id/registration-link`) — for a booking added by hand or a lost
  email. The token stays the same. A reminder once, after
  `REGISTRATION_REMINDER_DAYS` (4) without a form.
- **Deposit (step 3)**: amount, account, transfer title and refund rule in one
  place — `lib/campPayment.ts` (a change of amount or account = one edit). The
  first submission of the form sets `depositDueAt` to `DEPOSIT_DAYS` (7) and
  sends the parent the transfer details; a correction of the form does not move
  the deadline (the school can move it by hand in the panel). After the deadline
  without a deposit — one reminder (`depositReminderWhere`), the place is NOT
  released (Krzysiek's decision). The deadline does not depend on the "confirmed"
  status: a booking "zgłoszony" and "potwierdzony" alike gets the reminder and
  counts as a late deposit — Krzysiek's confirmation is not a step on a camp.
  Krzysiek marks the payment with the status "zaliczka wpłacona" — on a camp
  this sends the email "zostało X zł" (`statusEmailForKind`; on a course the
  deposit is still without an email; **siblings from one sign-up get ONE
  email** when the deposit is marked on the last child with a place — with the
  names of the children with a deposit and the total amount, Mateusz's decision
  22.10.2026; a child marked straight away as "opłacony" does not hold the
  email back and is not included in it or in the amount). **When the child the
  email was waiting for drops out** (cancellation, waiting list, deleted
  booking), the pending email is sent by THE DAILY SWEEP
  (`sendWaitingDepositEmails`, marker `depositEmailAt`), not by the status
  change: a family cancelling entirely is clicked one child at a time and would
  get "zaliczka wpłynęła" between two cancellations. Amount remaining = the
  price of the turnus or camp minus 500 zł; without a price in the panel the
  email gives no amount, rather than a wrong one.
- **"Dane do faktury" in the booking panel** (`InvoicePanel`, when the parent
  ticks the invoice): the parent with address or a company (name, NIP,
  address), the child, birth date, the date, the entry in the organisers'
  register (`CAMP_ORGANISER_REGISTRY`) and the camp's number in the Kuratorium
  (the `kuratoriumNumber` field of the date, entered by the school; without a
  number — a link to the date, since 24.10.2026). Krzysiek issues the invoice
  himself in his program (to a company — through KSeF, 22.10.2026).
- **Invoice to a company in the registration form** (since 22.10.2026): under
  "Potrzebuję faktury" the field "Na firmę", and under it name, NIP and address
  — shown by CSS alone (`group-has-[…:checked]`), so they work without JS. NIP
  checked with the check digit (`checkNip`), saved without dashes
  (`normalizeNip`). **A hidden field does not block submission**:
  `stopInvalidSubmit` skips invisible fields (`checkVisibility()`) — without
  this the empty company fields stopped every form without an invoice. The
  server checks them only with an invoice to a company.
- **Contract (step 4, since 22.10.2026)**: the text from Krzysiek's template
  with his corrections (`lib/campContract.ts`, pure, tested), PDF through
  `pdf-lib` + `@pdf-lib/fontkit` with the Inter font from `public/fonts/`
  (Polish characters; read from `process.cwd()`, rule 15). **The font is
  embedded in full** — the subset from fontkit lost glyphs (the text copied, on
  the page there were holes). This is guarded by `contractPdf.test.ts` (since
  25.10.2026): both fonts in the PDF have the size of the files in
  `public/fonts/`, every character of the contract (also from names with Polish
  letters) has a glyph in Inter, the signature from the panel is in the PDF, and
  without it the contract is still created. Each of the three tests checked red
  on deliberately broken code. One contract per sign-up, it goes AS AN
  ATTACHMENT to the email with the transfer details — the day of sending = the
  day of conclusion, the 7 days of the deposit count from it. On sending, the
  booking gets `contractSentAt` and `contractPrice`: the date of conclusion and
  the price in a contract downloaded later stay the same, even after a price
  change in the panel; the rest (parent, address, list of children) is built
  from the booking's current data on every download. Without a price for the
  turnus the contract does not go — the transfer email does, and the school
  sees it in "Maile, które nie doszły" (the reason as text: `recordEmailIssue`
  with a string saves it unchanged). Download: the school
  `/api/bookings/:id/contract` (a button in `RegistrationPanel`; before sending
  a preview with today's date), the parent `/obozy/rejestracja/umowa?token=`
  (a link in "Moje konto", only after sending) — `Cache-Control: private,
  no-store`. The parent sends the signed copy back to `obozy@`
  (`CONTRACT_RETURN_EMAIL`).
- **The stamp with signature is NOT in the repo** (the repo is public): it is
  uploaded once on every server in "Ustawienia obozów" (the `camp-config`
  global), to the `private-files` collection — read only by the school, the
  file itself too (`/api/private-files/file/…` → 403 without a school account).
  Files sit in `uploads/private` (the same volume, so the nightly backup covers
  them). **Deliberately without a `localPatterns` entry and without an nginx
  block** (an exception to rule 23): nothing from this collection is shown on
  the site, and a long cache would be the opposite of the goal. Instead the
  response with the file has an explicit `Cache-Control: private, no-store`
  (`modifyResponseHeaders`, since 22.10.2026): Payload sends none, and
  Cloudflare keeps a `.png` without this header at its edge — a download by the
  school account would hand the signature to anyone asking for that address.
  Without a chosen signature the contract goes out with an empty space for the
  organiser's signature, and the booking gets a note ("Mail, który nie doszedł"
  on the dashboard). **Deleting the file in "Pliki prywatne" clears the field in
  "Ustawienia obozów" by itself** (foreign key) — found in the audit of
  22.10.2026: a new file uploaded, the old one deleted, contracts went without a
  signature and nobody would have known.
- **"Stwórz nowy" starts from the kind of the list you came from** (since
  25.10.2026, `BookingKindField`): Payload opens a bare form that always started
  from "kurs". The list remembers its half in `sessionStorage`
  (`BookingsListDescription`, `LAST_LIST_KIND_KEY`), the field sets it ONLY in a
  new booking (`kindForNewBooking`); blocked browser storage = the default
  "kurs", as before.
- **"Zduplikuj" on a camp booking = a new child** (since 22.10.2026): this is
  how the school adds a sibling by phone. The copy keeps the parent, the
  contact and the turnus, and resets everything that belonged to the FIRST
  child (`beforeDuplicate` on the fields): status (back to "zgłoszony" — a copy
  of a paid booking was "opłacony"), the form token (otherwise the copy would
  enter someone else's form and contract), "formularz wypełniony", birth date,
  photo consent, deposit deadline, contract and the email note. The same with a
  date: a copy of a turnus does not inherit the Kuratorium number or the marker
  "szkic przed obozem zrobiony". Payload also copies `hidden` fields on
  duplicate — a new field on a booking or a date: decide whether the copy
  should have it.
- **The email before a camp** (since 22.10.2026, `lib/campPreCamp.ts` pure,
  `lib/campPreCampDrafts.ts` in the daily sweep): `preCampReminderDays`
  (default 16, "Ustawienia obozów") before the turnus the system creates a
  DRAFT broadcast to its parents with Krzysiek's standard text (editable in the
  same place; an empty line = a paragraph, "- " = a list item) and tells
  `CAMP_EMAIL` about it by email. **It sends nothing by itself** — the meeting
  place, dates and times are in brackets to be filled in. The system fills in
  the camp's name and the line about the sleeping bag (only when the camp has
  "własne śpiwory"). Once per turnus (`preCampDraftAt`, marked after the draft
  is created, before the email); a turnus with nobody holding a place waits
  until the next day.
  - **"Wyślij" refuses while a `[bracket]` remains in the text** (since
    22.10.2026, `unfilledPlaceholders` in `lib/broadcasts.ts`, in EVERY
    broadcast): subject and text, the English version only when it will go out.
    Krzysiek can change the draft entirely or delete it — only what stayed in
    brackets blocks. "Wyślij próbnie" works, so he can see the draft himself.
  - **The empty qualification card as an attachment** (since 22.10.2026): a PDF
    in "Ustawienia obozów" (`qualificationCard`, a file in `private-files`,
    which from that day also accept PDF), in the draft the field "Dołącz kartę
    kwalifikacyjną" ticked by the system. Without the card as PDF "Wyślij" and
    "Wyślij próbnie" refuse with instructions. An email with the card has at the
    top the box "W ZAŁĄCZNIKU: PUSTA KARTA KWALIFIKACYJNA" (`CARD_ATTACHED`, the
    `callout` field in `layout.ts`, since 24.10.2026) — added by the system, not
    by the school's text. The file type is checked by the sending, not by the
    field's `filterOptions`: Payload checks those with the request's
    permissions, so a save without a logged-in school account (test data) was
    rejected.
  - **A broadcast to a camp turnus = a camp email**: sender "ABC Wspinania ·
    Obozy" and `replyTo` to `CAMP_EMAIL` (`campTurnus` in `broadcastSender.ts`).
    Until 22.10.2026 every broadcast had the ordinary sender and replies to
    `ADMIN_NOTIFY_EMAIL` — parents' replies would not reach `obozy@`, and the
    Gmail filter would forward the pre-camp email to Krzysiek like a course one.
- **The dashboard splits tiles into courses and camps** (`SchoolDashboard`);
  with camps additionally "Bez formularza" (there is a place, there is no form)
  and "Zaliczka po terminie" — what Krzysiek calls about.
- **A camp turnus's Excel has its own columns** (`campTable` in
  `lib/sessionExport.ts`): child, birth date, height, allergies, medication,
  diet, illnesses, photo consent, status, form, deposit deadline, parent with
  phone and address, invoice. Health data goes out in this file DELIBERATELY
  (the list for the camp); a copy downloaded to the school's computer does not
  disappear by itself.
- **The parent's "Moje konto"**: on a camp booking the child's name, a link to
  the form ("Wypełnij" / "Popraw"), "Pobierz umowę" (after it was sent; a plain
  `<a>`, not `next/link`, which would prefetch the file) and the payment state
  (`paymentLine`) — the link with the token only for the account's own bookings.
- **Privacy policy PL and EN** (version 2026-10-22) describes the child's
  booking, the registration form (PESEL and health on consent under Art. 9(2)(a),
  deleted a month after the camp), photo consent, the parent's address and the
  company data for the invoice.
- **The "Ustaw hasło do konta" email after a camp booking is a camp email**
  (since 25.10.2026, `lib/campAccountEmails.ts`): sender "ABC Wspinania ·
  Obozy", replies to `CAMP_EMAIL` — like the rest of the camp booking emails,
  and the forwarding filter in testing lets through only course ones. The same
  email after a course goes from the ordinary sender; the confirmation link and
  other account emails stay ordinary. Outside `actions.ts`, because every export
  of a `"use server"` file is an action anyone can call.
- **Camp booking status emails talk about the camp and the child**
  (`campStatusEmail`), not the course, and have `replyTo` to `CAMP_EMAIL`.
  "Potwierdzony" sends "Miejsce potwierdzone: …" — information only, nothing
  depends on it.
- **Integration tests do not call over HTTP anything that sends email** — the
  development server has the real Brevo key. "Wyślij link" is checked in the
  test process (`registrationLinkHandler`), over HTTP only the refusal.
- New person fields go to three places at once: anonymisation
  (`anonymizeExpiredBookings`), the data copy (`personErasure.ts`, the allow list
  of fields) and its document (`personDataDocument.ts`).

## School panel — dashboard, quick status, export

Since 03.10.2026 (stage 3). Custom panel elements in `src/components/admin/`,
hooked up by paths in the config — **after adding or moving one of them:
`npm run generate:importmap`** (the `importMap.js` file is generated, rule 25),
otherwise the panel will not find the component.

- **The "Do zrobienia" dashboard** (`SchoolDashboard`, `admin.components.
  beforeDashboard`): new sign-ups, confirmed (waiting for the deposit), waiting
  list, emails that did not get through, new messages — each number is a link
  to a list filtered through `?where[...]` in the address; below, the 12 nearest
  dates with occupancy "taken / limit" and links to those booked and to Excel.
- **"Pulpit" at the top of the panel menu** (`DashboardNavLink`,
  `admin.components.beforeNavLinks`, since 18.10.2026). Payload returns to the
  dashboard only through the small logo above the page title (tooltip "Panel"),
  and its menu has no such item — someone who opened "Zapisy" for the first time
  did not know how to get back to "Do zrobienia". Markup and classes as in
  Payload's links (`nav__link`), so on its bump check the menu has not changed
  them. The logo in the corner stays Payload's: a custom `graphics.Icon` also
  draws the `/api/og` preview image, where an image from a relative address will
  not load.
- **The booking list by dates** (since 24.10.2026): the links "Zapisy na kursy /
  na obozy" in the menu (`BookingsNavLinks`, conditions
  `bookingsMenuConditions`, address from `lib/adminListUrl.ts`) and the dashboard
  tiles (`lib/dashboardConditions.ts` — the same conditions count and filter)
  open it sorted by `sessionStart`, from a month back (`LIST_DAYS_BACK`), 100
  rows at a time — before, the newest bookings on top mixed all the dates.
  **Parameters in the address, not only in `defaultSort`**: Payload remembers
  each user's last sort and row count, and those win over the collection's
  settings (measured: `limit: 10` from preferences). `sessionStart` is a COPY of
  the date's start (the booking label hook and `afterChange` in `Sessions`,
  through `db.updateMany`): sorting by `session.startDate` works in the Local
  API, but the panel filter does not show a condition on a relationship field —
  it would work invisibly. For the same reason the conditions in the link are one
  `where[and][N]…`, one field per condition (`whereParams` refuses anything
  else): a flat `where[a]…&where[b]…` or a nested `and` the filter shows as fewer
  conditions than it applies — a list of three children looked like the whole
  list. NOT `where[or][0][and][N]` (the filter's own format): with it Payload
  expands "Filtry" every time the list opens (`validateWhereQuery` in
  `ListControls`). A test goes through every tile. Payload's grouping
  (`admin.groupBy`, beta) rejected: 10 rows per group and groups in order of the
  date's id. The `bookings_session_start` migration fills the copy in existing
  bookings (a hand-written `UPDATE` — do not delete when squashing migrations).
  The description under the heading says where you are (`describeBookingsList`
  in `lib/bookingsList.ts`): the half (courses/camps) and the view — which tile,
  the menu, one date or manual filters — recognised from the conditions in the
  address ALONE, not from a marker: changing a filter changes the description;
  below it, when a status sends an email. Columns: "Uczestnik" (`participant` —
  the child on a camp, the person on a course; composed with the label, hidden
  in the form) and "Termin" separately — one label with both read badly.
  `participant` is personal data: anonymisation clears it; it is not in the data
  copy (the same as the names). The menu links also carry `columns` — columns
  chosen by hand go back to these on the next click in the menu.
- **Status as a dropdown on the booking list** (`BookingStatusCell`). Saves
  through REST, so everything that follows a status change works (email,
  recounting places). A status that sends an email to the participant asks first
  — a click on the wrong row must not send "zapis anulowany". The same for
  contact form messages (`MessageStatusCell`, since 10.10.2026: new → in progress
  → done with one click, without asking — nobody gets an email). Shared
  component: `StatusSelectCell`.
- **Export of a date's participants** — `GET /api/sessions/:id/export`
  (`lib/sessionExport.ts`), a button on the date's page. School account only.
  CSV for POLISH Excel (`lib/csv.ts`): BOM (otherwise "Å»aneta"), semicolon,
  cells starting with `= + - @` get an apostrophe (a formula typed into the form
  will not run on Krzysiek's computer), phone as `="+48 600 …"` (without it Excel
  makes it a number without the plus).
- **Every visible date field has `displayFormat`** (`d.MM.yyyy` or
  `d.MM.yyyy, HH:mm`). Without it Payload shows the date American-style
  ("10/23/2026") — despite the Polish panel. Found 24.10.2026 on "Data zgody" in
  the registration form; fixed in all collections. A `hidden` field does not
  need it. Dates on lists and "Utworzono" take `admin.dateFormat` from
  `payload.config.ts` — Payload's default gave "października 23 2026, 2:05 PM".
- **`@payloadcms/ui` only as an EXPLICIT dependency** (since 12.10.2026 in
  `package.json`, pinned to the exact number like the rest of Payload, the
  `payload` group in Dependabot). Until that day it was only Payload's
  dependency and the import would have worked by accident. It came in for
  `useFormModified` in the broadcasts panel; where an address is enough (the
  date id in the export), the address stays.

---

## Broadcasts and newsletter (Wysyłki i newsletter)

Since 03.10.2026 (stage 5). The `Broadcasts` collection ("Wysyłki", group
"Zapisy"), logic in `lib/broadcasts.ts` (pure functions) and
`lib/broadcastSender.ts` (recipients, queue, endpoints), the newsletter in
`lib/newsletter.ts`.

- **Three recipient groups:** those booked on one date, everyone with upcoming
  bookings (date from today, status `open`/`waitlist`), the newsletter (only
  `subscribed`). By default people with a place (`ACTIVE_STATUSES`); the waiting
  list after ticking "Także lista rezerwowa" (decision 03.10.2026). One email
  per address — a couple with one address gets one.
- **The recipient list is FIXED at the moment of "Wyślij"** — a row in
  `broadcast-deliveries` per address, in a transaction with a lock on the
  broadcast (`pg_advisory_xact_lock(7303, id)`). Measured 03.10.2026: two clicks
  at once — one 200, the other 409, two rows, not four.
- **Sending is done by a timer in the server process** (`instrumentation.ts`,
  every 20 s, 20 emails per tick), not by Payload's job queue — the reason as
  with the account sweep. Each row is marked as sent only AFTER Brevo accepts
  it; accepted risk: a failure exactly between these steps sends one email
  twice. **The timer starts only at server start** — after a change in
  `instrumentation.ts`, `npm run dev` has to be restarted locally.
- **One queue tick at a time — two locks.** A flag on `globalThis` (Next bundles
  the timer and the "Wyślij" endpoint separately; a flag in the module gave two
  copies and — measured 04.10.2026 — 20 emails to 10 addresses) and
  `pg_try_advisory_xact_lock(7304)` on the whole tick, shared by ALL processes:
  a second instance, or integration tests queuing to the database over which the
  development server with the real Brevo key ticks.
- **One broken broadcast must not stop the queue.** Found 05.10.2026: a
  broadcast "w trakcie" whose date was deleted (Postgres cleared the field) did
  not pass the "Wybierz termin" validation when saving its own counters — every
  tick failed, and with it all broadcasts behind it. Now the date is required
  only in a draft, each broadcast in a tick has its own `catch`, and without a
  date the note under the email is general.
- **Sending errors** (`classifySendError`): Brevo's daily limit (401/402/403/429,
  "credit/limit/quota") or a rejected key PAUSE the broadcast for an hour and
  resume it by themselves; a rejected address — an error of that row only;
  network and 5xx — a retry in 10 min, up to 5 attempts. The free Brevo plan =
  300 emails a day including all other emails of the site.
- **"Wyślij" and "Wyślij próbnie" disabled with unsaved changes** (since
  12.10.2026, `BroadcastPanel`, `useFormModified`): the endpoints read the SAVED
  version, so an added and unsaved English version went out without it
  (reported in testing). The text editor reports a change only when the browser
  is idle (up to 500 ms) — that is why after a click the panel waits 700 ms and
  checks again. Checked in the browser: a click right after typing ends with
  "Nic nie wysłano".
- **A copy from "Zduplikuj" does not go out unreviewed** (since 12.10.2026, the
  `copyUnreviewed` field): Payload saves the copy at once, so one "Wyślij" sent
  the same message a second time (reported in testing). The collection's
  `beforeChange` hook recognises a copy by `originalDoc` on `create` (Payload
  gives the original there — WITHOUT the id, it removes it before the hooks; on
  ordinary creation an empty object); the first save or "Sprawdzone" in the
  panel (because Payload's "Zapisz" is disabled on an unchanged form) removes
  the marker. `sendHandler` also refuses by itself (409). A test send of the copy
  works.
- **A sent message cannot be changed** (fields with `access.update` only for a
  draft + a `beforeChange` hook) — what people received has to stay.
  "Zduplikuj" (⋮ menu) gives a draft with reset counters (`beforeDuplicate`).
- **Content from the editor → email through OUR converter**
  (`lib/email/richText.ts`), not `@payloadcms/richtext-lexical/html`: inline
  styles (Outlook), every text through `escapeHtml`, links only
  `http(s)`/`mailto`/`tel`. The broadcast editor has trimmed features (no
  images, tables, links to panel documents). `layout.ts` accepts a ready `body`
  ONLY from this converter.
- **The English version is optional** — it goes to people with `language = en`,
  when it has both a subject and a text; otherwise Polish. The panel warns
  before "Wyślij".
- **Newsletter with confirmation (double opt-in, 03.10.2026).** The form saves
  `pending` + a token and sends a link; broadcasts get only `subscribed`.
  Addresses from before that date stayed `subscribed` (the same consent, saved
  as text). Unconfirmed ones are deleted by the daily sweep after 7 days. A
  repeated sign-up within 10 min does not send a second email. The form's answer
  is the same for every address.
- **Confirmation and unsubscribe with a BUTTON, not the link alone**
  (`/newsletter/potwierdz`, `/newsletter/wypisz`) — a mail scanner opens links
  on a person's behalf; for an account that is only proof of address, here it
  would be consent or its withdrawal in someone's name.
- **One-click unsubscribe from the inbox** — the headers `List-Unsubscribe` +
  `List-Unsubscribe-Post` (RFC 8058) on the newsletter, POST to
  `/api/newsletter/unsubscribe?token=` (a collection endpoint, always 200).
  Messages to those booked on a course do not have them — that is service
  information, not marketing. Checked 03.10.2026: Brevo accepts these headers.
- **An unsubscribed person stays in the database** (`unsubscribed` + date) —
  proof of consent withdrawal. Someone who unsubscribes between "Wyślij" and
  their turn in the queue is skipped (`skipped`).
- **nginx `site_actions` limit**: submissions of server actions (POST with
  `Next-Action`) from ANY page — the newsletter is in the footer. **The `/admin`
  panel excluded from the limit**: Payload uses server actions when editing
  forms and 10/min would block work.

---

## Emails (Brevo)

Since 01.10.2026 the application sends emails through **Brevo, through its HTTP
API** (`src/lib/email/brevo.ts`), not through SMTP.

- **Our own connector, not `@payloadcms/email-nodemailer`.** Measured
  01.10.2026: the official adapter pulls `nodemailer` 9.1.1 with two **high**
  advisories, and the `npm audit --audit-level=high` gate would stop every PR.
  The fix is in nodemailer 10, which the adapter does not accept. Go back to the
  official one when it moves to nodemailer ≥ 10.0.6 — then changing the provider
  is configuration.
- **⚠️ Brevo attaches ITS OWN unsubscribe header to every email that does not
  have one** (transactional too; switching off only on the Enterprise plan).
  Found 21.10.2026 in the headers of a test email: Gmail shows it as "Anuluj
  subskrypcję", and a click puts the address on Brevo's unsubscribed list —
  after that Brevo accepts our emails to that person and SILENTLY does not
  deliver them (confirmations, statuses, new password), and the application
  does not know. A header given by us replaces Brevo's (checked the same day),
  so the adapter (`withServiceUnsubscribe` in `lib/email/brevo.ts`) gives every
  email without its own ours: `/o-mailach/wypisz` — GET leads to a page with an
  explanation, POST (Gmail's one click; `List-Unsubscribe-Post` is added by
  Brevo) answers 200 and changes nothing. The newsletter keeps its real
  unsubscribe. The button in Gmail stays — without any header, Brevo's would
  come back.
- **Without `BREVO_API_KEY` emails go to the console** (Payload warns at start).
  Deliberately: locally and in CI nobody will get an email by accident.
- **The sender must be on a domain authenticated in Brevo** (SPF + DKIM +
  DMARC). Today `zapisy@szkolawspinaczkowa.pl` — records in Cloudflare, checked
  01.10.2026: SPF, DKIM and DMARC `PASS` in Gmail. The sender address always
  wins, even when the code gives a different `from` — a foreign address will not
  pass SPF/DKIM and will land in spam or be rejected.
  **When switching to `abcwspinania.info`**: authenticate that domain in Brevo
  and change `EMAIL_FROM` in `deploy/.env` — without a new image.
- **The sender domain has no mailbox** (no MX record). A reply to an email
  "from" `zapisy@` will not arrive anywhere — that is why every email someone
  may reply to MUST have `replyTo` (contact message notification: the person
  writing).
- **⚠️ Tracking in Brevo cannot be switched off — it is anonymised.** Brevo
  inserts an open pixel and rewrites every link through its server; the API has
  no switch (full switching off according to the Brevo forum: only on request or
  on the Enterprise plan). Decision of 01.10.2026: we stay with anonymisation —
  `contactPixelTrackingConsent: false` on every recipient (in code) **and**
  "Anonymous email tracking: Yes" on the "Tracking" screen in the Brevo
  settings. The panel setting is per account — **a new Brevo account has to be
  switched by hand**; the code protects without it too. This must be in the
  privacy policy.
- **The email after the save, not instead of the save.** The `afterChange` hook
  sends after saving to the database; a sending error is logged and does not
  break the form. Brevo unavailable = the message waits in the panel, it is not
  lost.
- **Two languages of emails to visitors (PL/EN), Polish by default.** Since
  15.10.2026 everyone who did not choose a language (a booking without an
  account, a new account, the newsletter) gets `DEFAULT_LANGUAGE` = Polish;
  English only after switching in "Moje konto" (or by the school in the panel).
  Until that day the `Accept-Language` header decided (`pickLanguage()`): a
  browser in English is a common setting in Poland, not the person's language,
  and Poles got emails in English. `email.test.ts` makes sure no code reads
  `accept-language` any more. The language is **saved with the submission**
  (`language`), so that later emails go in the same language. The field in
  Messages is hidden in the panel (always Polish; the column stays — older rows
  have the old guess, and removing it is a migration). Emails to the school are
  in Polish, **without a note about the language** (until 14.10.2026 there was
  "odpowiedz po angielsku").
- **Email header: the ORIGINAL logo + the name as text** (since 12.10.2026,
  `header()` in `layout.ts`). The logo is the client's PDF unchanged, rendered to
  `public/logo/email-logo.png` (`design/logo/email_logo.py`) — not the mark
  redrawn from the site header. A PNG from our server (`publicUrl()`), because
  mail does not show SVG; the name stays text, because Outlook blocks images.
  Locally the image is not visible (Gmail will not reach localhost). Replacing
  the file = a new name (rule 13).
- **Templates are pure functions** (`src/lib/email/templates.ts`, the look in
  `layout.ts`) — without Payload, tested with bare `node --test`. Every value
  from a visitor goes through `escapeHtml` in `layout.ts`; a template does not
  compose HTML itself. Colours from `BRAND_COLORS` (`site.ts`).
- **`serverURL` in `payload.config.ts` is DELIBERATELY unset**, despite
  Payload's warning "Request origin "" is not in the CORS/CSRF allowlist".
  Payload adds `serverURL` to the CSRF list (`payload/dist/config/sanitize.js`),
  and from then on rejects the login cookie from a request whose `Origin` is
  outside the list (`auth/extractJWT.js`) — i.e. every save in a panel opened
  under a different domain. `SITE_URL` is the TARGET domain, and the panel works
  today under a temporary one — setting it would log the panel out on
  `szkolawspinaczkowa.pl`. Without it the link in the password reset email takes
  the domain from the request: checked 01.10.2026, from the browser comes a full
  `http://…/admin/reset/…`. The warning and a link without a domain
  (`/admin/reset/…`) appear only when called from `payload run`, where there is
  no request.
- **Free plan limit: 300 emails a day.** With the newsletter, a paid plan is
  Krzysiek's decision.

---

## Memory budget (Ampere A1, 2 OCPU / 12 GB)

Limits **parameterised** through `deploy/.env`. By default, with the whole
machine:

| Service | Limit | Heap / tuning |
|---|---|---|
| postgres | 1 GB | `shared_buffers=256MB`, `effective_cache_size=768MB`, `work_mem=8MB`, `max_connections=40` |
| app | 2 GB | `--max-old-space-size=1536` |
| nginx | 128 MB | — |

The "half machine" profile (1 OCPU / 6 GB) waits commented out in
`deploy/.env.example`.

**You change `POSTGRES_MEM_LIMIT` — lower `shared_buffers` and
`effective_cache_size` too.** The container limit alone tells Postgres
nothing; with one too low it will be killed by OOM instead of slowing down. The
same applies to `APP_MEM_LIMIT` and `--max-old-space-size`.

nginx has **128 MB, not 32 MB**: in anovastudio with a 32m limit it got OOM when
27 photos were uploaded at once to the media library.

`setup-swap.sh` (2 GB, swappiness 10) stays despite the memory headroom — as a
fuse for sharp peaks. The script is idempotent.

---

## First-run checklist on the server (Lista pierwszego uruchomienia)

1. `deploy/.env` from `.env.example`, secrets generated
   (`openssl rand -hex 32`, each separately). **Hex, not base64:** the database
   password goes into `DATABASE_URI` (`postgresql://user:PASSWORD@...`), and
   base64 can draw a `/`, which splits that address — the application does not
   connect to the database, and the message says nothing about the password.
2. Certificates in `deploy/certs`. A domain behind Cloudflare gets an **Origin
   Certificate** (15 years, no renewal) — see "Temporary domain and Cloudflare"
   below. Until the switch the target domain works on a temporary certificate
   (self-signed in `fullchain.pem`/`privkey.pem`): nginx does not start without
   it, and a real one cannot be issued before DNS points to the server.
3. DNS A records for `@` and `www` to the instance's public address.
4. ~~Taking over the uploads volume to uid 1000~~ — **unnecessary**. Checked
   26.09.2026 in production: on the first mount of an empty named volume Docker
   copies the owner from the image, so `/app/uploads` belongs to `node` straight
   away and writing works. The item stays so that nobody "restores" it.
5. The **Deploy** workflow — starts the containers and creates the schema on a
   clean database (migrations are part of it).
6. The administrator account: go to `https://abcwspinania.info/admin`, the
   "create first user" screen.
   ⚠️ Do this **right after the first deploy**. As long as there is no account,
   the first administrator registration screen is available to anyone who knows
   the address.
7. Repository variables `SITE_URL` (the **target** domain — baked into the
   image) and optionally `SMOKE_URL` (the address at which the smoke test should
   check the site while the target one does not point to the server yet), and
   secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`,
   `GHCR_OWNER`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
   `PAYLOAD_SECRET`.

   ⚠️ **`SITE_URL` is set BEFORE the merge that is to contain it.** Changing the
   variable rebuilds nothing — it takes effect only with the next image.
   Measured 28.09.2026: PR merged in the morning, variable set in the evening,
   image 0.5.4 came out with `localhost:3000` in the sitemap and canonical
   addresses, and CI was green. Checking the image before deploying:
   `grep -rl "https://<domain>" /app/.next | wc -l` in the container — zero
   means the address did not get in.
8. Emails: in `deploy/.env` `BREVO_API_KEY`, `EMAIL_FROM` (an address on a
   domain authenticated in Brevo), `ADMIN_NOTIFY_EMAIL`, `CAMP_EMAIL` (the camps
   mailbox) and `PUBLIC_URL` (the address at which the site works NOW — links in
   emails to participants). In Brevo: "Anonymous email tracking: Yes". Without
   the key the site works, but emails land in the container log.

**What is NOT on this list any more:** clicking through public permissions in
the panel. They are in code and travel with the deploy.

---

## Redirects from the old site

Since 05.10.2026. Old Joomla addresses → new counterparts, `redirects()` in
`next.config.ts` from the list in `src/lib/legacyRedirects.ts`, permanent
(308). They work on every domain — nobody comes from them to the temporary one,
so they will come alive by themselves on the day of the switch.

- **The inventory was made by walking the links** of the old site (it had no
  sitemap): about forty subpages and articles. The calendar (`/kalendarz/...`
  generates a page for every day) and tags — one rule for the whole section.
- **Only EXACT old paths, no patterns on the new site's prefixes** (`/kursy/*`,
  `/aktualnosci/*`, `/obozy/*`). The new post
  `/aktualnosci/25-lat-abc-wspinania` starts with digits like the old
  `/aktualnosci/107-20lat` — a "numbered address" rule would swallow it.
- **`legacyRedirects.test.ts` guards**: no rule captures a route from
  `src/app/(frontend)` or a content address from the `CONTENT` list; every target
  exists; every old address found is handled; no chains.
  ⚠️ `CONTENT` is the addresses from the panel as of 05.10.2026 — **changing
  the slug of a course, camp or post in the panel breaks the redirect to it
  without a trace**. When changing a slug: fix the target in
  `legacyRedirects.ts` and `CONTENT`.
- Old articles without a counterpart → `/aktualnosci`, the old "O ABC" →
  `/o-nas`.
- **After the domain switch**: Search Console, the "Pages" report — old
  addresses should go to the new ones, without 404.

**By the way: the sitemap did not refresh at all.** `sitemap.ts` had no
`revalidate`, so Next generated it once, at the build in CI — without a
database — and kept it forever (`initialRevalidateSeconds: false` in
`.next/prerender-manifest.json`). Production showed only static pages in the
sitemap, without any course, camp or post. The layout's `revalidate` does NOT
reach metadata routes (`sitemap`, `robots`, `manifest`) — each needs its own.
Now `revalidate = 3600`.

---

## Backups (Kopie zapasowe)

Since 06.10.2026. Template: Next Step Pro (`nsp-backup.sh`), running there since
09.2026 — the reasons for each step carried over together with the code.

- **Every night at 03:00** (`/etc/cron.d/abc-backup`) `deploy/abc-backup.sh`: a
  database dump (`pg_dump`, plain SQL, gzip) and an archive of the uploads
  volume (Media + Gallery; the image cache skipped — Next rebuilds it by
  itself). **The uploads archive only when they changed** (a fingerprint
  path|size|mtime in `/var/lib/abc-backup/files-state`), at least every 30
  days; each one is full, and the dump from day X matches the newest archive
  ≤ X, not "from the same date". `FILES_REFRESH_DAYS` must be smaller than the
  retention on Drive — otherwise pruning would delete the only archive (the
  script refuses to start).
- **Two levels:** the server disk (7 days, `/backups`, root only) and Google
  Drive (40 days, since 09.10.2026; before that 90) through `rclone` with a
  **`crypt`** remote — encryption BEFORE sending. The privacy policy
  (`/polityka-prywatnosci`, comes in with bookings) says "do 40 dni" — every
  change of retention requires a fix of the page and of
  `PRIVACY_POLICY_VERSION`. Drive on Mateusz's account to start with (decision
  06.10.2026); moving it to the school's account or handing the passwords to
  Krzysiek — to be settled.
- **Every file is created as `.part` and gets its proper name only after a
  check**: the dump — after the `PostgreSQL database dump complete` marker (a
  truncated dump gzips correctly and passes `gunzip -t`), the archive — after
  `tar tzf`. Checked 06.10.2026: a dump cut off halfway stays `.part` and ends
  the run with an error.
- **`rclone copy`, never `sync`** — otherwise local pruning after 7 days would
  also delete the copies on Drive.
- **`/backups/milestones`** — manual dumps before a risky operation (a Deploy
  with a new migration on real data, a Postgres major). Nothing prunes them,
  neither locally nor on Drive.
- **Alarm through healthchecks.io** (`/etc/abc-backup.env`,
  `HEALTHCHECK_URL`): start, success or `/fail`. Silence = failure. Without a
  configured Drive the run makes local copies and **ends with an error** — no
  copy outside the server has to be visible.
- **Installed by the Deploy workflow** (`setup-backups.sh`, like swap): the
  script, cron, logrotate, directories, `rclone` from apt. Idempotent, an error
  does not block the deployment. **It does not touch secrets**:
  `/root/.config/rclone/rclone.conf` (the Google token and the encryption
  passwords) and `HEALTHCHECK_URL` are set by hand once — `deploy/RESTORE.md`,
  section 0. ⚠️ **`rclone.conf` must be in the password manager**: without it
  the copies on Drive cannot be read, by us either. **And `deploy/.env` from the
  server too** (section 0.3) — GitHub does not give back saved secrets, and on
  a rebuild `POSTGRES_USER` and `POSTGRES_DB` must be the same as in the dump.
- **Rebuild after losing the whole server: `RESTORE.md`, section 8**
  (06.10.2026) — a new machine, secrets from the password manager, Deploy, the
  copy from Drive, DNS only at the end.
- **Restoring and the drill: `deploy/RESTORE.md`.** A drill once a quarter, on a
  temporary container, with the result written into the table. Drilled locally
  06.10.2026 (a dump from the development database loaded without an error, row
  counts matching). The temporary database's user must have the same name as in
  production — otherwise the dump stops at `ALTER ... OWNER TO`.
- All paths and names in the script can be overridden with environment
  variables (a try on a Mac); the default values are production ones.
- **⚠️ Never `command | grep -q` with `set -o pipefail`.** Found on the first
  real run (06.10.2026): `rclone listremotes | grep -qx abc-crypt:` — grep ends
  on the first line, rclone gets SIGPIPE on the second (`gdrive:`), and
  `pipefail` turns a hit into a failure (code 141). A configured Drive looked
  missing. Invisible locally: without rclone there was no second line. Result
  into a variable first, then `grep -q ... <<<"$variable"` — the same with the
  end-of-dump marker.
- **Drive configuration on the server done 06.10.2026** (`RESTORE.md`, section
  0.1): the token moved from the Mac without displaying it, the encryption
  passwords generated on the server. The first full copy: 67 s (108 MB of
  photos). **The restore drill from a copy downloaded from Drive: matching
  production** (result in the `RESTORE.md` table, section 5).

---

## Temporary domain and Cloudflare (Domena tymczasowa i Cloudflare)

Settled 26.09.2026. Until `abcwspinania.info` is switched (the client's old
site still runs under it), the new site stands under
**`szkolawspinaczkowa.pl`**, behind Cloudflare. The domain was unused before —
it has no history in Google and no mail, so taking it over cuts off nothing.

- **Google must not index it.** The nginx block for this domain sends
  `X-Robots-Tag: noindex, nofollow`. A header, not `Disallow` in robots.txt — a
  ban on reading would hide the `noindex` itself from Google.
- **`SITE_URL` points straight at the TARGET domain**, not the temporary one.
  The sitemap, canonical addresses and structured data tell Google about
  `abcwspinania.info` from day one, so at the switch there is nothing to change
  or rebuild. The smoke test checks `SMOKE_URL` in the meantime.
- **The nginx blocks for the target domain do not know about the temporary
  one.** On the day of the switch the fragment marked in `nginx.conf` is removed
  (or replaced with a 301 to the target domain), the `SMOKE_URL` variable is
  deleted and `PUBLIC_URL` in `deploy/.env` is changed to the target domain —
  without touching the rest. In the Cloudflare zone of the target domain
  **turn off Email Address Obfuscation** (on by default in every new zone —
  see the point on it below).
- **The Cloudflare Origin certificate must be in `certs/` BEFORE the config
  pointing to it is deployed.** No file: `nginx -t` fails in the deploy, and at
  the next container restart nginx does not start — together with the target
  domain. SSL mode in Cloudflare: **Full (strict)**.
- **The list of Cloudflare addresses (`set_real_ip_from`) is entered by hand.**
  Without it the login limit counts all visitors as one Cloudflare address and
  five mistakes by others block the panel for everyone. Cloudflare rarely
  changes the pool, but an address outside the list breaks this silently — when
  switching the target domain compare with <https://www.cloudflare.com/ips>.
  **Since 27.10.2026 the same list drives the firewall** (below): a range missing
  from it means visitors served by that Cloudflare location get error 522 — no
  longer silently.
- **⚠️ Ports 80 and 443 accept traffic ONLY from Cloudflare** (since
  27.10.2026, `deploy/origin-firewall.sh`, template from Next Step Pro). Without
  this, someone who knew the server's address bypassed Cloudflare and its rules
  (blocking `.env`/`.php` scanners, managed rules). Installed by Deploy
  (`setup-origin-firewall.sh`: IPv4 ranges cut out of `set_real_ip_from` in
  `nginx.conf`, a systemd service restores the rules after a reboot). The rules
  sit in the `ABC-ORIGIN` chain behind `DOCKER-USER` — Docker publishes ports
  through NAT, the `INPUT` chain (ufw) does not touch this traffic. Matching by
  `--ctstate DNAT`, not by the port alone: in Next Step Pro a block by port
  caught the application's outgoing calls to an API on 443 (504 on every call)
  — checked in a Docker-in-Docker test, with a deliberately broken rule. Ports
  published only on IPv4 (`0.0.0.0:` in `docker-compose.prod.yml`) — without an
  address Docker opens them on IPv6 too, outside this firewall. Effects:
  - **The site does not answer under the server's bare IP** (nor
    `curl --resolve`) — check through the domain. Traffic from the server itself
    (`curl localhost`, the health check in Deploy) and SSH work.
  - **The `@`/`www` record must have the orange cloud.** Grey (DNS only) = the
    site dead for everyone. This also applies to switching the target domain and
    to rebuilding the server (`RESTORE.md` 8.5).
  - **Let's Encrypt only through Cloudflare** — HTTP-01 from LE servers straight
    to port 80 will not get through (today Origin certificates, so it does not
    apply).
  - Too few ranges (< 10) or junk in the list — the script refuses and leaves
    the previous rules. Emergency removal of the firewall on the server:
    `sudo /usr/local/sbin/abc-origin-firewall.sh --remove` (until the next
    Deploy or reboot).
- **⚠️ "Email Address Obfuscation" in Cloudflare is OFF** (since 27.10.2026, a
  zone setting, not code). When on, it replaces every address in HTML with
  "[email protected]" and restores it with a script from `/cdn-cgi/` — the
  person's data copy (`/api/customers/person-data`) downloaded as a file and
  opened from disk had only "[email protected]" instead of addresses (found in
  test I1), and `/kontakt` without JS the same. **When switching the target
  domain, turn the same off on its zone.** Check:
  `curl -s https://<domain>/kontakt | grep -c __cf_email__` = 0.

---

## Deliberate gaps — do not "restore" them without a reason

- **There is no workflow guarding `VERSION`.** In anovastudio it was removed:
  Dependabot cannot edit this file, and an automatic bump caused merge conflicts
  on this one line. **We bump by hand, in every PR** (settled 24.09.2026) — the
  last digit for fixes and small things, the middle one for a new feature. The
  reason is not tidiness: CI tags the image with the contents of this file, so
  two merges without a bump **overwrite the same tag** and "deploy version 0.1.0"
  stops meaning anything specific. From the first deployment at Krzysiek's this
  means no way to go back to an earlier state.
  **Exception (since 15.10.2026): a PR that touches nothing in the CI paths**
  (`web/**`, `.github/workflows/ci.yml` — the `paths` list in `ci.yml`), e.g.
  `docs/` alone or `CLAUDE.md`, **does not bump `VERSION`**. Such a merge does
  not build an image, so there is nothing to tag — and the bump itself would run
  CI (`VERSION` is on that list) and build an image identical to the previous one
  under a new number. With dozens of scenario fixes during testing the number
  would grow without any change in production.
- **`version` in `web/package.json` is NOT synchronised with `VERSION`** and is
  not meant to be. Nothing reads it — the package is private, it does not go to
  npm — and in anovastudio it stands at `0.1.0` while `VERSION` is `1.8.6`. The
  only version number of this project is the `VERSION` file.
- **Deploy is not automatic.** Only `workflow_dispatch`. A deployment to the
  client's machine is a decision, not a side effect of a merge.
- **Migrations are part of the deploy, but only up** — see "Schema migrations".
- **There is no second image with tools.** Deliberately, because of the disk.
- **There is no PR template** (`.github/pull_request_template.md`, removed
  13.10.2026). GitHub pasted it into every description, and the description
  comes ready anyway, so the template was only there to be deleted. Its
  checklist enforced nothing: lint, format, types, tests, build and audit are CI
  gates, and the rest (types and migrations, the arm64 image, Node in `ci.yml`,
  an entry here) is described in this file.

---

## Process

- **⚠️ GitHub actions pinned to a SHA, not a tag** (since 25.10.2026, audit):
  `uses: owner/action@<40 characters> # vX.Y.Z`. The author can move a tag to
  different code, and `appleboy/ssh-action` gets the SSH key to the server — a
  taken-over author account = a taken-over server (that is how the secrets of
  thousands of projects leaked with `tj-actions/changed-files`, 03.2025).
  Dependabot (`github-actions`) bumps the SHA together with the comment. **A new
  action: with a SHA from the start**
  (`gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`), never with a bare tag.
- **GitHub token read-only** (`permissions: contents: read` in all workflows;
  `packages: write` only in the `docker` job in `ci.yml`). The server pulls the
  image from GHCR without a token. Values from the `workflow_dispatch` form go
  into the script through `env:`, not through `${{ }}` in `run:` — the
  expression is pasted into the shell code before it runs; the version in Deploy
  is additionally checked against the tag pattern.
- **Containers with `no-new-privileges`** (`x-security` in
  `docker-compose.prod.yml`, since 25.10.2026): a process in a container will
  not gain privileges through setuid files. Checked before adding: Postgres
  (start, a query, `pg_dump` with the end marker), nginx (`nginx -t`, workers as
  `nginx`), the application image (200, user `node`, writing to `uploads`).
- **Build changes to the Dockerfile or the lock file locally before pushing.**
  `npm ci` in a clean container catches a lock mismatch, and
  `--platform linux/arm64` additionally missing native binaries for aarch64.
- **Do not judge the image's completeness by `ls node_modules`.** Measured:
  neither `@payloadcms/db-postgres` nor `drizzle-orm` exists in the image as a
  directory, and the application reads from Postgres without a problem —
  Turbopack built them into the server chunks. The only reliable test is to
  **run the image**. Beware of the trap: running `.next/standalone/server.js`
  from inside the project tree is NOT such a test, because Node finds the missing
  modules one level up.
- **Image cleanup in the deploy goes BEFORE `pull`**, not after. A pull aborted
  for lack of space ends the deploy in red. Deletion is explicit, by tags, with
  `KEEP=2` — `docker image prune -af --filter until=` with the containerd store
  lets tagged images through and every version since the project's start piles
  up.
- **`nginx.conf` is mounted from the host**, so `up -d` will not reload it with
  an unchanged image tag — the deploy does an explicit `nginx -t` and
  `nginx -s reload`.

### Local verification

```bash
docker compose up -d                  # database on 5435
cd web
npm ci
npm run migrate                       # schema from the migrations in the repo
npm run dev                           # site :3000, panel :3000/admin

npm run lint && npx tsc --noEmit && npm test && npm run build
npm run audit                             # BLOCKING gate in CI (npm audit + exceptions)
npm run test:integration                  # with npm run dev running (see below)
npm run generate:types && git diff --exit-code src/payload-types.ts

# nginx.conf — the name `app` does not resolve outside the compose network,
# so for the test we replace it with an IP address
sed 's|http://app:3000|http://127.0.0.1:3000|g' ../deploy/nginx.conf > /tmp/n.conf
docker run --rm -v /tmp/n.conf:/etc/nginx/conf.d/default.conf:ro \
  -v "$PWD/../deploy/certs:/etc/nginx/certs:ro" nginx:1.31-alpine nginx -t

# Workflows (requires an initialised git repository)
docker run --rm -v "$PWD/..:/repo" -w /repo rhysd/actionlint:latest -color
```

### Manual tests (Testy ręczne)

Since 06.10.2026. Scenarios: `docs/testy-reczne.html` (courses) and
`docs/testy-obozy.html` (camps) — the sources of the PDFs (Chrome headless,
`--print-to-pdf --no-pdf-header-footer`; PDFs outside the repo). **You change a
feature — change its steps in the same commit.**

- **Written in Mateusz's voice, for Krzysiek** (since 13.10.2026), in Polish:
  no boxes to tick — an error straight to WhatsApp, a blocking one stops the
  test until fixed. The technical part (P, Z) is an appendix at the end.
- **The test accounts' password and the tester's inbox are in the PDF, NOT in
  the file.** The HTML has `{{HASLO_TESTOWE}}` and `{{SKRZYNKA}}` (the part of
  `TEST_INBOX` before the @); the PDF is made from a copy in the scratchpad with
  the values substituted (the repo is public, these are the values of the
  secrets `TEST_PASSWORD` and `TEST_INBOX`). `TEST_PASSWORD` may equal the public
  `LOCAL_PASSWORD` (decision 14.10.2026: the test accounts are made up, and the
  script does not create panel accounts). Krzysiek's panel password is not in the
  scenario (since 27.10.2026): he changed the temporary one from the first PDF to
  his own.
- **A step names what the tester sees on screen**, not the scenario's own
  labels: the panel does not show the "TURNUS TESTOWY" note on the "Terminy"
  list, so a test date is found there by its dates (since 27.10.2026, found in
  the first production run).
- **Emails in Krzysiek's round go to both**: `TEST_INBOX` and
  `ADMIN_NOTIFY_EMAIL` stay Mateusz's Gmail, and a Gmail filter forwards
  everything from `zapisy@szkolawspinaczkowa.pl` to `biuro@abcwspinania.info`
  (step Z4).
- **Two scripts, one module** (since 22.10.2026, `web/scripts/test-data/`):
  `seed:test:courses` (= the former `seed:test`, the alias stays — the "Test
  data" workflow and the courses scenario use it) and `seed:test:camps` (the
  `docs/testy-obozy.html` scenario). Shared in `common.ts`: inbox, password (the
  same accounts and the same password in both), cleanup, time window. **Separate
  tags** `+abctest-` and `+abctestoboz-` — neither contains the other, so `clean`
  of one does not touch the other's data; "without a tag" counts both. Separate
  windows (`seed-test:since`, `seed-test-camps:since`) and separate date notes
  ("TERMIN TESTOWY…", "TURNUS TESTOWY…"). The camp data writes its states with
  the same functions as the site (`saveRegistration`, `sendRegistrationEmails`
  with `sendEmail` swapped), the turnuses have their own price of 2500 zł; links
  to registration forms are in the summary only locally.
- **Test dates count from the moment of loading.** The courses' open date
  starts 14 days after `seed`, the camps' turnuses after 10 days, ~5 and ~7
  weeks — a round longer than about 10 days needs a new `seed` (which wipes
  what was done). The emails of the daily sweep (the deposit reminder, the
  pre-camp draft) come at the first 8:00 after loading — data loaded in the
  evening = those steps the next morning.
- Data: `TEST_INBOX=you@gmail.com npm run seed:test`
  (`web/scripts/test-data/courses.ts`). Each address is an alias of one inbox
  (`you+abctest-ola@gmail.com`), so the accounts are separate, and the emails —
  real, through Brevo — reach the tester. The `+abctest-` tag in the address and
  the note "TERMIN TESTOWY — nie zapisuj się" on the date are how the script
  finds its data: each run first deletes it, `-- clean` only deletes. It deletes
  broadcasts when ALL their recipients have the tag.
- **In production (since 13.10.2026) — only the "Test data" workflow**
  (`test-data.yml`, confirmation with the word `test-data`; the choice of data
  `courses` or `camps` — since 25.10.2026, courses by default, so the old way
  from `testy-reczne.html` works unchanged; actions `seed`, `clean`,
  `clean-all`), through the same tunnel as Migrate. The repository is PUBLIC, so
  the logs are too: the inbox and the account password are the secrets
  `TEST_INBOX` and `TEST_PASSWORD`, and the script does not print an address, a
  token or a person's data — ids only. **It does not create a panel account in
  production** (a known password to the school's panel in a public repo); testers
  use their own. Ewa's expired link — only locally. The job sets
  `NODE_ENV=production`: with anything else Payload would push the schema to the
  client's database at start (`push` mode) and leave the `dev` row, on which
  Migrate stops. Without `TEST_DATA_ON_PRODUCTION=yes` the script refuses to
  start with `NODE_ENV=production`.
- **What the tester enters WITHOUT the tag** (an account on a real address, a
  phone booking on a real date) can be told from real data only by TIME. The
  first load records the start of the round in `payload.kv` (`seed-test:since`,
  it stays through later loads and `clean`); `clean` lists the ids of untagged
  things from that period, `clean-all` deletes them and closes the period. No
  blind deleting — a real message may arrive in production in that time.
- The seed sends nothing (`payload.sendEmail` swapped); emails go only from the
  tester's clicks. The account for registering from scratch (`+abctest-nowy`)
  is deliberately not created.
- Expired confirmation link (Ewa) — the token and a `verificationSentAt` from 3
  days ago saved through `payload.db.updateOne`, as in `sendVerificationLink`.
- Dates of the dates in the summary through `formatDateRange` — as on the site
  (UTC); a different time zone gave a day of difference against the Terminarz.

### School guide (Instrukcja dla szkoły)

Since 13.10.2026 in the repo: `docs/instrukcja-zapisy.html` (the source of the
PDF "Zapisy na kursy, wysyłki i newsletter" for Krzysiek), screenshots next to
it, in `docs/instrukcja-zapisy/`. Before, only the PDF of 05.10 existed — the
source was lost and at the first update it had to be rebuilt from the PDF's
text. Written in Mateusz's voice, in plain Polish. **You change something the
school sees in the panel or in emails — fix the guide in the same commit.**
Screenshots: the local server, data from `seed:test` with addresses switched to
`@example.com` (no real people and not the tester's address), Chrome headless;
remove the development mode badge (`nextjs-portal`) before the screenshot. The
questions "Zmienić status…?" and "Wysłać do…?" are browser dialogs — not visible
in headless mode, they are described in text.

### Integration tests

Since 05.10.2026 `npm run test:integration` (`web/tests/integration/`), also in
CI (the `integration` job: Postgres as a service, the schema ONLY from
migrations, the `.next/standalone/server.js` server as in the image; the
`docker` job waits for it): a real database and a running server
(`TEST_BASE_URL`, by default `http://localhost:3000`). It checks what unit tests
do not see: who reads what through REST (a participant does not see others'
bookings or the school's data), the race for the last place and the double
click, the newsletter with confirmation, the broadcast queue, recorded emails,
account deletion.

- **Our own small runner, not `node:test`.** The tests go through `payload run`
  (`.env`, `@/` aliases, real Payload — without a new dependency), and that calls
  `process.exit(0)` as soon as the script loads: `node:test` would be cut off,
  and failures would end with code 0. `harness.ts` waits for every test and sets
  the exit code itself; a failed cleanup breaks it too.
- **No email goes out**: the script zeroes `BREVO_API_KEY`, and
  `payload.sendEmail` is swapped for an in-memory inbox the tests read. Over HTTP
  the tests read, get refusals and unsubscribe from the newsletter — nothing that
  sends email. Everything that sends, they call in their own process (the
  broadcast endpoints with a school account on the request), because the
  server's emails cannot be stopped from here.
- **Every record has a tag and is deleted at the end** — they can run on the
  development database. Deleting by `where` goes through `removeWhere`: a bulk
  `payload.delete` does NOT throw, it returns refusals in `errors` — broadcasts
  "w trakcie" stayed in the database silently and blocked the next run's queue.
- **The daily sweep in tests — only on their own turnuses** (`onlySessions` in
  `sendRegistrationReminders`, `sendDepositReminders`,
  `deleteExpiredRegistrations`, `sendWaitingDepositEmails`,
  `preparePreCampDrafts`; since 22.10.2026). The tests run on the development
  database, where the data from `seed:test:camps` lies: a deposit reminder sent
  by a test "to the outbox" marked the tester's booking as reminded and the
  scenario step stopped working.
- **A collection change = restart `npm run dev` before the HTTP tests.** The
  development server does not reload Payload's configuration on the fly
  (measured 04–05.10.2026: new fields unknown, a changed access rule still old),
  so an access test would measure the OLD configuration.
- Checked with mutations 05.10.2026: the "Wyślij" lock removed → a red double
  click test; `read: () => true` in `Bookings` → three red access tests.

---

## Next stages — deliberately outside this skeleton

1. **Bookings and participant accounts.** In Payload login is a property of a
   collection (`auth: true`), so participant accounts will be **a second
   collection with the same mechanism** — not a separate world, like the
   users-permissions plugin in Strapi next to the administrator accounts.
2. **Bookings, participant accounts, broadcasts** — the stage plan of
   01.10.2026 (emails, permissions, accounts, course booking, panel, camps,
   broadcasts, GDPR). Emails work since stage 0 (see "Emails (Brevo)"); the
   contact form notifies Krzysiek, and the panel password reset goes out by
   email. The marketing consent for the newsletter follows the same pattern as
   `src/lib/consent.ts`: text + version, not a bare "yes".
3. **Operations panel** — a camp calendar, charts. In Payload these are **custom
   views in the same panel** (a documented feature), not a separate area in
   Next.js, as it would have had to be with Strapi.

## To be confirmed with the client

- Whether the domain stays `abcwspinania.info`. It appears in
  `deploy/nginx.conf` (three `server_name` blocks) and in the repository variable
  `SITE_URL`. A grep for `abcwspinania.info` must return only these places.
- Phone and email address — Krzysiek enters them in the `site-config` global in
  the panel, without a commit and deploy. As long as the phone is empty, the site
  **does not render** a `tel:` link instead of rendering a broken one.
- The content model: six content collections (`Courses`, `Camps`, `Sessions`,
  `Posts`, `Testimonials`, `Instructors`) and five globals. The labels in the
  panel are in Polish — that is what Krzysiek sees.
