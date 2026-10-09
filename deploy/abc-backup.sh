#!/bin/bash
#
# abc-backup.sh — daily backup of the ABC Wspinania production stack.
#
#   1. pg_dump of the database      -> /backups/db/<date>.sql.gz
#   2. tar of the uploads volume    -> /backups/files/<date>.tar.gz — only when
#      the uploads changed, or the newest archive is FILES_REFRESH_DAYS old
#   3. upload to the encrypted Google Drive remote (abc-crypt:)
#   4. prune: 7 days locally, 40 days on the remote — /backups/milestones is
#      exempt, and the newest uploads archive is always kept locally
#
# Two levels, as promised in ZAKRES.md (item 7): the server's own disk for a
# quick restore, and an encrypted copy off the server for when the server
# itself is gone. Encrypted BEFORE upload by rclone's crypt remote: what sits
# on Google Drive is unreadable without the passwords in rclone.conf.
#
# Every artefact is written as <name>.part, verified, and only then renamed —
# a half-written dump never takes the name a restore would reach for.
#
# Modelled on Next Step Pro's nsp-backup.sh, which has run nightly since
# 09.2026; the reasons behind each step are kept from there.
#
# Installed to /usr/local/bin/abc-backup.sh by setup-backups.sh, which the
# Deploy workflow runs every time. Cron: /etc/cron.d/abc-backup, 03:00.
# Recovery runbook: deploy/RESTORE.md.

# -E so the ERR trap also fires inside functions; without it a failure there is silent.
set -Eeuo pipefail

DATE=$(date +%Y-%m-%d)
# Every path and name below can be overridden from the environment — for a
# rehearsal on a development machine; the defaults are production.
BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DB_DIR="${BACKUP_ROOT}/db"
FILES_DIR="${BACKUP_ROOT}/files"
# Dumps taken by hand before a risky operation (a schema migration on data
# that matters, a major Postgres upgrade) go here, and NO prune touches them,
# local or remote. In Next Step Pro a pre-upgrade dump kept next to the daily
# ones was one night from deletion while the volume it backed up was gone.
MILESTONE_DIR="${BACKUP_ROOT}/milestones"
DB_BACKUP="${DB_DIR}/${DATE}.sql.gz"
FILES_BACKUP="${FILES_DIR}/${DATE}.tar.gz"
DB_CONTAINER="${DB_CONTAINER:-abcwspinania-postgres-prod}"
# Compose prefixes volumes with the project name — the directory, `abcwspinania`.
UPLOADS_VOLUME="${UPLOADS_VOLUME:-abcwspinania_abcwspinania_uploads_prod}"
LOG="${LOG:-/var/log/abc-backup.log}"
REMOTE="${REMOTE:-abc-crypt:}"
LOCAL_RETENTION_DAYS=7
# 40 days, not 90 — set on 09.10.2026 for all four projects that back up this
# way, after the Drive the other three share was measured a month from full.
# This one has a Drive account of its own; the rule is kept the same so the
# four runbooks stay interchangeable. The privacy policy states "up to 40
# days" — change this number and the policy page changes with it.
REMOTE_RETENTION_DAYS=40

# The uploads archive is only made when the uploads changed. Every archive is a
# complete copy, so a nightly archive of the same photos spent Drive space for
# nothing. Each archive is still FULL, never incremental: a restore is the
# chosen dump plus the newest uploads archive dated on or before it — no newer
# archive means precisely that nothing changed in between.
#
# The state file holds a fingerprint of the volume (path, size and mtime of
# every file). Even with no change an archive is made every FILES_REFRESH_DAYS
# days, which must stay below REMOTE_RETENTION_DAYS, or the remote prune would
# delete the only archive there is. No state file (a new server) means an
# archive straight away.
FILES_REFRESH_DAYS=30
FILES_STATE="${FILES_STATE:-/var/lib/abc-backup/files-state}"

# HEALTHCHECK_URL lives here, never in git — the URL is the credential.
# Missing or empty = no pings; the backup runs the same.
ENV_FILE="${ENV_FILE:-/etc/abc-backup.env}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

