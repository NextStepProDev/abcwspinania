import { SITE_URL } from '@/lib/site'

/**
 * The address links in emails point at.
 *
 * NOT taken from the request's Host header: a forged Host on a "forgot
 * password" request would put the attacker's domain into the reset link that
 * the victim receives, and the one-time token would go to the attacker the
 * moment the victim clicked (password-reset poisoning).
 *
 * NOT `SITE_URL` alone either: that is the TARGET domain, baked into the
 * image, while the site runs on a temporary one until the switch (CLAUDE.md,
 * "Domena tymczasowa i Cloudflare"). `PUBLIC_URL` is read at runtime from
 * `deploy/.env`, so moving domains is a change of one variable.
 */
export function publicUrl(): string {
  return (process.env.PUBLIC_URL || SITE_URL).replace(/\/+$/, '')
}

/** `https://…/konto/ustaw-haslo?token=…` — the token encoded, whatever it holds. */
export function tokenLink(path: string, token: string): string {
  return `${publicUrl()}${path}?token=${encodeURIComponent(token)}`
}

/**
 * Where the unsubscribe header of a NON-newsletter email leads — our page,
 * not Brevo's list (`withServiceUnsubscribe` in `email/brevo.ts`). GET shows
 * the page, Gmail's one-click POST is answered and changes nothing.
 */
export const SERVICE_EMAILS_UNSUBSCRIBE_PATH = '/o-mailach/wypisz'
