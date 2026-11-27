---
paths:
  - "web/src/app/(frontend)/konto/**"
  - "web/src/app/(frontend)/logowanie/**"
  - "web/src/app/(frontend)/rejestracja/**"
  - "web/src/app/(frontend)/polityka-prywatnosci/**"
  - "web/src/app/(frontend)/en/**"
  - "web/src/collections/Customers.ts"
  - "web/src/collections/Users.ts"
  - "web/src/collections/Messages.ts"
  - "web/src/lib/access*"
  - "web/src/lib/account*"
  - "web/src/lib/auth*"
  - "web/src/lib/actionLimit*"
  - "web/src/lib/rateLimit*"
  - "web/src/lib/errorResponse*"
  - "web/src/lib/consent*"
  - "web/src/lib/legal*"
  - "web/src/lib/expiry*"
  - "web/src/lib/personErasure*"
  - "web/src/lib/personDataDocument*"
  - "web/src/lib/validation*"
  - "web/src/components/AccountFields*"
  - "web/src/components/PolicyParts*"
  - "web/src/components/ConsentText*"
  - "web/src/components/admin/ErasePersonPanel*"
  - "web/src/instrumentation.ts"
---

<!-- Moved out of the root CLAUDE.md on 27.11.2026 (size limit). Topic: Privacy policy, participant accounts, panel accounts. -->

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
- **The Google Maps map on `/kontakt` loads straight away, and the policy says
  so** (since 18.11.2026, version 2026-11-18): one paragraph under "Komu
  przekazujemy dane" — Google receives technical data such as the IP address,
  legitimate interest. A click-to-load map with an "IP goes to Google" note was
  considered and rejected (Mateusz's decision): visitors do not know it from
  other sites, and the note reads as if we traded data. Google is not our
  processor, so it is a paragraph after the list, not an item in it. Any other
  third-party embed (YouTube, a widget) — a sentence in the policy in the same
  commit.
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
