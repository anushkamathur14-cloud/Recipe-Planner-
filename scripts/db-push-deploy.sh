#!/bin/sh
# Apply Prisma schema on deploy (Railway / production). Idempotent.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "db-push: skipped (DATABASE_URL not set)"
  exit 0
fi

SCHEMA="packages/db/prisma/schema.prisma"
if [ ! -f "$SCHEMA" ]; then
  echo "db-push: schema not found at $SCHEMA"
  exit 1
fi

echo "db-push: syncing database schema..."
npx prisma db push --schema="$SCHEMA" --skip-generate
