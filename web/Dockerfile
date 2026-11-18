# THE NODE VERSION MUST MATCH `node-version:` in .github/workflows/ci.yml.
# Dependabot bumps it ONLY here (the `docker` ecosystem reads Dockerfiles
# alone), and nobody touches the number in the workflow. In anovastudio, after
# the 24 → 26 bump, CI stayed on 24 and for a while tested the code on a
# different engine than production ran. On the next major change ALL places at once.
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The base address for the sitemap, robots and canonical links — CI passes the
# real domain from the repository variable SITE_URL.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# The build has NO access to the database, and that is intended. `getCourses()`
# in src/lib/content.ts catches the connection error and renders empty — so the
# image can be built in CI without starting Postgres. Checked on every build.
ENV NODE_OPTIONS=--no-deprecation
# THIS IS NOT A SECRET. Payload refuses to start without PAYLOAD_SECRET, and
# `next build` loads its configuration. The build issues no session tokens, so
# the value does not matter.
#
# A variable of ONE COMMAND, not `ENV`. Two reasons: it does not stay in the
# layer's metadata, and `ENV PAYLOAD_SECRET=...` raises BuildKit's
# SecretsUsedInArgOrEnv warning — a false alarm here, but by the next warning
# nobody would look any more.
RUN PAYLOAD_SECRET=placeholder-tylko-do-budowania npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_OPTIONS=--no-deprecation
# The directory of files uploaded through the panel — the volume is mounted here.
ENV UPLOAD_DIR=/app/uploads

# Run as the unprivileged user 'node' (it is in the image). --chown gives it
# ownership of the files, including the right to write to the uploads
# directory and the image optimiser's cache. Limits the damage of a possible RCE.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Both directories MUST exist in the image and belong to node. Production
# mounts named volumes there, and Docker creates a missing mount point as ROOT —
# then the panel cannot save a photo, and the optimiser recomputes each one on
# every request. An existing directory makes the volume inherit its owner.
RUN mkdir -p /app/.next/cache /app/uploads && chown -R node:node /app/.next /app/uploads

USER node
EXPOSE 3000
# Health is measured on the home page — standalone has no separate endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
