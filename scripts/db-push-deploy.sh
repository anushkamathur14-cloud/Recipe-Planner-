#!/bin/sh
# Apply Prisma schema on deploy (Railway / production). Idempotent.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "db-push: skipped (DATABASE_URL not set)"
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f "packages/db/prisma/schema.prisma" ]; then
  echo "db-push: schema not found under $ROOT/packages/db/prisma"
  exit 1
fi

echo "db-push: syncing database schema from $ROOT..."
npm run push --workspace=@recipe-planner/db
