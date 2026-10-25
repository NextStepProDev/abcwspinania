import type { Where } from 'payload'

import type { LexicalNode, RichTextValue } from '@/lib/email/richText'

/**
 * The email to the parents before a camp (Krzysiek, 22.10.2026): it differs
 * per turnus — the meeting place, the date and the hours — so it is not sent
 * by itself. Instead the system REMINDS the school `PRE_CAMP_REMINDER_DAYS`
 * before the turnus and prepares a draft "Wysyłka" to its parents with the
 * standard part (what to pack, the card to bring); Krzysiek fills in the
 * place and the times, and sends. Pure, tested under `node --test`.
 */

/** Days before a turnus the school is reminded (Mateusz, 22.10.2026: "16 dni"). */
export const PRE_CAMP_REMINDER_DAYS = 16

/**
 * The standard part, from Krzysiek's own email before a camp (21.10.2026),
 * with what changes per turnus left in brackets. Editable in "Ustawienia
 * obozów"; a blank line starts a paragraph, a line starting with "- " is a
 * list item.
 */
export const DEFAULT_PRE_CAMP_TEMPLATE = `Dzień dobry,

już niedługo zaczyna się nasz obóz: [nazwa obozu]. Spotykamy się w [miejsce zbiórki] (lokalizacja: [link do mapy]).

Prosimy przywieźć wypełnione, kompletne karty kwalifikacyjne. Dzieci odbieramy i kwaterujemy [dzień i data] w godzinach [godziny]. Po zakwaterowaniu od razu idziemy w skały, żeby wykorzystać dzień — wracamy na kolację.

Pamiętajcie o spakowaniu:
- czapka na głowę albo kapelusz z szerszym rondem,
- plecak 30–40 litrów (trzeba gdzieś spakować sprzęt),
- bidon na wodę, minimum 0,75 l (albo dwa po 0,5 l),
- krem z filtrem UV i krem z witaminą A na skórę dłoni (skała jest ostra),
- kurtka przeciwdeszczowa (albo parasol),
- buty podejściowe,
- obuwie sportowe na zmianę i kapcie do chodzenia po domku,
- jeśli dziecko ma: uprząż, buty wspinaczkowe i kask — dajcie znać, kto ich nie ma, przygotujemy,
- osobiste środki higieny, ręcznik, szampon, mydło,
- [śpiwór — jeśli na tym obozie trzeba mieć własny]
- gry planszowe, jeśli dzieci je lubią.

Pakujemy dzieci jak na zwykłą dłuższą wycieczkę. Obóz jest sportowo-przygodowy, nie robimy tańców i karaoke :-).

Odbiór dzieci: [dzień i data] do godziny [godzina] — musimy wtedy opuścić obiekt.

Pytania? Napiszcie albo zadzwońcie: [telefon]. Będę pod tym numerem w trakcie całego obozu — choć nie obiecuję, że w każdej chwili :-).

Pozdrawiam i do zobaczenia
Krzysztof Wróbel`

/**
 * The template with what the system knows filled in: the camp's name, and
 * the sleeping-bag line kept (as a plain item) only where the camp asks for
 * its own sleeping bags. The place, the dates and the hours stay in brackets
 * for Krzysiek — the draft is not sent until he fills them in.
 */
export function fillPreCampTemplate(
  template: string,
  camp: { title: string; ownSleepingBags: boolean },
): string {
  return template
    .replace(/\[nazwa obozu\]/g, camp.title)
    .split('\n')
    .flatMap((line) => {
      if (!/\[śpiwór[^\]]*\]/.test(line)) return [line]
      return camp.ownSleepingBags ? [line.replace(/\[śpiwór[^\]]*\]/, 'śpiwór,')] : []
    })
    .join('\n')
}

/** The draft's subject — Krzysiek may change it before sending. */
export const preCampSubject = (campTitle: string) => `Przed obozem: ${campTitle}`

const text = (value: string): LexicalNode =>
  ({
    type: 'text',
    text: value,
    format: 0,
    version: 1,
    detail: 0,
    mode: 'normal',
    style: '',
  }) as LexicalNode

const block = (type: string, extra: Record<string, unknown>, children: LexicalNode[]) =>
  ({ type, version: 1, direction: 'ltr', format: '', indent: 0, ...extra, children }) as LexicalNode

/**
 * The template as the broadcast editor's content (Lexical JSON): a blank line
 * ends a paragraph, a line break inside one stays a line break, and lines
 * starting with "- " become a bulleted list.
 */
export function templateToRichText(template: string): RichTextValue {
  const children: LexicalNode[] = []
  for (const chunk of template.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const lines = chunk.split('\n').filter((l) => l.trim() !== '')
    let paragraph: string[] = []
    let items: string[] = []
    const flushParagraph = () => {
      if (!paragraph.length) return
      const inline = paragraph.flatMap((line, i) =>
        i === 0 ? [text(line)] : [{ type: 'linebreak', version: 1 } as LexicalNode, text(line)],
      )
      children.push(block('paragraph', { textFormat: 0 }, inline))
      paragraph = []
    }
    const flushList = () => {
      if (!items.length) return
      children.push(
        block(
          'list',
          { listType: 'bullet', start: 1, tag: 'ul' },
          items.map((item, i) => block('listitem', { value: i + 1 }, [text(item)])),
        ),
      )
      items = []
    }
    for (const line of lines) {
      if (/^\s*-\s+/.test(line)) {
        flushParagraph()
        items.push(line.replace(/^\s*-\s+/, ''))
      } else {
        flushList()
        paragraph.push(line.trim())
      }
    }
    flushParagraph()
    flushList()
  }
  return { root: block('root', {}, children) } as RichTextValue
}

/**
 * Camp turnusy whose reminder is due: starting within `days`, not started,
 * still taking or holding bookings, and not reminded yet.
 */
export function preCampDueWhere(now: Date, days: number): Where {
  return {
    and: [
      { camp: { exists: true } },
      { status: { in: ['open', 'waitlist'] } },
      { startDate: { greater_than: now.toISOString() } },
      { startDate: { less_than_equal: new Date(now.getTime() + days * 86_400_000).toISOString() } },
      { preCampDraftAt: { exists: false } },
    ],
  }
}
