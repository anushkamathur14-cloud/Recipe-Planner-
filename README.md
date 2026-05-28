# Recipe Planner

Transcribe recipes from **YouTube** and **Instagram** (via official chat exports or pasted URLs), plan weekly meals, aggregate ingredient quantities, and get LLM guidance per recipe.

## Stack

- **Web:** Next.js 15 + NextAuth
- **Worker:** Node.js job poller (`yt-dlp` + OpenAI Whisper + GPT-4o)
- **DB:** PostgreSQL + Prisma

## Local setup

1. **Start Postgres**

```bash
docker compose up -d
```

2. **Configure environment**

```bash
cp .env.example .env
# Edit DATABASE_URL, OPENAI_API_KEY, NEXTAUTH_*, AUTH_EMAIL, AUTH_PASSWORD
```

3. **Install and migrate**

```bash
npm install
npm run db:generate
npm run db:push
```

4. **Install yt-dlp** (required for the worker)

```bash
brew install yt-dlp ffmpeg   # macOS
# or: pip install yt-dlp && apt install ffmpeg
```

5. **Run web + worker** (two terminals)

```bash
npm run dev
npm run dev:worker
```

Open [http://localhost:3000](http://localhost:3000) and sign in with `AUTH_EMAIL` / `AUTH_PASSWORD`.

## Features

| Route | Description |
|-------|-------------|
| `/import/youtube` | Paste YouTube URLs → transcribe → structured recipe |
| `/import/instagram` | Paste IG URLs or upload Meta export ZIP |
| `/recipes` | Recipe library with editor |
| `/recipes/[id]` | View recipe, edit, LLM Q&A |
| `/plan` | Weekly meal planner + shopping list |
| `/settings` | IG thread filters for export imports |

## Instagram exports

1. Instagram → Accounts Center → Download your information
2. Select **Messages only**, format **JSON**
3. Upload the ZIP on `/import/instagram`
4. Optionally add thread folder filters in Settings

## Railway deployment

Create a Railway project with:

1. **PostgreSQL** plugin → copy `DATABASE_URL`
2. **Web service** — connect GitHub repo, set **Root Directory** to `/` (repo root, not `apps/web`)
   - **Settings → Build → Builder:** Dockerfile
   - **Dockerfile path:** `Dockerfile` (or Config file: `railway.toml` / `railway.json`)
3. **Worker service** — duplicate repo service, set **Dockerfile path:** `Dockerfile.worker` (Config: `railway.worker.toml`)

**Important:** If the service name shows `@recipe-planner/web`, Railway may use Nixpacks by default. Switch the builder to **Dockerfile** and redeploy — do not use `apps/web` as root directory.

Required variables on both services:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your public web URL)
- `AUTH_EMAIL` / `AUTH_PASSWORD`

Worker only needs DB + OpenAI keys (no NextAuth).

## Project structure

```
apps/web/          Next.js UI + API routes
apps/worker/       Background transcription jobs
packages/db/       Prisma schema
packages/shared/   Zod schemas, IG parser, shopping list
```
