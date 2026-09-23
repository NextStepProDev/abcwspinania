# abcwspinania — aplikacja

Next.js 16 (App Router, TypeScript, Tailwind 4, Turbopack) z **Payload 3**
działającym wewnątrz. Strona, panel i API to jeden proces.

## Uruchomienie

```bash
npm ci
npm run migrate    # wymaga bazy: docker compose up -d w katalogu wyżej
npm run dev
```

- strona — <http://localhost:3000>
- panel — <http://localhost:3000/admin>

Strona renderuje się również **przy wyłączonej bazie** — sekcje pokazują stan
pusty. Zachowanie celowe, patrz `src/lib/content.ts`.

## Struktura

```
src/
├── app/
│   ├── robots.ts        ← MUSI być tutaj, nie w grupie tras (patrz CLAUDE.md)
│   ├── manifest.ts      ← tak samo
│   ├── (frontend)/      ← strona: /, /kontakt, /kursy/[slug], og, sitemap, icon
│   └── (payload)/       ← panel i API (boilerplate Payloada)
├── collections/         ← Courses, Camps, Sessions, Posts, Testimonials,
│                        Instructors, Media, Messages, Newsletter, Users
├── globals/             ← SiteConfig, HomePage, AboutPage, EnglishPage
├── lib/                 ← content (dane), format, validation, consent, seo, schema, site
├── migrations/          ← commitowane, stosowane workflowem Migrate
└── payload-types.ts     ← GENEROWANE, commitowane, pilnowane w CI
```

## Kontrole przed wypchnięciem

```bash
npm run lint
npm run format:check
npx tsc --noEmit
npm test
npm run build
npm audit --omit=dev --audit-level=high        # bramka BLOKUJĄCA w CI
npm run generate:types && git diff --exit-code src/payload-types.ts
```

Zasady projektu i wnioski z poprzednich wdrożeń: [`../CLAUDE.md`](../CLAUDE.md).
