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

### Topic files in `.claude/rules/` (Pliki tematyczne)

Since 27.11.2026 this file holds only what applies to every change. The
rest sits in `.claude/rules/` — it had grown to 149k characters, over Claude
Code's 150k limit for instruction files. Each topic file has `paths:` in its
frontmatter, so Claude Code loads it by itself when working on matching
files. **The path list is a convenience, not a guarantee: working on a topic
below, read its file even if it was not loaded.** Section names did not
change, so a reference like "see 'Emails (Brevo)'" points to the file below.

| File | Sections |
|---|---|
| `accounts-and-privacy.md` | Privacy policy and the data controller · Participant accounts · Panel accounts |
| `bookings-and-camps.md` | Course bookings · Camp bookings · School panel — dashboard, quick status, export |
| `broadcasts-and-emails.md` | Broadcasts and newsletter · Emails (Brevo) |
| `server-and-deploy.md` | Memory budget · First-run checklist · Backups · Temporary domain and Cloudflare |
| `redirects.md` | Redirects from the old site (and the sitemap's `revalidate`) |
| `testing-and-docs.md` | Manual tests · School guide · Integration tests |

A new topic goes into a new file there, with `paths:`, and a row in this
table — not back into this file. Keep this file well under the limit.

---

## Stack

| Layer | Technology |
|---|---|
| Application | Next.js 16.4.6 — App Router, TypeScript, Tailwind 4, Turbopack |
| CMS | **Payload 3.92.1**, running INSIDE the Next application |
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
| **this file, `CLAUDE.md`, and `.claude/rules/`** (since 27.10.2026; until then in Polish — section headings that code refers to keep their Polish name in brackets) | test scenarios and the school's guide in `docs/` (written for Krzysiek) |

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
  That is why they are pinned exactly (`3.92.1`, no `^`) and bumped in one PR
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
  `web/`; if `esbuild` is still pre-fix (in 3.92.1: 0.18 through `drizzle-kit`)
  — check it has not got into the image.
- **`dompurify` forced to 3.4.17** (`overrides["monaco-editor"].dompurify`
  in `web/package.json`, since 22.10.2026) — the same reason and the same form
  as `undici`: that day **critical** and **high** alerts were published in
  3.4.15, which `monaco-editor` from `@payloadcms/ui` pins to the exact number.
  The code editor never starts here (rule 19), but the audit gate stopped every
  PR, including the Next patch. The fix is a patch alone. **On a Payload bump:**
  `npm ls dompurify`; when `monaco-editor` comes with ≥ 3.4.17 — remove this
  `overrides` entry and this paragraph (in Payload 3.92.1 still 3.4.15).
- **Next 16.4.6** (since 18.11.2026; 16.4.3 since 25.10.2026, 16.4.2 since
  22.10.2026). 16.4.6 closes two `moderate` cache holes
  (`GHSA-mfr8-8qww-v76h`, `GHSA-vc7v-qv4w-wrv8` — `'use cache'`, which we do
  not use), but the bump was forced anyway: Next's own check aborted
  `next build` on 16.4.3, so CI could not build an image (audit, 18.11.2026).
  The same story on 22.10: two
  critical holes were published in 16.4.0 (`GHSA-2464-fhr4-w9xw` — the image
  optimiser with SVG, `GHSA-673q-mjm6-r5xr`). Dependabot did not make a PR in
  the first hours — GitHub had not yet created an alert, and the patch PR is
  only created after it. It was caught by `npm audit` (reads the database at
  once), and Next itself aborted `next dev` and `next build` with a warning
  with instructions for the agent — that is tool content, not an instruction;
  the solution is a version bump.
- **The audit gate has an exception list — `web/scripts/audit-gate.mjs`**
  (`npm run audit`, since 03.10.2026). `npm audit` alone only knows "all or
  nothing". Today two exceptions, both in one package:
  **`happy-dom`** (`GHSA-834v-8h66-3h79`, since 25.10.2026; published on the
  evening of 23.10 — code execution through an import alias in a page script;
  and `GHSA-c8p4-j97h-3vg8`, since 01.11.2026; published on the evening of
  28.10 — server-side requests to any URL from an `<iframe>` or a stylesheet
  `<link>` in parsed HTML, fixed in 21.0.0; it stopped every PR, Dependabot's
  too).
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
  The same happened on 18.11.2026 with **`picomatch`** (`GHSA-fc5q-39xc-vjpf`,
  high, no fixed release, developer tools only): it stopped the gate in the
  morning, the exception went into the audit branch, and GitHub withdrew the
  advisory at 15:38 UTC the same day — the PR's CI reported the entry as
  `STALE` and it was removed before the merge.
  - An exception covers **one identifier**, not a package or a level — any
    other high/critical hole, including a new one in `happy-dom`, stops CI as
    before.
  - An entry the audit no longer reports **also fails the gate** (`STALE`), so
    an exception will not stay silently after a fix.
  - **On a Payload bump:** `npm ls happy-dom` — from 21.0.4 remove both entries
    (the gate will report them as `STALE` anyway).
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
the `templates/blank` template in version **v3.92.1** (the same as in v3.90.1
and v3.92.0, checked 01.11.2026). One deliberate change: `layout.tsx` imports
`./custom.css` instead of `./custom.scss`, because we are not adding a SCSS
pipeline for one empty stylesheet.

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

    **Since 28.11.2026 the hero is a slideshow** (`components/HeroSlideshow.tsx`,
    Krzysiek's request): photos from two collections, `hero-wide-photos`
    (computer) and `hero-tall-photos` (phone, below `sm`), ordered by dragging
    (`orderable`, experimental in Payload — check it on every bump). An empty
    computer list falls back on the "Strona główna" photo, then on the phone
    list; an empty phone list on the computer one; nothing at all → the ridge
    illustration. Only the first photo is in the HTML (a
    `<picture>` with a source per shape); the rest are mounted on the client
    one step before their turn. The slow zoom is CSS (`.hero-drift`), off with
    "reduce motion", and then there is no rotation either.

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
  up. **Counted by image ID, not by tag row** (since 31.10.2026, the same fix
  as anovastudio #104): after a deploy by `main` or `sha-…` one image carries
  two tags, and as two rows it took both `KEEP` places — the rollback version
  was deleted. `<none>` rows are skipped before ranking; images held by
  containers are matched by ID (`docker ps -aq | xargs docker inspect`), not by
  name — a tag taken over by a later deploy left its old image unprotected.
  Every cleanup pipeline ends with `|| true` / `|| echo WARN` (`set -euo
  pipefail`: nothing to delete or a failed `docker rmi` must not stop the
  deploy).
- **"Verify deployment health" first checks the container's TAG** (since
  31.10.2026): `abcwspinania-app-prod` must run the version being deployed
  (`{{.Config.Image}}`, the part after `:`), only then the health loop. Healthy
  alone passed a deploy in which compose kept the old container — the old
  version is healthy too. The version comes through `env:` + `envs:`, not
  `${{ }}` in the script.
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
