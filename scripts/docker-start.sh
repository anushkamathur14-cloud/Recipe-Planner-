#!/bin/sh
set -eu

if echo "${RAILWAY_SERVICE_NAME:-}" | grep -qi 'worker'; then
  exec node apps/worker/dist/index.js
fi

exec npm run start --workspace=@recipe-planner/web
