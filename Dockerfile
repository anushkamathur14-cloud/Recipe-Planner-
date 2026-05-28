# Web service — Railway auto-detects this at repo root
FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/prisma ./packages/db/prisma

RUN npm ci --ignore-scripts

COPY packages/db/src ./packages/db/src
COPY packages/shared/src ./packages/shared/src
COPY apps/web ./apps/web

COPY scripts/prisma-generate.cjs ./scripts/prisma-generate.cjs
RUN node scripts/prisma-generate.cjs

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@recipe-planner/web

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@recipe-planner/web"]
