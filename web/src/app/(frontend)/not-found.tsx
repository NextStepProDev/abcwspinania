import { NotFoundContent } from '@/components/NotFoundContent'

// A page inside the site called `notFound()` — e.g. a course or a post that
// does not exist. Addresses no route matches at all are handled by
// `app/global-not-found.tsx`; both show the same `NotFoundContent`.
export default function NotFound() {
  return <NotFoundContent />
}
