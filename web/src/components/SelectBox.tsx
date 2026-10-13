import { ChevronDown } from '@/components/Icons'

/**
 * A `<select>` with our own arrow, set in from the edge.
 *
 * The browser's native arrow sits flush against the right border whatever the
 * padding — on the account page it looked stuck to the edge (reported
 * 10.10.2026). `appearance-none` drops it; the icon is drawn over the field
 * and lets clicks through to the select underneath.
 */
export function SelectBox({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${className ?? ''} appearance-none pr-10`}>
        {children}
      </select>
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-rock-600"
      />
    </div>
  )
}
