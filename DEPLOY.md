# 🚀 Deploying to Render (live public URL)

This deploys the app as **two free web services** on [Render](https://render.com):

- **asma-api** — the Express backend (API + AI agents)
- **asma-web** — the Next.js dashboard

The repo includes a [`render.yaml`](render.yaml) blueprint that defines both. You sign in with GitHub, point Render at this repo, and it provisions everything.

> ⏱️ Takes ~10 minutes. You'll do one small manual step: tell the dashboard where the API lives.

---

## Before you start
- The code must be pushed to GitHub (it is: `aashishbharti04/autonomous-social-media-agent`).
- You'll need a free Render account — sign up at https://render.com using **"Sign in with GitHub"**.
- For persistent data (user accounts + saved posts), a free **Neon** Postgres database (next section).

---

## Set up the database (Neon — free, persistent)

The app needs a Postgres database so user accounts and posts survive restarts. Neon's free tier is perfect and the backend **creates its own tables automatically** on first boot — no migrations to run.

1. Go to https://neon.tech and **sign up** (GitHub login works).
2. Create a project (any name, e.g. `asma`). Pick the region closest to your Render region.
3. On the project dashboard, find **Connection string** and copy the **`postgresql://...`** URI (it includes the password and `?sslmode=require`). Keep it handy — you'll paste it into Render's `DATABASE_URL` below.

> Supabase works too: New project → Settings → Database → Connection string (URI), and use the connection-pooler URI.

If you skip this, the app still runs — just set `DB_PROVIDER=memory` on asma-api (data resets when the service sleeps/redeploys).

---

## Option A — Blueprint (recommended, deploys both at once)

1. Go to the Render Dashboard → **New +** → **Blueprint**.
2. Connect your GitHub and select the **`autonomous-social-media-agent`** repo.
3. Render reads `render.yaml` and shows two services: **asma-api** and **asma-web**.
4. Render will prompt for two values it can't generate:
   - **`DATABASE_URL`** (asma-api) → paste your **Neon** connection string from the previous section.
   - **`NEXT_PUBLIC_API_BASE_URL`** (asma-web) → you don't know the API URL yet, so enter `https://asma-api.onrender.com` for now (Render names services predictably, so this is usually correct).
   `JWT_SECRET` is generated automatically. Click **Apply** / **Create**.
5. Wait for **asma-api** to finish deploying. Open it and copy its URL from the top of the page — e.g. `https://asma-api.onrender.com`. Verify it works: visit `‹that URL›/api/health` → you should see `{"ok":true,...}`.
6. Open **asma-web** → **Environment** → confirm **`NEXT_PUBLIC_API_BASE_URL`** exactly equals the asma-api URL from step 5 (no trailing slash). Fix it if the placeholder was wrong.
7. If you changed it, click **Manual Deploy → Deploy latest commit** on asma-web (the API URL is baked in at build time, so it must rebuild).
8. Open the **asma-web** URL → your live dashboard. 🎉

---

## Option B — Create the two services manually

Use this if you prefer not to use the blueprint.

**1. Backend (asma-api)**
- **New +** → **Web Service** → pick the repo.
- Runtime: **Node**, Plan: **Free**, Root Directory: *(leave blank — repo root)*
- **Build Command:** `npm install --include=dev && npm --workspace backend run build`
- **Start Command:** `node backend/dist/index.js`
- **Health Check Path:** `/api/health`
- **Environment variables:** `DB_PROVIDER=postgres`, `DATABASE_URL=<your Neon string>`, `JWT_SECRET=<a long random string>`, `NODE_ENV=production`.
- Create it. Copy its URL when live and check `/api/health`.

**2. Frontend (asma-web)**
- **New +** → **Web Service** → same repo.
- Runtime: **Node**, Plan: **Free**, Root Directory: *(blank)*
- **Build Command:** `npm install && npm --workspace frontend run build`
- **Start Command:** `npm --workspace frontend run start`
- **Environment variable:** `NEXT_PUBLIC_API_BASE_URL` = the asma-api URL from step 1 (e.g. `https://asma-api.onrender.com`, no trailing slash).
- Create it, then open its URL.

---

## Good to know (free tier)

- **Cold starts:** free services sleep after ~15 min idle. The first request then takes ~30–60s to wake. Just refresh.
- **Ephemeral storage:** uploaded images and connected accounts live on the server's disk and **reset on each redeploy / sleep**. Fine for a demo. To make uploads persist, add a Render **Disk** to asma-api mounted at `/opt/render/project/src/data` (paid), or switch to cloud storage.
- **Everything runs in mock mode** by default — no API keys, nothing posts to real networks.

---

## Going live for real (optional)

Add these as environment variables on **asma-api**, then redeploy it:

| To enable | Variables |
|---|---|
| Real AI copy (Claude) | `LLM_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...` |
| Real AI copy (OpenAI) | `LLM_PROVIDER=openai`, `OPENAI_API_KEY=...` |
| Real images | `IMAGE_PROVIDER=openai` or `stability` + key |
| Real publishing | `LINKEDIN_ACCESS_TOKEN`, `FACEBOOK_ACCESS_TOKEN`, etc. |

Keep secrets in Render's Environment tab — never commit them. (`.env` is gitignored.)

---

## Updating the live site

Render **auto-deploys** on every push to `main` (`autoDeploy: true`). Just:

```bash
git add -A && git commit -m "your change" && git push
```

Both services rebuild automatically. (If you only changed the API URL env var, trigger a manual deploy of asma-web so the new value is baked in.)
