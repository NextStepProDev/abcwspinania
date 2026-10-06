#!/usr/bin/env bash
#
# setup-backups.sh — installs the nightly backup (abc-backup.sh) on the server.
#
# Run by the Deploy workflow on every deployment, next to setup-swap.sh, so a
# change to the backup script reaches the server with the next deploy. Safe
# to run again and again: every step checks before it changes anything.
#
# Installs:  rclone (apt), /usr/local/bin/abc-backup.sh, /etc/cron.d/abc-backup,
#            /etc/logrotate.d/abc-backup, /backups/{db,files,milestones},
#            an empty /etc/abc-backup.env (0600) if there is none.
# Does NOT touch the secrets: /root/.config/rclone/rclone.conf (the Google
# Drive token and the encryption passwords) and HEALTHCHECK_URL are set up by
# hand once — deploy/RESTORE.md, section 0. Until then the script still makes
# the local copies and reports the missing off-site half as a failure.
#
# Usage: sudo bash setup-backups.sh <dir with abc-backup.sh and abc-backup.logrotate>

set -euo pipefail

SRC="${1:-$(dirname "$0")}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Needs root: sudo bash setup-backups.sh <dir>" >&2
  exit 1
fi

echo "==> Backups: installing from ${SRC}"

# 1. rclone. From Ubuntu's own repository — not the vendor's curl | bash
#    installer, which would run a script fetched at deploy time as root. The
#    lock timeout covers unattended-upgrades holding apt at that moment.
if ! command -v rclone >/dev/null 2>&1; then
  echo "    installing rclone"
  apt-get -o DPkg::Lock::Timeout=120 update -qq
  DEBIAN_FRONTEND=noninteractive apt-get -o DPkg::Lock::Timeout=120 install -y -qq rclone
else
  echo "    rclone present: $(rclone version | head -1)"
fi

# 2. The script and its log rotation.
install -m 0755 "${SRC}/abc-backup.sh" /usr/local/bin/abc-backup.sh
install -m 0644 "${SRC}/abc-backup.logrotate" /etc/logrotate.d/abc-backup

# 3. Where the copies live. Root only: these are personal data.
install -d -m 0700 /backups /backups/db /backups/files /backups/milestones

# 4. The healthcheck URL file — created empty once, never overwritten: the
#    value in it is filled by hand and must survive every deploy.
if [[ ! -f /etc/abc-backup.env ]]; then
  install -m 0600 /dev/null /etc/abc-backup.env
  echo '# HEALTHCHECK_URL="https://hc-ping.com/<uuid>"' > /etc/abc-backup.env
  echo "    created empty /etc/abc-backup.env (fill HEALTHCHECK_URL by hand)"
fi

# 5. Schedule: every night at 03:00 server time. A cron.d file, not root's
#    crontab — rewritten whole each time, so it cannot collect duplicates.
cat > /etc/cron.d/abc-backup <<'CRON'
# Nightly backup of ABC Wspinania — installed by setup-backups.sh, do not edit.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 3 * * * root /usr/local/bin/abc-backup.sh
CRON
chmod 0644 /etc/cron.d/abc-backup

# Not `rclone listremotes | grep -q`: under pipefail the early exit of grep
# turns a found remote into a failure (see abc-backup.sh).
REMOTES=$(rclone listremotes 2>/dev/null || true)
if grep -qx 'abc-crypt:' <<<"$REMOTES"; then
  echo "==> Backups installed. Off-site copy: configured"
else
  echo "==> Backups installed. Off-site copy: NOT configured yet (RESTORE.md, section 0)"
fi
