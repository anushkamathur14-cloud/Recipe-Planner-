#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
npm install

echo "==> Generating Prisma client"
npm run db:generate

if command -v docker >/dev/null 2>&1; then
  echo "==> Starting Postgres (docker compose)"
  docker compose up -d
  sleep 2
else
  echo "WARN: Docker not found. Start Postgres yourself and set DATABASE_URL in .env"
fi

echo "==> Pushing database schema"
npm run db:push

if ! command -v yt-dlp >/dev/null 2>&1; then
  echo "WARN: yt-dlp not found. Install with: brew install yt-dlp ffmpeg"
fi

if grep -q '^OPENAI_API_KEY=$' .env 2>/dev/null || grep -q '^OPENAI_API_KEY=sk-\.\.\.' .env 2>/dev/null; then
  echo "WARN: Set OPENAI_API_KEY in .env before importing recipes"
fi

echo ""
echo "Done. Run in two terminals:"
echo "  npm run dev"
echo "  npm run dev:worker"
echo ""
echo "Open http://localhost:3000 — sign in with AUTH_EMAIL / AUTH_PASSWORD from .env"