HEALTHCHECK_URL=""
# shellcheck source=/dev/null
[ -r "$ENV_FILE" ] && . "$ENV_FILE"

# A monitor that cannot be reached must never fail the backup — the backup is
# the point, the ping only reports on it.
ping_healthcheck() {
  [ -n "${HEALTHCHECK_URL}" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${HEALTHCHECK_URL}${1:-}" \
    || log "WARN: healthcheck ping '${1:-<success>}' failed — backup itself unaffected"
}

PINGED_FAIL=0
notify_fail() {
  [ "$PINGED_FAIL" -eq 1 ] && return 0
  PINGED_FAIL=1
  ping_healthcheck "/fail"
}

fail() { log "ERROR: $*"; notify_fail; exit 1; }

# shellcheck disable=SC2154  # `code` is assigned inside the trap string itself.
trap 'code=$?; log "ERROR: unexpected failure at line ${LINENO} (exit ${code})"; notify_fail' ERR

log "=== Backup start ==="
ping_healthcheck "/start"
mkdir -p "$DB_DIR" "$FILES_DIR" "$MILESTONE_DIR" "$(dirname "$FILES_STATE")"

[ "$FILES_REFRESH_DAYS" -lt "$REMOTE_RETENTION_DAYS" ] \
  || fail "FILES_REFRESH_DAYS (${FILES_REFRESH_DAYS}) must be below REMOTE_RETENTION_DAYS (${REMOTE_RETENTION_DAYS}) — Drive would be left without an uploads archive"

# --------------------------------------------------------------------------
# 1. Database
# --------------------------------------------------------------------------
# User and database name from the container's own environment — no secret in
# this file, and nothing to keep in step with deploy/.env.
log "DB dump -> ${DB_BACKUP}.part"
docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "${DB_BACKUP}.part"

# A dump cut short still gzips cleanly (gzip writes a valid trailer at EOF),
# so `gunzip -t` passes it. Only pg_dump's own end marker proves it ran to the
# end. 20 lines, not 5: PostgreSQL 17.6+ appends `\unrestrict <token>` after
# the marker, and another trailing line in a future version must not turn a
# good backup into a nightly false alarm.
# The tail is read into a variable first, not piped into `grep -q`: grep -q
# exits at its first match, the writer then gets SIGPIPE, and under
# `pipefail` the whole test fails — a good dump reported as truncated.
DUMP_TAIL=$(gunzip -c "${DB_BACKUP}.part" | tail -20)
if ! grep -q 'PostgreSQL database dump complete' <<<"$DUMP_TAIL"; then
  fail "DB dump has no completion marker — truncated. Kept as ${DB_BACKUP}.part for inspection."
fi
mv "${DB_BACKUP}.part" "$DB_BACKUP"
log "DB OK: $(du -sh "$DB_BACKUP" | cut -f1)"

# --------------------------------------------------------------------------
# 2. Uploaded files (Media and the gallery)
# --------------------------------------------------------------------------
# The image cache volume is left out on purpose: Next rebuilds it on demand.
#
# Fingerprint of the volume: path|size|mtime of every file, sorted and hashed.
# Adding, removing or replacing an upload changes it. Taken BEFORE the archive:
# a file added in between lands in the archive and changes tomorrow's
# fingerprint — at worst one archive too many, never one too few.
FILES_FP=$(docker run --rm -v "${UPLOADS_VOLUME}:/data:ro" alpine \
  sh -c 'cd /data && find . -type f -exec stat -c "%n|%s|%Y" {} + | sort' \
  | sha256sum | cut -d' ' -f1)

PREV_FP=""
PREV_AT=0
if [ -r "$FILES_STATE" ]; then
  read -r PREV_FP PREV_AT < "$FILES_STATE" || true
fi
# A damaged state file (a write cut short by a full disk) must not break every
# night's backup: anything that is not a number counts as no state, so an
# archive is made and the write after it repairs the file.
case "$PREV_AT" in
  ''|*[!0-9]*) PREV_FP=""; PREV_AT=0 ;;
