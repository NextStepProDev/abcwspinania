import { PRIVACY_POLICY_PATH } from '@/lib/legal'

const PHRASE = 'polityce prywatności'

/**
 * A consent clause with "polityce prywatności" as a link to the policy.
 *
 * The clause itself stays one plain string (`lib/consent.ts`) — that exact
 * string is what goes into the database as proof of consent. Only the view
 * turns the phrase into a link.
 *
 * A new tab: the link sits inside a form, and leaving the page would lose
 * everything typed so far. Inside a `<label>` a click on the link follows
 * the link and does not tick the box.
 */
export function ConsentText({ text }: { text: string }) {
  const at = text.indexOf(PHRASE)
  if (at === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <a
        href={PRIVACY_POLICY_PATH}
        target="_blank"
        rel="noopener"
        className="underline underline-offset-2 hover:opacity-80"
      >
        {PHRASE}
      </a>
      {text.slice(at + PHRASE.length)}
    </>
  )
}
