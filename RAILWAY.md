# Railway deploy checklist

## Worker service (`@recipe-planner/worker`)

1. **Settings → Source**
   - Repo: `anushkamathur14-cloud/Recipe-Planner-`
   - Branch: `main`
   - Root Directory: *(leave empty — repo root)*

2. **Settings → Config-as-code** (if available)
   - Config file: `railway.worker.toml`

3. **Variables** (required for correct Docker build + runtime)
   - `DEPLOY_TARGET` = `worker`
   - `DATABASE_URL` = *(reference Postgres)*
   - `OPENAI_API_KEY` = *(your key)*

4. **Redeploy**
   - Open the service → **Deployments**
   - Click the **⋯** (three dots) on the latest deployment → **Redeploy**
   - Or: **Settings → Source →** disconnect and reconnect the repo branch

If you never see **Redeploy**, GitHub may not be connected: **Settings → Source → Connect GitHub**.

## Web service

- Config file: `railway.toml` (default)
- Do **not** set `DEPLOY_TARGET=worker` on the web service.

### Web variables (required)

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Reference from Postgres plugin |
| `NEXTAUTH_SECRET` | Long random string (e.g. `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `https://recipe-plannerweb-production.up.railway.app` |
| `AUTH_USERNAME` | `Admin-1` |
| `AUTH_PASSWORD` | `Pwd-11` |
| `OPENAI_API_KEY` | Your OpenAI key |

### Create database tables (once)

**Option A — automatic:** Redeploy the web service. On startup it runs `prisma db push` when `DATABASE_URL` is set.

**Option B — trigger now** (after deploy with `/api/setup/db-push`):

```bash
curl -X POST "https://YOUR-WEB-URL.up.railway.app/api/setup/db-push" \
  -H "x-setup-secret: Pwd-11"
```

Use your real `AUTH_PASSWORD` instead of `Pwd-11`.

**Option C — local:**

```bash
DATABASE_URL="postgresql://..." npm run db:push
```

## Verify the right commit built

In **Deployments**, the commit message should include *"Fix worker Railway build"* or newer.

Build logs for the worker must **not** show `next build`. You should see:

`==> Docker build: worker`
