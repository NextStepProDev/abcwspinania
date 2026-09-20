import { ImageResponse } from 'next/og'
import { BRAND } from '@/lib/site'
import { OG_IMAGE_SIZE } from '@/lib/seo'

// Obrazek karty pokazywany przy udostępnianiu linku (Facebook, Messenger,
// WhatsApp, X). Stary serwis nie miał ŻADNYCH znaczników Open Graph — link
// wrzucony na Facebooka pokazywał się bez obrazka i bez tytułu.
//
// Świadomie ZWYKŁA trasa `/og`, a nie konwencja pliku `opengraph-image.tsx`:
// przy tamtej, na podstronach z własnym blokiem `openGraph` (a takie mamy —
// każda ma swój tytuł i opis), Next gubił og:image w gotowym HTML-u części stron.
// Jawny URL z `ogImage()` jest przewidywalny.
//
// force-static = obrazek powstaje raz, przy buildzie, a nie przy każdym żądaniu
// od crawlera.
export const dynamic = 'force-static'

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: 80,
        backgroundColor: '#2a2620',
        backgroundImage:
          'radial-gradient(circle at 80% 15%, rgba(200,85,43,0.45), rgba(42,38,32,0) 60%)',
      }}
    >
      {/* Znak + nazwa. Ścieżka jest odrysem tego samego kształtu, co
          `components/Znak.tsx` — satori renderuje poza Reactem strony, więc
          import komponentu wciągnąłby tu jego zależności. Zmieniasz znak,
          zmieniasz oba pliki. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <svg width="72" height="72" viewBox="0 0 48 48" fill="none">
          <path d="M24 3 45 24 24 45 3 24Z" fill="#c8552b" />
          <g
            stroke="#fff"
            strokeWidth="3.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <path d="M24 19.5V28" />
            <path d="M24 21.5 17.5 14.5M24 21.5 30.5 14.5" />
            <path d="M24 28l-5.5 3.5 1 6.5M24 28l4.5 5 .5 7" />
          </g>
          <circle cx="24" cy="14.2" r="3.4" fill="#fff" />
        </svg>
        <div style={{ display: 'flex', fontSize: 76, color: '#f7f5f1', fontWeight: 600 }}>
          {BRAND}
        </div>
      </div>
      <div style={{ display: 'flex', marginTop: 16, fontSize: 34, color: '#c4b8a6' }}>
        Kursy wspinaczki skalnej z licencją PZA · Jura Krakowsko-Częstochowska
      </div>
    </div>,
    OG_IMAGE_SIZE,
  )
}
