# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder

ARG SOURCE_REVISION=unknown
ENV DATABASE_URL=postgresql://ci:ci@127.0.0.1:5432/ci_dummy \
    DATABASE_URL_ADMIN=postgresql://ci:ci@127.0.0.1:5432/ci_dummy \
    NEXT_TELEMETRY_DISABLED=1 \
    SOURCE_REVISION=${SOURCE_REVISION}

COPY . .
RUN node scripts/copy-static.mjs \
  && npm run prisma:generate \
  && npm run build

FROM node:22-bookworm-slim AS runner

ARG SOURCE_REVISION=unknown

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 10001 hrp \
  && useradd --system --uid 10001 --gid hrp --home-dir /app --shell /usr/sbin/nologin hrp

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

LABEL org.opencontainers.image.source="https://github.com/nobita6986/HRpartner" \
      org.opencontainers.image.title="HRpartner" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"

COPY --from=builder --chown=hrp:hrp /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=hrp:hrp /app/node_modules ./node_modules
COPY --from=builder --chown=hrp:hrp /app/.next ./.next
COPY --from=builder --chown=hrp:hrp /app/public ./public
COPY --from=builder --chown=hrp:hrp /app/prisma ./prisma

USER hrp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
