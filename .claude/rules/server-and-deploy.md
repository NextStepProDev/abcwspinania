---
paths:
  - "deploy/**"
  - "docker-compose*.yml"
  - ".github/workflows/**"
  - "web/Dockerfile"
  - "web/next.config.ts"
---

<!-- Moved out of the root CLAUDE.md on 27.11.2026 (size limit). Topic: Memory budget, first-run checklist, backups, temporary domain and Cloudflare. -->

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
   domain authenticated in Brevo), `ADMIN_NOTIFY_EMAIL`, `COURSE_EMAIL` and
   `CAMP_EMAIL` (the courses and camps mailboxes, on `EMAIL_FROM`'s domain) and `PUBLIC_URL` (the address at which the site works NOW — links in
   emails to participants). In Brevo: "Anonymous email tracking: Yes". Without
   the key the site works, but emails land in the container log.

**What is NOT on this list any more:** clicking through public permissions in
the panel. They are in code and travel with the deploy.

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
  with a new migration on real data, a Postgres major). Exempt from the 7-day
  local prune, deleted after 40 days locally and on Drive (since 18.11.2026,
  audit). Until then nothing pruned them, while the privacy policy says
  backups live "do 40 dni" — the promise to the visitor decides, a dump that
  must live longer is moved off the server by hand.
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
