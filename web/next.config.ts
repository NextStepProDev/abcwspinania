import path from 'path'
import { fileURLToPath } from 'url'

import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

// ESM: `__dirname` nie istnieje, bo package.json ma "type": "module"
// (wymagane przez Payload).
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Pliki z public/ (zdjęcia hero, logo) Next oddaje domyślnie z `Cache-Control:
// max-age=0`. Tydzień cache + doba serwowania starej wersji w tle. ŚWIADOMIE bez
// `immutable`: te nazwy nie mają w sobie hasha, więc podmiana zdjęcia pod tą samą
// nazwą byłaby niewidoczna nawet przez tydzień. Zmieniasz zdjęcie — zmień nazwę.
const STATIC_MEDIA_CACHE = 'public, max-age=604800, stale-while-revalidate=86400'

/**
 * Polityka bezpieczeństwa treści dla STRONY PUBLICZNEJ.
 *
 * Siedzi tutaj, a nie w nginx, z dwóch powodów:
 *  1. Panel Payloada potrzebuje luźniejszej polityki niż strona, a rozdzielenie
 *     tego w nginx wymagałoby osobnego bloku `location /admin` — w którym własny
 *     `add_header` KASUJE dziedziczenie z bloku `server`, więc trzeba by tam
 *     powtórzyć komplet nagłówków bezpieczeństwa i pilnować, żeby nie rozjechały
 *     się z resztą.
 *  2. Next zna własne trasy, więc wykluczenie /admin i /api jest tu dokładne.
 *
 * ⚠️ nginx świadomie NIE ustawia CSP. Gdyby ustawiał, przeglądarka dostałaby ten
 * nagłówek DWA razy i zastosowała ten bardziej restrykcyjny — czyli w praktyce
 * losowo, zależnie od tego, który blok zadziałał. Jedno źródło, tutaj.
 *
 * Zakres podyktowany tym, czego strona faktycznie używa:
 *  • 'unsafe-inline' w script-src — Next wstrzykuje dane hydracji i JSON-LD
 *    w znacznikach <script> bez nonce'a,
 *  • 'unsafe-inline' w style-src — Tailwind i next/font ustawiają style inline,
 *  • img-src z data: i blob: — podglądy next/image oraz generowana ikona,
 *  • BEZ font-src do zewnętrznych hostów: next/font serwuje kroje z naszej
 *    domeny, więc nic nie wychodzi na zewnątrz.
 * Świadomie BEZ upgrade-insecure-requests: całość i tak idzie po HTTPS.
 */
// JEDYNE odstępstwo między dev a produkcją: 'unsafe-eval' w script-src.
//
// Deweloperski build Reacta woła eval() do odtwarzania stosów wywołań
// i pozostałej diagnostyki. Bez tego na każdym wczytaniu strony w dev leci
// do konsoli błąd „eval() is not supported in this environment", a komunikaty
// o błędach tracą czytelne stosy. Zmierzone 20.09.2026: aplikacja działa
// poprawnie także BEZ tego rozluźnienia — hydracja przechodzi, komponenty
// kliknięte reagują — więc to wyłącznie wygoda w diagnozowaniu, nie warunek
// działania.
//
// Produkcyjny build Reacta nie woła eval(), więc na produkcji polityka
// zostaje wąska. Rozróżnienie po NODE_ENV: `next dev` ustawia 'development',
// budowanie obrazu — 'production'.
//
// Świadomie NIE rozluźniamy tu connect-src: 'self' obejmuje już WebSocket do
// tego samego źródła, więc HMR działa bez dopisywania ws:. (Gdy HMR nie
// wstaje, przyczyną jest zwykle `allowedDevOrigins` niżej, a nie CSP.)
const DEV = process.env.NODE_ENV !== 'production'

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // The contact page map: the two Google Maps embed paths (`/maps?…&output=embed`
  // built from the address, `/maps/embed?pb=…` pasted in the panel), not all of google.com.
  'frame-src https://www.google.com/maps/embed https://www.google.com/maps',
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  // Nie ogłaszaj, na czym stoi serwis.
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: STATIC_MEDIA_CACHE }] },
      { source: '/logo/:path*', headers: [{ key: 'Cache-Control', value: STATIC_MEDIA_CACHE }] },
      {
        // Wszystko OPRÓCZ panelu i API. Panel Payloada ładuje własne zasoby
        // w sposób, którego ta polityka nie przepuszcza, a zaostrzanie jej
        // pod cudzy panel kończy się białym ekranem po każdej aktualizacji CMS-a.
        source: '/((?!admin|api/).*)',
        headers: [{ key: 'Content-Security-Policy', value: CSP }],
      },
    ]
  },
  // `127.0.0.1` obok tuneli: wejście pod adresem IP zamiast `localhost` jest
  // dla Next-a innym źródłem i blokuje kanał HMR („Blocked cross-origin request
  // to Next.js dev resource"). Objaw jest mylący — strona renderuje się dobrze,
  // ale komponenty klienckie nie ożywają, bo bootstrap dev nie dochodzi do końca.
  allowedDevOrigins: ['127.0.0.1', '*.ngrok-free.app', '*.ngrok.app', '*.ngrok.dev'],
  turbopack: {
    root: path.resolve(dirname),
  },
  images: {
    // Zdjęcia z biblioteki mediów serwuje teraz TA SAMA aplikacja, pod
    // /api/media/file/**. Nie ma już zdalnego hosta, więc znika cała sekcja
    // remotePatterns i flaga dangerouslyAllowLocalIP, które istniały wyłącznie
    // po to, żeby optymalizator mógł sięgnąć do osobnego kontenera Strapi.
    //
    // ⚠️ KAŻDA kolekcja z uploadem potrzebuje TU własnego wpisu. Payload serwuje
    // pliki pod /api/<slug>/file/**, a `next/image` z adresem spoza tej listy
    // nie renderuje pustego miejsca, tylko RZUCA WYJĄTKIEM — cała podstrona
    // zwraca 500. Zmierzone 23.09.2026 przy dodawaniu kolekcji `gallery-photos`:
    // lint, typy, testy i `build` przeszły komplet, bo strona jest dynamiczna
    // i przy budowaniu nie było w bazie ani jednego zdjęcia. Wyszło dopiero po
    // wejściu na /galeria z prawdziwym plikiem.
    localPatterns: [
      { pathname: '/api/media/file/**' },
      { pathname: '/api/gallery-photos/file/**' },
      // Zdjęcia z repozytorium (public/images) — archiwum rodzinne na /o-nas.
      // Te nie przechodzą przez Payloada, ale przez optymalizator Next-a już
      // tak, więc i one potrzebują wpisu.
      { pathname: '/images/**' },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
