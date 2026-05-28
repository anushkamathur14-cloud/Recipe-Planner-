# Web + worker (Railway sets RAILWAY_SERVICE_NAME per service; name containing "worker" → worker build)
FROM node:22-bookworm-slim
WORKDIR /app

ARG RAILWAY_SERVICE_NAME
ARG DEPLOY_TARGET
ENV RAILWAY_SERVICE_NAME=${RAILWAY_SERVICE_NAME}
ENV DEPLOY_TARGET=${DEPLOY_TARGET}

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    ffmpeg \
    python3 \
    python3-pip \
  && pip3 install --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/db/prisma ./packages/db/prisma
COPY packages/shared/package.json ./packages/shared/

COPY packages/db/tsconfig.json ./packages/db/
COPY packages/db/src ./packages/db/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY apps/worker/tsconfig.json ./apps/worker/
COPY apps/worker/src ./apps/worker/src
COPY apps/web ./apps/web
COPY seeds ./seeds
COPY scripts/prisma-generate.cjs scripts/docker-build.sh scripts/docker-start.sh ./scripts/

RUN chmod +x scripts/docker-build.sh scripts/docker-start.sh \
  && NEXT_TELEMETRY_DISABLED=1 scripts/docker-build.sh

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 3000 8080

CMD ["scripts/docker-start.sh"]
