#!/bin/sh
set -eu

is_worker() {
  [ "${DEPLOY_TARGET:-}" = "worker" ] && return 0
  echo "${RAILWAY_SERVICE_NAME:-}" | grep -qi 'worker'
}

if is_worker; then
  echo "==> Docker build: worker (${RAILWAY_SERVICE_NAME:-unknown service})"
  npm ci --ignore-scripts \
    --workspace=@recipe-planner/worker \
    --workspace=@recipe-planner/db \
    --workspace=@recipe-planner/shared
  node scripts/prisma-generate.cjs
  npm run build --workspace=@recipe-planner/shared
  npm run build --workspace=@recipe-planner/db
  npm run build --workspace=@recipe-planner/worker
else
  echo "==> Docker build: web (${RAILWAY_SERVICE_NAME:-unknown service})"
  npm ci --ignore-scripts
  node scripts/prisma-generate.cjs
  npm run build --workspace=@recipe-planner/shared
  npm run build --workspace=@recipe-planner/db
  npm run build --workspace=@recipe-planner/web
fi
