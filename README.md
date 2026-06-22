# 🤖 Autonomous Social Media Agent

**AI-powered, multi-agent platform that creates, optimizes, schedules, publishes, analyzes and *self-improves* social media content** across LinkedIn, Instagram, Facebook, X/Twitter, Threads and Pinterest.

Built as a unified **Node.js + TypeScript** monorepo (Express API + Next.js dashboard). It runs **fully offline in mock mode** — no API keys required — so the complete multi-agent pipeline, RAG memory and auto-learning loop are demonstrable out of the box. Real providers (Claude/OpenAI, Stability, ChromaDB, social APIs) drop in behind the same interfaces.

> MCA project. New here? Read the **[User Guide](USER_GUIDE.md)** (also available in-app under **Guide**). Presenting it? See the **[viva walkthrough script](docs/WALKTHROUGH.md)**. See [`docs/research.md`](docs/research.md) for the thesis research component (Manual vs AI vs Autonomous comparison).

---

## ✨ Highlights

- **6 cooperating agents** orchestrated over a shared blackboard memory:
  `Content → SEO → Image → Publishing → Analytics → Recommendation`
- **RAG / AI memory** — a vector store of past posts + engagement; the Content agent retrieves winners before writing.
- **Auto-learning loop** — the Recommendation agent writes each post's outcome back into memory, so future content is tuned by what actually performed.
- **Trend Detection Engine** — surfaces content ideas from (mock) Google Trends / Reddit / News / social signals.
- **Provider-agnostic** — every external dependency has a mock default and a live integration point.
- 🔐 **Accounts & multi-user** — email/password auth (JWT, bcrypt) with **per-user data isolation**; each user sees only their own accounts, posts, media and memory. Includes **email verification + password reset** (Resend, with a console fallback).
- 🔑 **Bring-your-own AI keys** — add your own provider key(s) from a Settings page (Anthropic, OpenAI, or any OpenAI-compatible/**free** provider like Groq, OpenRouter, Gemini, Mistral) to generate real content; keys are **encrypted at rest**. Multiple keys, choose the active one.
- 🗄️ **Persistent database** — PostgreSQL store (auto-migrates on boot) or an in-memory store for offline dev.
- ⏱️ **Scheduling & post lifecycle** — `draft → scheduled → publishing → published / failed`, a background scheduler that auto-publishes due posts, and cancel/retry/publish-now controls.
- 📣 **Real publishing** — Facebook Pages post for real via the Graph API using a connected account's token (others mock until their OAuth is wired). Setup: [docs/SOCIAL_PUBLISHING.md](docs/SOCIAL_PUBLISHING.md).
- **Client account management** — connect/pause/disconnect the social accounts you want to automate; pick a target account per campaign.
- **Media library** — upload images, generate them via the Image Agent, delete them, and attach them to posts.
- **Polished dashboard** — login, compose & schedule campaigns, manage accounts & media, filter posts by status, view analytics, explore trends, search memory, plus an in-app user guide.

---

## 🏗️ Architecture

```
            ┌────────────┐
   User ──▶ │ Dashboard  │ (Next.js)
            └─────┬──────┘
                  ▼
          ┌───────────────┐
          │ AI Orchestrator│ (Express)
          └───────┬───────┘
   ┌───────┬──────┼───────┬─────────┬──────────────┐
   ▼       ▼      ▼       ▼         ▼              ▼
 Content  SEO  Image  Publishing Analytics  Recommendation
   └───────┴──────┴───────┴─────────┴──────────────┘
                  │  shared blackboard + vector memory (RAG)
                  ▼
            Social Media APIs (mock / live)
```

Full detail: [`docs/architecture.md`](docs/architecture.md) · agent contracts: [`docs/agents.md`](docs/agents.md) · API: [`docs/api.md`](docs/api.md).

---

## 🚀 Quick start

Requires **Node.js ≥ 20**.

```bash
# 1. install all workspaces
npm install

# 2. (optional) configure providers — works without this step
cp .env.example .env

# 3. run backend + frontend together
npm run dev
```

- Dashboard → http://localhost:3000
- API → http://localhost:4000 (try `GET /api/health`)

Run them separately with `npm run dev:backend` / `npm run dev:frontend`.

### Try the pipeline from the API

```bash
curl -X POST http://localhost:4000/api/campaign/run \
  -H "content-type: application/json" \
  -d '{"businessType":"Dental Clinic","goal":"Generate Leads","platform":"linkedin","tone":"professional"}'
```

You'll get back the published post, SEO analysis, synthesized analytics, recommendations, and the **agent execution timeline**.

---

## 🔌 Mock vs live mode

Everything defaults to **mock** (`LLM_PROVIDER=mock`, `IMAGE_PROVIDER=mock`, `DB_PROVIDER=memory`, no social tokens). To go live, set the relevant values in `.env`:

| Capability | Mock (default) | Live |
|---|---|---|
| Content / SEO copy | Template generator | `LLM_PROVIDER=anthropic` (Claude) or `openai` + key |
| Images | Seeded placeholder | `IMAGE_PROVIDER=openai` / `stability` + key |
| Vector memory | In-process cosine store | `VECTOR_PROVIDER=chroma` |
| Database | In-memory (seeded) | `DB_PROVIDER=postgres` + `DATABASE_URL` |
| Publishing | Fake post IDs | Per-platform access tokens |

---

## ☁️ Deploy (live public URL)

Deploy both the API and dashboard for free on Render using the included [`render.yaml`](render.yaml) blueprint. Full click-by-click steps: **[DEPLOY.md](DEPLOY.md)**.

Quick version: Render → New + → Blueprint → pick this repo → after the API deploys, set the dashboard's `NEXT_PUBLIC_API_BASE_URL` to the API's URL and redeploy it.

---

## 🧰 Tech stack

**Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, TypeScript
**Backend:** Node.js, Express, TypeScript, Zod
**Auth:** JWT (jsonwebtoken) + bcrypt password hashing, per-user scoping
**AI layer:** provider-agnostic LLM service (Claude / OpenAI), in-process RAG vector memory
**Data:** PostgreSQL (node-postgres, auto-migrating) or in-memory store
**Scheduling:** in-process interval scheduler (production-ready to swap for Redis + BullMQ)
**Designed-for (production):** ChromaDB / pgvector, Redis + BullMQ

---

## 📂 Project layout

```
.
├── backend/                 # Express API + AI orchestrator + agents
│   └── src/
│       ├── agents/          # the six agents + base class (shared blackboard)
│       ├── orchestrator/    # sequences the agents
│       ├── memory/          # RAG vector memory
│       ├── services/        # llm, image, social, trends (mock + live)
│       ├── store/           # repository, accounts & media (JSON-persisted)
│       ├── routes/          # REST API (api, accounts, media)
│       └── index.ts
├── data/                    # persisted accounts.json, media.json, uploads/ (gitignored)
├── frontend/                # Next.js dashboard
│   ├── app/                 # pages + components (App Router)
│   └── lib/api.ts           # typed API client
├── db/schema.sql            # PostgreSQL schema
└── docs/                    # architecture, agents, api, research
```

---

## 🗺️ Roadmap

- Real social publishing (LinkedIn UGC, Meta Graph, X v2)
- ChromaDB-backed memory + real embeddings
- Redis + BullMQ scheduled publishing
- Auth & multi-tenant accounts
- Multi-language content, AI video, WhatsApp/Telegram automation

---

## 📄 License

MIT
