import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { SerializedHeadingNode } from '@payloadcms/richtext-lexical'

import { anchorId, tableOfContents, type TocEntry } from '@/lib/format'

/**
 * Post body with anchors on level-two headings.
 *
 * Payload's default converter renders `<h2>` WITHOUT an `id` attribute, so the
 * links in the table of contents would have nothing to jump to. We therefore
 * replace the heading converter rather than adding ids with a browser-side
 * script: the anchors have to be in the HTML leaving the server, so that a link
 * sent to someone with a `#fragment` works too and so the search engine sees the
 * structure.
 *
 * Numbering of repeated headings is computed by the SAME function as the table
 * of contents (`tableOfContents`), not a second time on the spot — otherwise,
 * with two sections of the same name, the contents would point at "sprzet-2"
 * while the document held "sprzet" twice.
 */

/**
 * The flat text of a heading — for the fallback anchor, should the contents
 * drift out of step.
 *
 * `SerializedLexicalNode` does not declare a `text` field (only text nodes have
 * one), so we reach for it by narrowing rather than casting to `any`.
 */
function headingText(node: SerializedHeadingNode): string {
  return (node.children ?? [])
    .map((child) => {
      const { text } = child as unknown as { text?: unknown }
      return typeof text === 'string' ? text : ''
    })
    .join(' ')
}

export function PostContent({ content }: { content: Parameters<typeof tableOfContents>[0] }) {
  const toc: TocEntry[] = tableOfContents(content)

  // The order of h2 occurrences in the document matches the order in the
  // contents, so a counter is enough — no need to match on text.
  let index = 0

  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const heading = node as SerializedHeadingNode
      const children = nodesToJSX({ nodes: heading.children })
      const Tag = heading.tag

      if (Tag !== 'h2') return <Tag>{children}</Tag>

      const entry = toc[index++]
      // The fallback anchor is derived from the heading's OWN text. This used to
      // read `anchorId(String(children.length))`, which on any drift produced an
      // `id` like "2" or an empty string — an identifier unrelated to the
      // content, easy to repeat and invalid as an `id` attribute.
      const id = entry?.id || anchorId(headingText(heading)) || undefined
      return <h2 id={id}>{children}</h2>
    },
  })

  return (
    <div className="rich-text">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <RichText data={content as any} converters={converters} />
    </div>
  )
}
