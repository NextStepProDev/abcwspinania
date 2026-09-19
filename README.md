<div align="center">

# 🧗 ABC Wspinania

**A climbing school's digital home — courses, camps, and the people who teach them.**

Rock climbing from the first knot to the first lead. Courses and camps for children,
teenagers, and adults on the limestone of the Kraków-Częstochowa Upland.

Rzędkowice · Jura Krakowsko-Częstochowska · Polish-language site

</div>

---

> **Status: in development.** Not deployed yet.

## What this is

ABC Wspinania is a climbing school that has spent decades teaching people to move
on rock. This is its new online home: a place where someone thinking about their
first course can find out what it involves, what it costs, and who will be holding
the other end of the rope — and then reach the school in one step, without copying
an email address by hand.

Everything lives in **one application**: the public site and the panel the school
uses to run it are the same thing. There is no second system to log into and
nothing to keep in sync by hand.

## Who it's for

| Audience | What they get |
|----------|---------------|
| **Someone new to climbing** | A plain answer to "what is this course, how long does it take, what does it cost" — and a way to ask the rest. |
| **A parent** | What a camp involves and who runs it, before deciding to send a child away for a week. |
| **The school** | One place to keep the offer current, and every enquiry landing somewhere it can be answered. |
| **The business** | A presence search engines can actually read, and links that look like something when shared. |

## What the site does today

- **The offer, kept current by the school itself.** Every course is an entry the
  school edits: name, description, price, duration, level, and a photo. A course
  with no price set reads as *wycena indywidualna* — never as free.
- **A page per course**, with its own address, so a specific course can be sent to
  someone directly instead of "scroll down until you find it".
- **A contact form that works.** Enquiries are stored and waiting in the panel —
  nothing depends on an email reaching an inbox, and nothing is lost if one doesn't.
  The phone number is a link you can tap.
- **Consent recorded properly.** The wording of the privacy clause is saved
  alongside each enquiry, not a silent yes — so it stays clear what any given
  person actually agreed to, even after the wording changes.
- **Readable by search engines and by people sharing links.** Structured business
  data, a sitemap that keeps itself current, and proper previews on social media.
- **Usable without a mouse.** Skip link, labelled fields, errors announced to
  screen readers, and motion reduced for anyone whose system asks for it.

## What's coming

None of the following is built yet. They are the reason the foundation was designed
the way it is.

- 🗓️ **Online enrollment** for courses and camps, with participant accounts.
- ✉️ **Email notifications and a newsletter**, with marketing consent recorded the
  same careful way as the contact form's.
- 📋 **Tourist Guarantee Fund reporting** — the statutory monthly filing of
  participant contracts, submitted through the fund's API instead of by hand.
- 📊 **An operations view** for the school: camp calendar, rosters, and the figures
  behind them.

## Privacy and security

- **Enquiries are private.** Anyone may send one; only a signed-in member of the
  school can read, edit, or delete them. The data never leaves the school's own
  server.
- **The panel is not advertised.** It is excluded from search engines, and the
  sign-in and password-reset paths are rate-limited against guessing.
- **Consent is evidence, not a checkbox.** The exact wording accepted, and when,
  is stored with the enquiry.
- Modern transport encryption only, a strict content policy on the public pages,
  and no announcement of what the site is built on.

## Under the hood (in brief)

One application, one deployment: the public site, the editing panel, and the API
are a single process, self-hosted alongside its own database.

```
web/       # the application — public site, panel, API
deploy/    # what it takes to run it in production
```

---

> **Public, but not open source.** This repository is public so the work can be
> looked at, not reused. The software was commissioned and all rights are reserved
> — see [LICENSE](./LICENSE). External issues and pull requests are not accepted.
> Security problems go to [SECURITY.md](./.github/SECURITY.md), **not** a public issue.

<div align="center">

**ABC Wspinania** · Jura Krakowsko-Częstochowska

</div>
