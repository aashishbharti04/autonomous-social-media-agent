# 🤖 Autonomous Social Media Agent

**AI-powered, multi-agent platform that creates, optimizes, schedules, publishes, analyzes and *self-improves* social media content** across LinkedIn, Instagram, Facebook, X/Twitter, Threads and Pinterest.

Built as a unified **Node.js + TypeScript** monorepo (Express API + Next.js dashboard). It runs **fully offline in mock mode** — no API keys required — so the complete multi-agent pipeline, RAG memory and auto-learning loop are demonstrable out of the box. Real providers (Claude/OpenAI, Stability, ChromaDB, social APIs) drop in behind the same interfaces.

> MCA project. See [`docs/research.md`](docs/research.md) for the thesis research component (Manual vs AI vs Autonomous comparison).

---

## ✨ Highlights

- **6 cooperating agents** orchestrated over a shared blackboard memory:
  `Content → SEO → Image → Publishing → Analytics → Recommendation`
- **RAG / AI memory** — a vector store of past posts + engagement; the Content agent retrieves winners before writing.
- **Auto-learning loop** — the Recommendation agent writes each post's outcome back into memory, so future content is tuned by what actually performed.
- **Trend Detection Engine** — surfaces content ideas from (mock) Google Trends / Reddit / News / social signals.
- **Provider-agnostic** — every external dependency has a mock default and a live integration point.
- **Polished dashboard** — compose, run full campaigns, browse posts, view analytics, explore trends, search memory.

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

## 🧰 Tech stack

**Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, TypeScript
**Backend:** Node.js, Express, TypeScript, Zod
**AI layer:** provider-agnostic LLM service (Claude / OpenAI), in-process RAG vector memory
**Data:** PostgreSQL schema ([`db/schema.sql`](db/schema.sql)) with an in-memory default
**Designed-for (production):** ChromaDB / pgvector, Redis + BullMQ scheduling

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
│       ├── store/           # in-memory repository (mirrors db/schema.sql)
│       ├── routes/          # REST API
│       └── index.ts
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
