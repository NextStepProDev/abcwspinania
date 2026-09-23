import Link from 'next/link'

import { SITE_URL } from '@/lib/site'
import { jsonLd } from '@/lib/schema'

export interface Crumb {
  label: string
  href?: string
}

/**
 * The navigation trail together with its matching structured data.
 *
 * One call yields both, because kept apart they drift at the first change to the
 * hierarchy — and a divergence between what a human sees and what a search
 * engine reads is precisely what is being avoided here.
 *
 * ⚠️ The colour variant is a PROP, not a separate component. There used to be
 * `Okruszki` and `OkruszkiJasne` side by side, and it ended exactly the way such
 * pairs end: the light variant emitted no `BreadcrumbList` (so course, camp and
 * article pages — the deepest ones, where the trail matters most — had no
 * structured data), and on the course page the dark variant was used by mistake
 * on a dark background, leaving the current page name unreadable. A single
 * component makes neither mistake possible.
 *
 * The last item is not a link: it would lead to the page we are already on.
 */
export function Breadcrumbs({
  trail,
  variant = 'onLight',
}: {
  trail: Crumb[]
  /** `onDark` — for hero headers over a `rock-950` background. */
  variant?: 'onLight' | 'onDark'
}) {
  const dark = variant === 'onDark'
  const linkClass = dark ? 'text-rock-fg hover:text-white' : 'text-rock-600 hover:text-rope'
  const currentClass = dark ? 'text-white' : 'text-rock-900'
  const separatorClass = dark ? 'text-rock-500' : 'text-rock-300'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
    })),
  }

  return (
    <>
      <nav aria-label="Ścieżka nawigacji">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {trail.map((crumb, i) => (
            <li key={crumb.label} className="flex items-center gap-2">
              {crumb.href ? (
                <Link href={crumb.href} className={linkClass}>
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className={currentClass}>
                  {crumb.label}
                </span>
              )}
              {i < trail.length - 1 && (
                <span aria-hidden="true" className={separatorClass}>
                  /
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </>
  )
}
