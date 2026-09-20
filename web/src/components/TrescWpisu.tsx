import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { SerializedHeadingNode } from '@payloadcms/richtext-lexical'

import { kotwica, spisTresci, type PozycjaSpisu } from '@/lib/format'

/**
 * Treść wpisu z kotwicami na nagłówkach drugiego stopnia.
 *
 * Domyślny konwerter Payloada renderuje `<h2>` BEZ atrybutu `id`, więc linki
 * ze spisu treści nie miałyby do czego skoczyć. Podmieniamy więc konwerter
 * nagłówków, zamiast dokładać identyfikatory skryptem po stronie przeglądarki:
 * kotwice muszą być w HTML-u wychodzącym z serwera, żeby działał też link
 * przysłany komuś z `#fragmentem` i żeby wyszukiwarka widziała strukturę.
 *
 * Numerację powtórzonych nagłówków liczymy TĄ SAMĄ funkcją co spis treści
 * (`spisTresci`), a nie drugi raz na miejscu — inaczej przy dwóch sekcjach
 * o tej samej nazwie spis wskazywałby „sprzet-2", a dokument miałby dwa
 * razy „sprzet".
 */
/**
 * Płaski tekst nagłówka — do zapasowej kotwicy, gdy spis się rozjedzie.
 *
 * `SerializedLexicalNode` nie deklaruje pola `text` (mają je dopiero węzły
 * tekstowe), więc sięgamy po nie przez zawężenie, a nie rzutowanie na `any`.
 */
function tekstNaglowka(node: SerializedHeadingNode): string {
  return (node.children ?? [])
    .map((c) => {
      const { text } = c as unknown as { text?: unknown }
      return typeof text === 'string' ? text : ''
    })
    .join(' ')
}

export function TrescWpisu({ tresc }: { tresc: Parameters<typeof spisTresci>[0] }) {
  const spis: PozycjaSpisu[] = spisTresci(tresc)

  // Kolejność wystąpień h2 w dokumencie odpowiada kolejności w spisie, więc
  // wystarczy licznik — nie trzeba dopasowywać po tekście.
  let licznik = 0

  const konwertery: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const naglowek = node as SerializedHeadingNode
      const dzieci = nodesToJSX({ nodes: naglowek.children })
      const Tag = naglowek.tag

      if (Tag !== 'h2') return <Tag>{dzieci}</Tag>

      const pozycja = spis[licznik++]
      // Zapasowa kotwica liczona z WŁASNEGO tekstu nagłówka. Wcześniej stało
      // tu `kotwica(String(children.length))`, co przy rozjeździe dawało `id`
      // w rodzaju „2" albo pusty ciąg — identyfikator bez związku z treścią,
      // łatwy do powtórzenia i nieprawidłowy jako atrybut `id`.
      const id = pozycja?.id || kotwica(tekstNaglowka(naglowek)) || undefined
      return <h2 id={id}>{dzieci}</h2>
    },
  })

  return (
    <div className="tresc-bogata">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <RichText data={tresc as any} converters={konwertery} />
    </div>
  )
}
