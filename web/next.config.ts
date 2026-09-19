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
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
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
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.app', '*.ngrok.dev'],
  turbopack: {
    root: path.resolve(dirname),
  },
  images: {
    // Zdjęcia z biblioteki mediów serwuje teraz TA SAMA aplikacja, pod
    // /api/media/file/**. Nie ma już zdalnego hosta, więc znika cała sekcja
    // remotePatterns i flaga dangerouslyAllowLocalIP, które istniały wyłącznie
    // po to, żeby optymalizator mógł sięgnąć do osobnego kontenera Strapi.
    localPatterns: [{ pathname: '/api/media/file/**' }],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
