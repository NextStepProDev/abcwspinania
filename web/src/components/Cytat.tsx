import type { Opinia } from '@/lib/content'
import { formatCzego } from '@/lib/format'

/**
 * Opinia kursanta.
 *
 * `<blockquote>` z `<footer>` w środku — tak wygląda poprawne oznaczenie
 * cytatu z przypisaniem autorstwa. Znaczenie niesie znacznik, nie kursywa.
 */
export function Cytat({ opinia, duzy }: { opinia: Opinia; duzy?: boolean }) {
  const czego = formatCzego(opinia.czego)
  const podpis = [opinia.autor, czego, opinia.termin].filter(Boolean).join(' · ')

  return (
    <blockquote className="flex h-full flex-col gap-4 rounded-2xl bg-white p-7 shadow-[0_0_0_1px_rgba(42,38,32,0.06),0_4px_12px_rgba(42,38,32,0.08)] lg:p-8">
      <p className={duzy ? 'text-[18px] leading-[29px]' : 'text-[16px] leading-7'}>
        {opinia.tresc}
      </p>
      <footer className="mt-auto text-sm text-rock-600">{podpis}</footer>
    </blockquote>
  )
}
