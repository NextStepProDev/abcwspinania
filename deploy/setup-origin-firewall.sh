#!/usr/bin/env bash
#
# setup-origin-firewall.sh — installs origin-firewall.sh on the server and
# applies it.
#
# Run by the Deploy workflow on every deployment, next to setup-swap.sh and
# setup-backups.sh, so a change to the rules or to the Cloudflare list in
# nginx.conf reaches the server with the next deploy. Safe to run again.
#
# Installs:  /usr/local/sbin/abc-origin-firewall.sh,
#            /etc/systemd/system/abc-origin-firewall.service (enabled),
#            /etc/abc-origin-firewall/cloudflare-v4.txt (from nginx.conf).
#
# Usage: sudo bash setup-origin-firewall.sh <dir with origin-firewall.*> <nginx.conf>

set -euo pipefail

SRC="${1:?usage: setup-origin-firewall.sh <dir> <nginx.conf>}"
NGINX_CONF="${2:?usage: setup-origin-firewall.sh <dir> <nginx.conf>}"
RANGES_DIR="/etc/abc-origin-firewall"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Needs root: sudo bash setup-origin-firewall.sh <dir> <nginx.conf>" >&2
  exit 1
fi

echo "==> Origin firewall: installing from ${SRC}"

# 1. The Cloudflare IPv4 ranges — the same list nginx trusts for the real
#    visitor address. IPv6 ranges are skipped: the ports are published on
#    IPv4 only (docker-compose.prod.yml).
#    A list too short keeps the previous file: the firewall would refuse it
#    anyway, but at the next boot it would have nothing to apply.
RANGES=$(sed -nE 's/^[[:space:]]*set_real_ip_from[[:space:]]+([0-9.]+\/[0-9]+);.*/\1/p' "${NGINX_CONF}")
COUNT=$(grep -c . <<<"${RANGES}" || true)
if (( COUNT < 10 )); then
  echo "ERROR: only ${COUNT} Cloudflare IPv4 ranges in ${NGINX_CONF} — firewall left as it was." >&2
  exit 1
fi
mkdir -p "${RANGES_DIR}"
printf '%s\n' "${RANGES}" > "${RANGES_DIR}/cloudflare-v4.txt.new"
mv "${RANGES_DIR}/cloudflare-v4.txt.new" "${RANGES_DIR}/cloudflare-v4.txt"

# 2. The script and the unit that re-applies it at every boot.
install -m 0755 "${SRC}/origin-firewall.sh" /usr/local/sbin/abc-origin-firewall.sh
install -m 0644 "${SRC}/origin-firewall.service" /etc/systemd/system/abc-origin-firewall.service
systemctl daemon-reload
systemctl enable abc-origin-firewall.service >/dev/null 2>&1

# 3. Apply now. The script itself refuses a broken list and changes nothing;
#    its reason goes to the journal, so show it here, in the deploy log.
if ! systemctl restart abc-origin-firewall.service; then
  journalctl -u abc-origin-firewall.service -n 5 --no-pager -o cat || true
  exit 1
fi
journalctl -u abc-origin-firewall.service -n 1 --no-pager -o cat || true
