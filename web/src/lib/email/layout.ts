import type { EmailLanguage } from '@/lib/email/language'
import { publicUrl } from '@/lib/email/links'
import { BRAND_COLORS } from '@/lib/site'

/**
 * The one look every email shares — and its plain-text twin.
 *
 * Templates describe CONTENT (a heading, paragraphs, a list of details, one
 * button); this file turns it into HTML. Two reasons for the split: a change of
 * look is one file instead of one per template, and every value passes through
 * `escapeHtml` in one place — a template that built its own HTML would sooner
 * or later paste a visitor's name straight into the markup.
 *
 * Email HTML is its own dialect: tables and inline styles, because desktop
 * Outlook renders with Word's engine and ignores most layout CSS, and several
 * webmail clients strip or rewrite `<style>` blocks. No images either —
 * a logo from `SITE_URL` is broken in every email sent locally and blocked by
 * default in many clients; the brand name in the brand colour reads everywhere.
 *
 * Every email also carries a `text` part. Without it spam filters score the
 * message worse, and plain-text clients and some watches show only that.
 *
 * Pure functions — tested under `node --test`.
 */

export interface EmailContent {
  lang: EmailLanguage
  /** Shown by the inbox next to the subject, before the email is opened. */
  preheader?: string
  heading: string
  paragraphs: string[]
  /**
   * Formatted content after the paragraphs — ONLY the output of
   * `renderRichText` (`richText.ts`), which escapes every piece of text itself.
   * Inserted as is: never build this from a visitor's input by hand.
   */
  body?: { html: string; text: string }
  /** Label–value rows, e.g. the data someone typed into a form. */
  details?: [label: string, value: string][]
  action?: { label: string; href: string }
  /** A plain link under the button — the second, less likely choice. */
  secondaryAction?: { label: string; href: string }
  /** Small print under the content, e.g. why this person got the email. */
  note?: string
}

export interface RenderedEmail {
  html: string
  text: string
}

const ACCENT = BRAND_COLORS.accent
const INK = BRAND_COLORS.ink
const SURFACE = BRAND_COLORS.surface
const MUTED = BRAND_COLORS.muted
const LINE = BRAND_COLORS.line

const TAGLINE: Record<EmailLanguage, string> = {
  pl: 'szkoła wspinaczkowa · Jura Krakowsko-Częstochowska',
  en: 'climbing school · Kraków-Częstochowa Upland, Poland',
}

/**
 * The header: the ORIGINAL logo (decided 12.10.2026 — the client's PDF as
 * drawn, `design/logo/email_logo.py`, not the site's completed sign) beside
 * the school's name as TEXT. Outlook blocks images until the reader allows
 * them: the name keeps the header readable, an image-only header would be an
 * empty box. `alt=""` for that reason too — the name is right next to it.
 * A PNG from our own server (`publicUrl`): emails show no SVG. In local tests
 * the address is localhost, which Gmail cannot fetch — an empty frame there.
 * Width only: the height follows the file's own proportions — never squeezed.
 */
function header(lang: EmailLanguage): string {
  return (
    `<tr><td style="padding:18px 28px;border-bottom:3px solid ${ACCENT}">` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="vertical-align:middle"><img src="${escapeHtml(publicUrl())}/logo/email-logo.png" width="57" alt="" style="display:block;border:0;height:auto"></td>` +
    `<td style="vertical-align:middle;padding-left:14px">` +
    `<div style="font-weight:bold;font-size:20px;color:${ACCENT}">ABC Wspinania</div>` +
    `<div style="font-size:13px;color:${MUTED}">${escapeHtml(TAGLINE[lang])}</div>` +
    `</td></tr></table></td></tr>`
  )
}

const FOOTER: Record<EmailLanguage, string> = {
  pl: 'ABC Wspinania · szkoła wspinaczkowa · Jura Krakowsko-Częstochowska',
  en: 'ABC Wspinania · climbing school · Kraków-Częstochowa Upland, Poland',
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Line breaks typed into a form survive into the email instead of collapsing. */
function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

export function renderEmail(content: EmailContent): RenderedEmail {
  return { html: renderHtml(content), text: renderText(content) }
}

function renderHtml({
  lang,
  preheader,
  heading,
  paragraphs,
  body,
  details,
  action,
  secondaryAction,
  note,
}: EmailContent) {
  const rows = (details ?? [])
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:${MUTED};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;color:${INK}">${multiline(value)}</td></tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:${SURFACE};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:${INK}">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE}">
<tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:8px">
${header(lang)}
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${INK}">${escapeHtml(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px">${multiline(p)}</p>`).join('\n')}
${body?.html ?? ''}
${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;font-size:15px">${rows}</table>` : ''}
${
  action
    ? `<p style="margin:20px 0"><a href="${escapeHtml(action.href)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:6px">${escapeHtml(action.label)}</a></p>`
    : ''
}
${
  secondaryAction
    ? `<p style="margin:0 0 14px"><a href="${escapeHtml(secondaryAction.href)}" style="color:${ACCENT}">${escapeHtml(secondaryAction.label)}</a></p>`
    : ''
}
${note ? `<p style="margin:18px 0 0;font-size:13px;color:${MUTED}">${multiline(note)}</p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid ${LINE};font-size:12px;color:${MUTED}">${escapeHtml(FOOTER[lang])}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function renderText({
  lang,
  heading,
  paragraphs,
  body,
  details,
  action,
  secondaryAction,
  note,
}: EmailContent): string {
  const parts = [heading, '', ...paragraphs.flatMap((p) => [p, ''])]
  if (body?.text) parts.push(body.text, '')
  if (details?.length) {
    parts.push(...details.map(([label, value]) => `${label}: ${value}`), '')
  }
  if (action) parts.push(`${action.label}: ${action.href}`, '')
  if (secondaryAction) parts.push(`${secondaryAction.label}: ${secondaryAction.href}`, '')
  if (note) parts.push(note, '')
  parts.push('—', FOOTER[lang])
  return parts.join('\n')
}
