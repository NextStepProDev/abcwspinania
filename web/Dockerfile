# WERSJA NODE MUSI SIĘ ZGADZAĆ z `node-version:` w .github/workflows/ci.yml.
# Dependabot podbija ją TYLKO tutaj (ekosystem `docker` czyta wyłącznie
# Dockerfile'e), liczby w workflow nie rusza nikt. W anovastudio po bumpie
# 24 → 26 CI został na 24 i przez jakiś czas testował kod na innym silniku,
# niż obsługiwał produkcję. Przy następnym majorze zmienić OBA miejsca naraz.
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Adres bazowy dla sitemap, robots i canonicali — CI podaje prawdziwą domenę
# ze zmiennej repozytorium SITE_URL.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# Build NIE MA dostępu do bazy i tak ma być. `getCourses()` w src/lib/content.ts
# łapie błąd połączenia i renderuje pusto — dzięki temu obraz da się zbudować
# w CI bez stawiania Postgresa. Zachowanie sprawdzane przy każdym buildzie.
ENV NODE_OPTIONS=--no-deprecation
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_OPTIONS=--no-deprecation
# Katalog plików wgranych przez panel — pod ten punkt montujemy wolumen.
ENV UPLOAD_DIR=/app/uploads

# Uruchamiaj jako nieuprzywilejowany użytkownik 'node' (jest w obrazie).
# --chown daje mu własność plików, w tym prawo zapisu do katalogu uploadów
# i cache optymalizatora obrazów. Ogranicza skutki ewentualnego RCE.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Oba katalogi MUSZĄ istnieć w obrazie i należeć do node. Produkcja montuje pod
# nie nazwane wolumeny, a Docker tworzy brakujący punkt montowania jako ROOT —
# wtedy panel nie zapisze zdjęcia, a optymalizator przeliczy każde od nowa przy
# każdym żądaniu. Istniejący katalog sprawia, że wolumen dziedziczy właściciela.
RUN mkdir -p /app/.next/cache /app/uploads && chown -R node:node /app/.next /app/uploads

USER node
EXPOSE 3000
# Zdrowie mierzymy stroną główną — standalone nie ma osobnego endpointu.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
