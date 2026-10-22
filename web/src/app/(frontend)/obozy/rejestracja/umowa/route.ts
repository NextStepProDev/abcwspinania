import { getPayload } from 'payload'
import config from '@payload-config'

import { contractOf, findByToken, openChildren, pdfResponse } from '@/lib/campRegistration'

/**
 * GET /obozy/rejestracja/umowa?token=… — the parent's contract, from the
 * registration link (the same key as the form) or from "Moje konto". Only
 * once it was sent: before that the price and the day are not settled.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const payload = await getPayload({ config })
  const ctx = await findByToken(payload, token).catch(() => null)
  const sent = ctx ? openChildren(ctx).find((c) => c.booking.contractSentAt)?.booking : null
  if (!sent) return new Response('Umowy jeszcze nie ma albo link nie działa.', { status: 404 })
  const contract = await contractOf(payload, sent)
  if (!contract) return new Response('Umowy nie udało się utworzyć.', { status: 500 })
  return pdfResponse(contract)
}
