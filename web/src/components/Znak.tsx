/**
 * Znak graficzny ABC Wspinania.
 *
 * ⚠️ TO JEST ODRYS, NIE ORYGINAŁ. Stara strona ma znak wyłącznie wtopiony
 * w baner `images/modules/ABC_logo.png`; sam romb z sylwetką zajmuje tam
 * ~90×84 px i jest zjedzony kompresją. Za mało na nagłówek w 2×, favicon
 * i kartę OG, więc kształt (romb + wspinacz z uniesionymi rękami) odrysowaliśmy
 * jako wektor — rozpoznawalność zostaje, ostrość jest w każdej skali.
 *
 * DO ZASTĄPIENIA, gdy Krzysiek dostarczy oryginał w wektorze (AI/EPS/SVG).
 * Wtedy podmienia się wyłącznie ten plik — nic więcej nie zna kształtu znaku.
 *
 * Kolor dziedziczy z `currentColor`, żeby ten sam komponent działał na jasnym
 * nagłówku i na ciemnej stopce bez drugiego wariantu.
 */
export function Znak({ className, rozmiar = 26 }: { className?: string; rozmiar?: number }) {
  return (
    <svg
      width={rozmiar}
      height={rozmiar}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Romb — obrócony kwadrat, jak w oryginale. */}
      <path d="M24 3 45 24 24 45 3 24Z" fill="currentColor" />
      {/* Sylwetka: głowa, ręce uniesione w „V", jedna noga ugięta, druga
          wyprostowana i wychodząca poza romb — jak w oryginale. Rysowana
          kreską, nie obrysem wypełnionym: łatwiej ją poprawić, gdy przyjdzie
          oryginał, i lepiej trzyma się w małych rozmiarach. */}
      <g stroke="#fff" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M24 19.5V28" />
        <path d="M24 21.5 17.5 14.5M24 21.5 30.5 14.5" />
        <path d="M24 28l-5.5 3.5 1 6.5M24 28l4.5 5 .5 7" />
      </g>
      <circle cx="24" cy="14.2" r="3.4" fill="#fff" />
    </svg>
  )
}

/** Znak razem z nazwą — to, co stoi w nagłówku i w stopce. */
export function Logotyp({
  rozmiarZnaku = 26,
  rozmiarTekstu = 'text-[19px]',
  kolorZnaku = 'text-rope',
}: {
  rozmiarZnaku?: number
  rozmiarTekstu?: string
  kolorZnaku?: string
}) {
  return (
    <>
      <Znak rozmiar={rozmiarZnaku} className={kolorZnaku} />
      <span className={`font-display font-extrabold tracking-[-0.025em] ${rozmiarTekstu}`}>
        ABC Wspinania
      </span>
    </>
  )
}
