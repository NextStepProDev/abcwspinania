---
paths:
  - "web/src/app/(frontend)/kursy/**"
  - "web/src/app/(frontend)/obozy/**"
  - "web/src/app/(frontend)/konto/**"
  - "web/src/collections/Bookings.ts"
  - "web/src/collections/Sessions.ts"
  - "web/src/collections/CampRegistrations.ts"
  - "web/src/collections/PrivateFiles.ts"
  - "web/src/collections/Camps.ts"
  - "web/src/globals/CampConfig.ts"
  - "web/src/lib/booking*"
  - "web/src/lib/camp*"
  - "web/src/lib/contractPdf*"
  - "web/src/lib/pesel*"
  - "web/src/lib/plnInWords*"
  - "web/src/lib/participantBookings*"
  - "web/src/lib/privateFiles*"
  - "web/src/lib/sessionExport*"
  - "web/src/lib/csv*"
  - "web/src/lib/adminListUrl*"
  - "web/src/lib/dashboardConditions*"
  - "web/src/lib/expiry*"
  - "web/src/lib/personErasure*"
  - "web/src/components/admin/**"
  - "web/src/app/(payload)/**"
---

<!-- Moved out of the root CLAUDE.md on 27.11.2026 (size limit). Topic: Course bookings, camp bookings, the school panel (dashboard, status, export). -->

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
  automatically — Krzysiek may want to call first. To the kind's mailbox
  (since 27.11.2026): a camp's to `CAMP_EMAIL`, saying "Obóz" and "Turnus"
  and naming the children with their parent (`waitingListName`) — until then
  it went to the general box, said "Kurs" and listed the parents.
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
  like `ADMIN_NOTIFY_EMAIL`. It is also the SENDER — but only when on the
  domain of `EMAIL_FROM` (see "Mailboxes per kind" in "Emails (Brevo)"). **Locally
  `CAMP_EMAIL` stays EMPTY.**
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
  change in the panel — and so does the balance ("zostało X zł" in the deposit
  email and reminder, and on "Moje konto": `bookingPrice`, since 27.11.2026;
  before, it followed the new price while the signed contract said the old);
  the rest (parent, address, list of children) is built
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
    Obozy" and `replyTo` to `CAMP_EMAIL` (`mailKindOf` in `broadcastSender.ts`;
    a course date or "upcoming courses" — the course mailbox, the same way).
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
  — a click on the wrong row must not send "zapis anulowany". The question is
  `statusChangeQuestion` (`lib/bookings.ts`, tested): it also asks when a camp
  child leaves the waiting list for a place, because the form link goes then
  (until 27.11.2026 "lista rezerwowa" → "zgłoszony" asked nothing). The same for
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
