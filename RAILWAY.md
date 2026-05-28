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

## Verify the right commit built

In **Deployments**, the commit message should include *"Fix worker Railway build"* or newer.

Build logs for the worker must **not** show `next build`. You should see:

`==> Docker build: worker`
