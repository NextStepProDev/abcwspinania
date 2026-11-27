---
paths:
  - "web/src/lib/email/**"
  - "web/src/lib/broadcast*"
  - "web/src/lib/newsletter*"
  - "web/src/lib/accountEmails*"
  - "web/src/lib/campAccountEmails*"
  - "web/src/lib/messages*"
  - "web/src/collections/Broadcasts.ts"
  - "web/src/collections/BroadcastDeliveries.ts"
  - "web/src/collections/Newsletter.ts"
  - "web/src/collections/Messages.ts"
  - "web/src/app/(frontend)/newsletter/**"
  - "web/src/app/(frontend)/o-mailach/**"
  - "web/src/components/admin/BroadcastPanel*"
  - "web/src/instrumentation.ts"
  - "web/src/payload.config.ts"
---

<!-- Moved out of the root CLAUDE.md on 27.11.2026 (size limit). Topic: Broadcasts, newsletter, sending emails through Brevo. -->

## Broadcasts and newsletter (Wysyłki i newsletter)

Since 03.10.2026 (stage 5). The `Broadcasts` collection ("Wysyłki", group
"Zapisy"), logic in `lib/broadcasts.ts` (pure functions) and
`lib/broadcastSender.ts` (recipients, queue, endpoints), the newsletter in
`lib/newsletter.ts`.

- **Recipient groups:** those booked on one date; everyone with upcoming
  bookings (date from today, status `open`/`waitlist`) — upcoming COURSES,
  upcoming CAMPS, or both (`upcomingCourses`, `upcomingCamps`, `upcoming`; split
  27.11.2026: course participants and camp parents get different messages, and
  a parent read "your upcoming course" under a camp one; `upcoming` stays for
  messages to everyone and for broadcasts sent before); the newsletter (only
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
  01.10.2026: SPF, DKIM and DMARC `PASS` in Gmail. The adapter keeps a `from`
  only on `EMAIL_FROM`'s domain, any other address is replaced by `EMAIL_FROM`
  (`toBrevoBody`) — a foreign address will not pass SPF/DKIM and will land in
  spam or be rejected.
  **When switching to `abcwspinania.info`**: authenticate that domain in Brevo
  and set the variables below in `deploy/.env` — without a new image.
- **Mailboxes per kind** (since 27.11.2026, `lib/email/mailboxes.ts`, decided
  26.10.2026): courses → `COURSE_EMAIL` (kursy@), camps → `CAMP_EMAIL` (obozy@),
  everything else → `EMAIL_FROM` + `ADMIN_NOTIFY_EMAIL` (biuro@). A kind's
  mailbox is its sender, its `replyTo` and where the school's notifications
  about it arrive. Empty = the general ones (locally and in CI — keep them
  empty there). It becomes the sender only on `EMAIL_FROM`'s domain: set before
  the school's domain is authenticated (or a Gmail typed in locally), it would
  be a sender Brevo refuses. Course names stay "ABC Wspinania", camp ones
  "ABC Wspinania · Obozy". New email code takes `senderFor(kind)` and
  `mailboxFor(kind)`, never `ADMIN_NOTIFY_EMAIL` directly.
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
