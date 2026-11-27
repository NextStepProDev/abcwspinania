---
paths:
  - "docs/**"
  - "web/scripts/test-data/**"
  - "web/tests/**"
  - ".github/workflows/test-data.yml"
  - ".github/workflows/ci.yml"
---

<!-- Moved out of the root CLAUDE.md on 27.11.2026 (size limit). Topic: Manual test scenarios, the school guide, integration tests. -->

## Manual tests (Testy ręczne)

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

## School guide (Instrukcja dla szkoły)

Since 13.10.2026 in the repo: `docs/instrukcja-zapisy.html` (the source of the
PDF "Instrukcja panelu szkoły" for Krzysiek), screenshots next to it, in
`docs/instrukcja-zapisy/`. Before, only the PDF of 05.10 existed — the source
was lost and at the first update it had to be rebuilt from the PDF's text.
Written in Mateusz's voice, in plain Polish. Since 27.11.2026 it covers camps
too, and chapter 30 is the full list of emails — every situation, who gets
which email, and where nothing is sent; Krzysiek answers "does this send an
email?" from it. **You change something the school sees in the panel or in
emails — fix the guide in the same commit, chapter 30 included.**
Screenshots: the local server, data from `seed:test` with addresses switched to
`@example.com` (no real people and not the tester's address), Chrome headless;
remove the development mode badge (`nextjs-portal`) before the screenshot. The
questions "Zmienić status…?" and "Wysłać do…?" are browser dialogs — not visible
in headless mode, they are described in text.

## Integration tests

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