esac
FILES_AGE_DAYS=$(( ( $(date +%s) - PREV_AT ) / 86400 ))

if [ "$FILES_FP" != "$PREV_FP" ] || [ "$FILES_AGE_DAYS" -ge "$FILES_REFRESH_DAYS" ]; then
  log "Files archive -> ${FILES_BACKUP}.part"
  docker run --rm -v "${UPLOADS_VOLUME}:/data:ro" -v "${FILES_DIR}:/backup" alpine \
    tar czf "/backup/${DATE}.tar.gz.part" -C /data .

  # Reads the whole archive back through gzip + tar: catches a corrupt stream
  # and a truncated member table — what a disk filling up mid-tar produces.
  if ! tar tzf "${FILES_BACKUP}.part" >/dev/null 2>&1; then
    fail "Files archive is unreadable — kept as ${FILES_BACKUP}.part for inspection."
  fi
  mv "${FILES_BACKUP}.part" "$FILES_BACKUP"
  # Written only once the archive is published: a run that dies leaves the old
  # fingerprint, so the next run makes the archive again.
  printf '%s %s\n' "$FILES_FP" "$(date +%s)" > "$FILES_STATE"
  log "Files OK: $(du -sh "$FILES_BACKUP" | cut -f1)"
else
  log "Files unchanged since $(date -d "@${PREV_AT}" +%F 2>/dev/null || echo "${FILES_AGE_DAYS} days ago") — newest archive still current, not making another"
fi

# --------------------------------------------------------------------------
# 3. Upload — copy, never sync
# --------------------------------------------------------------------------
# Not configured yet (no rclone.conf with the remote): the local copies above
# stand, and the run reports a failure, so the missing off-site half is seen.
# Read into a variable, not piped into `grep -q` — found 06.10.2026 on the
# first real run: grep -q stopped at `abc-crypt:`, rclone got SIGPIPE writing
# `gdrive:`, and under `pipefail` a configured remote read as missing (141).
REMOTES=$(rclone listremotes 2>/dev/null || true)
if ! grep -qx "${REMOTE}" <<<"$REMOTES"; then
  fail "rclone remote ${REMOTE} is not configured — local copies made, NOTHING sent off the server."
fi
# `sync` mirrors the local directory, so the local prune below would delete
# the remote copies too and the off-site archive could never outlive local
# retention. `.part` files are excluded: an unverified artefact must not leave.
log "Upload to ${REMOTE} (copy)"
rclone copy "$BACKUP_ROOT" "$REMOTE" --exclude "*.part" --log-file="$LOG" --log-level INFO

# --------------------------------------------------------------------------
# 4. Prune — the two archives age independently
# --------------------------------------------------------------------------
log "Prune remote older than ${REMOTE_RETENTION_DAYS}d"
# The exclude is the remote half of the milestone rule above.
rclone delete "$REMOTE" --min-age "${REMOTE_RETENTION_DAYS}d" \
  --exclude "milestones/**" --log-file="$LOG" --log-level INFO

log "Prune local older than ${LOCAL_RETENTION_DAYS}d"
find "$DB_DIR"    -name '*.sql.gz' -mtime "+${LOCAL_RETENTION_DAYS}" -delete
# The newest uploads archive always stays, even past 7 days: while nothing
# changes it IS the current copy, and a restore from this box alone (no Drive)
# must still have one. File names are dates, so sorting by name is by age.
NEWEST_FILES=$(find "$FILES_DIR" -maxdepth 1 -name '*.tar.gz' | sort | tail -1)
find "$FILES_DIR" -name '*.tar.gz' -mtime "+${LOCAL_RETENTION_DAYS}" ! -path "${NEWEST_FILES:-/none}" -delete
# Leftovers from failed runs: kept for inspection, but not forever.
find "$DB_DIR" "$FILES_DIR" -name '*.part' -mtime "+${LOCAL_RETENTION_DAYS}" -delete

log "=== Backup done ==="
ping_healthcheck
