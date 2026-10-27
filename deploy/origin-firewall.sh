#!/usr/bin/env bash
#
# origin-firewall.sh — the site's ports (80, 443) answer Cloudflare only.
#
# Without it, anyone who knows the server's address talks to nginx directly
# and skips everything Cloudflare does in front of it: the custom rules
# blocking scanners (`.env`, `.php`, …), the managed rules, DDoS protection.
#
# The rules live in our own chain, ABC-ORIGIN, jumped to from DOCKER-USER.
# Docker publishes ports by NAT and the FORWARD path, so the INPUT chain (ufw,
# a plain `iptables -A INPUT`) never sees that traffic — DOCKER-USER is the
# place Docker leaves for this. Matching:
#   * `--ctstate DNAT` — only connections Docker port-forwarded INTO a
#     container. The app's own outgoing calls (Brevo API on :443) also cross
#     DOCKER-USER; next-step-pro dropped them by port at first and the app hung
#     on every outgoing HTTPS call (504). Outgoing traffic is SNAT, never DNAT.
#   * `--ctorigsrc` / `--ctorigdstport` — the address and the port before NAT,
#     i.e. the visitor and the published host port, not the container's.
# Traffic from the server itself (deploy health checks, `curl localhost`)
# goes through OUTPUT, not FORWARD, and is not affected. SSH is not a Docker
# port and is not affected either.
#
# The Cloudflare ranges come from /etc/abc-origin-firewall/cloudflare-v4.txt,
# written by setup-origin-firewall.sh from the `set_real_ip_from` lines of
# nginx.conf — one list for both, so a range added for nginx is not forgotten
# here. A range missing from it = visitors served by that Cloudflare location
# get "522 Connection timed out".
#
# Safe to run again and again (rebuilds the chain). Refuses to touch anything
# when the list looks broken — a site closed to Cloudflare is down for all.
#
# Usage: sudo bash origin-firewall.sh          (the systemd unit does it at boot)
#        sudo bash origin-firewall.sh --remove (takes the rules out completely)

set -euo pipefail

RANGES_FILE="/etc/abc-origin-firewall/cloudflare-v4.txt"
CHAIN="ABC-ORIGIN"
PORTS="80 443"
# Cloudflare publishes 15 IPv4 ranges (10.2026). Fewer than this means the
# list was cut or parsed wrong — better no filter than a site closed to all.
MIN_RANGES=10

if [[ "${EUID}" -ne 0 ]]; then
  echo "Needs root: sudo bash origin-firewall.sh" >&2
  exit 1
fi

if [[ "${1:-}" == "--remove" ]]; then
  while iptables -D DOCKER-USER -j "${CHAIN}" 2>/dev/null; do :; done
  iptables -F "${CHAIN}" 2>/dev/null || true
  iptables -X "${CHAIN}" 2>/dev/null || true
  echo "==> Origin firewall removed: ports 80/443 open to everyone again."
  exit 0
fi

RANGES=()
while read -r line; do
  [[ -z "${line}" ]] && continue
  if [[ ! "${line}" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}/[0-9]{1,2}$ ]]; then
    echo "ERROR: not an IPv4 range in ${RANGES_FILE}: ${line} — nothing changed." >&2
    exit 1
  fi
  RANGES+=("${line}")
done < <(cat "${RANGES_FILE}" 2>/dev/null || true)

if (( ${#RANGES[@]} < MIN_RANGES )); then
  echo "ERROR: ${#RANGES[@]} Cloudflare ranges in ${RANGES_FILE} (expected at least ${MIN_RANGES}) — nothing changed." >&2
  exit 1
fi

# At boot the unit starts right after docker.service, which creates
# DOCKER-USER a moment later.
for _ in $(seq 1 30); do
  iptables -L DOCKER-USER -n >/dev/null 2>&1 && break
  sleep 2
done
if ! iptables -L DOCKER-USER -n >/dev/null 2>&1; then
  echo "ERROR: no DOCKER-USER chain — is Docker running? Nothing changed." >&2
  exit 1
fi

iptables -N "${CHAIN}" 2>/dev/null || true
iptables -F "${CHAIN}"
for port in ${PORTS}; do
  for range in "${RANGES[@]}"; do
    iptables -A "${CHAIN}" -p tcp -m conntrack --ctstate DNAT --ctdir ORIGINAL \
      --ctorigsrc "${range}" --ctorigdstport "${port}" -j RETURN
  done
  iptables -A "${CHAIN}" -p tcp -m conntrack --ctstate DNAT --ctdir ORIGINAL \
    --ctorigdstport "${port}" -j DROP
done

iptables -C DOCKER-USER -j "${CHAIN}" 2>/dev/null || iptables -I DOCKER-USER 1 -j "${CHAIN}"

echo "==> Origin firewall: ports ${PORTS// /, } only from ${#RANGES[@]} Cloudflare ranges."
