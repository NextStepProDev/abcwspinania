import { ImageResponse } from 'next/og'

// Ikona karty przeglądarki generowana z kodu — nie trzymamy binarnego .ico,
// którego nie da się przejrzeć w diffie ani poprawić bez edytora graficznego.
//
// Rysunek jest ODRYSEM znaku ze starej strony (romb z sylwetką wspinacza) —
// ten sam kształt co w `components/Znak.tsx`. Powielenie ścieżki jest tutaj
// świadome: `ImageResponse` renderuje przez satori, w osobnym środowisku
// bez Reacta strony, więc import komponentu wciągnąłby tu jego zależności.
// Podmieniając znak, podmień OBA pliki.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#c8552b',
      }}
    >
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <g stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M24 19.5V28" />
          <path d="M24 21.5 17.5 14.5M24 21.5 30.5 14.5" />
          <path d="M24 28l-5.5 3.5 1 6.5M24 28l4.5 5 .5 7" />
        </g>
        <circle cx="24" cy="14.2" r="3.6" fill="#fff" />
      </svg>
    </div>,
    size,
  )
}
