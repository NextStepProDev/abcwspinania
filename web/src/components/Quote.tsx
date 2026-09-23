import type { Testimonial } from '@/lib/content'
import { formatSubject } from '@/lib/format'

/**
 * A participant's testimonial.
 *
 * A `<blockquote>` with a `<footer>` inside — that is what correct markup for a
 * quote with attribution looks like. The meaning is carried by the element, not
 * by italics.
 */
export function Quote({ testimonial, large }: { testimonial: Testimonial; large?: boolean }) {
  const subject = formatSubject(testimonial.subject)
  const attribution = [testimonial.author, subject, testimonial.period].filter(Boolean).join(' · ')

  return (
    <blockquote className="flex h-full flex-col gap-4 rounded-2xl bg-white p-7 shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)] lg:p-8">
      <p className={large ? 'text-[18px] leading-[29px]' : 'text-[16px] leading-7'}>
        {testimonial.quote}
      </p>
      <footer className="mt-auto text-sm text-rock-600">{attribution}</footer>
    </blockquote>
  )
}
