import { escapeHtml } from '@/lib/email/layout'
import { BRAND_COLORS } from '@/lib/site'

/**
 * Rich text from the panel's editor (Lexical JSON) → email HTML and plain text.
 *
 * Our own walk over the JSON instead of `@payloadcms/richtext-lexical/html`:
 *  - email needs INLINE styles (Outlook ignores classes and `<style>`), and
 *    the stock converter emits class names;
 *  - every piece of text goes through the same `escapeHtml` as the rest of
 *    the email (`layout.ts`), so nothing in the body is pasted in raw;
 *  - links are limited to http(s), mailto and tel — a `javascript:` URL typed
 *    into the link dialog renders as plain text;
 *  - the plain-text twin comes from the same walk, so the two never disagree.
 *
 * Only the nodes the broadcast editor offers are styled (paragraph, heading,
 * lists, links, bold / italic / underline). Anything else — say, content
 * pasted from elsewhere — keeps its text and loses its formatting rather
 * than disappearing.
 *
 * Pure — tested under `node --test`.
 */

export interface LexicalNode {
  type?: string
  text?: string
  format?: number | string
  tag?: string
  listType?: string
  url?: string
  fields?: { url?: string; linkType?: string; newTab?: boolean }
  children?: LexicalNode[]
}

export interface RichTextValue {
  root?: LexicalNode
}

export interface RenderedRichText {
  html: string
  text: string
}

const ACCENT = BRAND_COLORS.accent
const INK = BRAND_COLORS.ink

// Lexical's text format bitmask (lexical/LexicalConstants: IS_BOLD etc.).
const BOLD = 1
const ITALIC = 2
const UNDERLINE = 8

const SAFE_URL = /^(https?:\/\/|mailto:|tel:)/i

/** The href of a link node, or null when it is internal, empty or unsafe. */
export function safeHref(node: LexicalNode): string | null {
  const url = (node.fields?.url ?? node.url ?? '').trim()
  if (node.fields?.linkType === 'internal') return null
  return SAFE_URL.test(url) ? url : null
}

function inlineHtml(nodes: LexicalNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'linebreak') return '<br>'
      if (node.type === 'tab') return ' '
      if (node.type === 'link' || node.type === 'autolink') {
        const inner = inlineHtml(node.children)
        const href = safeHref(node)
        return href ? `<a href="${escapeHtml(href)}" style="color:${ACCENT}">${inner}</a>` : inner
      }
      if (typeof node.text === 'string') {
        let html = escapeHtml(node.text)
        const format = typeof node.format === 'number' ? node.format : 0
        if (format & BOLD) html = `<strong>${html}</strong>`
        if (format & ITALIC) html = `<em>${html}</em>`
        if (format & UNDERLINE) html = `<u>${html}</u>`
        return html
      }
      return inlineHtml(node.children)
    })
    .join('')
}

function inlineText(nodes: LexicalNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'linebreak') return '\n'
      if (node.type === 'tab') return ' '
      if (node.type === 'link' || node.type === 'autolink') {
        const inner = inlineText(node.children)
        const href = safeHref(node)
        // The address after the words — a plain-text reader has no other way to it.
        return href && href !== inner ? `${inner} (${href})` : inner
      }
      if (typeof node.text === 'string') return node.text
      return inlineText(node.children)
    })
    .join('')
}

function blockHtml(node: LexicalNode): string {
  switch (node.type) {
    case 'heading': {
      const size = node.tag === 'h2' ? 20 : 17
      return `<p style="margin:22px 0 10px;font-size:${size}px;line-height:1.3;font-weight:bold;color:${INK}">${inlineHtml(node.children)}</p>`
    }
    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      const items = (node.children ?? [])
        .map((item) => `<li style="margin:0 0 6px">${listItemHtml(item)}</li>`)
        .join('')
      return `<${tag} style="margin:0 0 14px;padding-left:22px">${items}</${tag}>`
    }
    case 'paragraph': {
      const inner = inlineHtml(node.children)
      // An empty paragraph is how the editor shows a blank line; in email the
      // margins already separate paragraphs, so it adds nothing.
      return inner.trim() ? `<p style="margin:0 0 14px">${inner}</p>` : ''
    }
    default: {
      const inner = node.children?.length ? inlineHtml(node.children) : escapeHtml(node.text ?? '')
      return inner.trim() ? `<p style="margin:0 0 14px">${inner}</p>` : ''
    }
  }
}

/** A list item holds text, and may hold a nested list. */
function listItemHtml(item: LexicalNode): string {
  return (item.children ?? [])
    .map((child) => (child.type === 'list' ? blockHtml(child) : inlineHtml([child])))
    .join('')
}

function blockText(node: LexicalNode, depth = 0): string {
  if (node.type === 'list') {
    const indent = '  '.repeat(depth)
    return (node.children ?? [])
      .map((item, index) => {
        const marker = node.listType === 'number' ? `${index + 1}.` : '-'
        const own = (item.children ?? []).filter((c) => c.type !== 'list')
        const nested = (item.children ?? []).filter((c) => c.type === 'list')
        return [
          `${indent}${marker} ${inlineText(own)}`,
          ...nested.map((list) => blockText(list, depth + 1)),
        ].join('\n')
      })
      .join('\n')
  }
  const text = node.children?.length ? inlineText(node.children) : (node.text ?? '')
  return node.type === 'heading' ? text.toUpperCase() : text
}

export function renderRichText(value: RichTextValue | null | undefined): RenderedRichText {
  const blocks = value?.root?.children ?? []
  return {
    html: blocks.map(blockHtml).filter(Boolean).join('\n'),
    text: blocks
      .map((block) => blockText(block))
      .filter((text) => text.trim())
      .join('\n\n'),
  }
}

/** Whether the editor holds any words — an empty editor still has one empty paragraph. */
export function hasText(value: RichTextValue | null | undefined): boolean {
  return renderRichText(value).text.trim().length > 0
}
