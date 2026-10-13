import { CONTROLLER } from '@/lib/legal'

/**
 * The building blocks of the privacy policy, shared by the Polish page
 * (`/polityka-prywatnosci`) and its English translation (`/en/privacy-policy`)
 * so the two cannot drift apart in looks.
 */

export function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[22px] leading-tight lg:text-[26px]">{title}</h2>
      <div className="mt-4 flex flex-col gap-3 text-[17px] leading-7 text-rock-700">{children}</div>
    </section>
  )
}

export function PolicyList({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-6">{children}</ul>
}

export const policyLinkClass = 'font-medium text-rope underline-offset-4 hover:underline'

export function PolicyMail() {
  return (
    <a href={`mailto:${CONTROLLER.email}`} className={policyLinkClass}>
      {CONTROLLER.email}
    </a>
  )
}

/** "2026-10-10" → "10.10.2026". */
export const policyDate = (version: string) => version.split('-').reverse().join('.')
