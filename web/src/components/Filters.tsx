import Link from 'next/link'

/**
 * List filters — PLAIN LINKS carrying a query parameter, not component state.
 *
 * Reasons, in order of weight:
 *  1. It works without JavaScript and is in the HTML immediately, so a search
 *     engine sees the filtered lists exactly as a human does (the spirit of
 *     rule 9).
 *  2. A filtered view has an address of its own — it can be sent and
 *     bookmarked.
 *  3. There is no state here to lose when navigating back.
 *
 * Pages using filters must point `canonical` at the variant WITHOUT the
 * parameter, so the index does not fill up with addresses carrying the same
 * content.
 */
export interface FilterOption {
  value: string
  label: string
}

export function Filters({
  label,
  options,
  active,
  baseHref,
  param = 'filter',
  summary,
}: {
  label: string
  options: FilterOption[]
  active: string
  baseHref: string
  param?: string
  summary?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-y border-rock-100 py-4">
      <span className="mr-1 text-sm font-medium text-rock-600">{label}</span>
      {options.map((option) => {
        const selected = option.value === active
        // The default value appends no parameter — the address without a filter
        // is the canonical one and should be the shortest.
        const href = option.value === 'all' ? baseHref : `${baseHref}?${param}=${option.value}`
        return (
          <Link
            key={option.value}
            href={href}
            scroll={false}
            aria-current={selected ? 'true' : undefined}
            className={
              selected
                ? 'rounded-lg bg-rock-900 px-3.5 py-2 text-sm font-semibold text-rock-50'
                : 'rounded-lg border border-rock-200 bg-white px-3.5 py-2 text-sm font-medium text-rock-600 hover:border-rock-400 hover:text-rock-900'
            }
          >
            {option.label}
          </Link>
        )
      })}
      {summary && (
        <span className="ml-auto text-sm text-rock-600" aria-live="polite">
          {summary}
        </span>
      )}
    </div>
  )
}
