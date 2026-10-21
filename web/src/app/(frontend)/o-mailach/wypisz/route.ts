/**
 * The unsubscribe header of every non-newsletter email points here
 * (`SERVICE_EMAILS_UNSUBSCRIBE_PATH`). A person opening it lands on the page
 * that explains these emails; Gmail's one-click POST (RFC 8058 — Brevo adds
 * `List-Unsubscribe-Post`) gets a plain 200 and changes nothing: there is
 * no list to leave, and refusing would only make Gmail retry or warn.
 */
export function GET() {
  // A relative Location: the request's own host is whatever nginx passed on.
  return new Response(null, { status: 303, headers: { Location: '/o-mailach' } })
}

export function POST() {
  return new Response(null, { status: 200 })
}
