# Architecture

## Overview

The system is a **multi-agent pipeline** coordinated by a central **AI Orchestrator**. A request enters through the dashboard or REST API, the orchestrator runs the agents in sequence over a **shared context (blackboard)**, and each agent both consumes the work of prior agents and contributes its own output for the next.

```
User → Dashboard (Next.js) → AI Orchestrator (Express)
        → Content → SEO → Image → Publishing → Analytics → Recommendation
        ↕ shared blackboard (per-run) + vector memory (long-term, RAG)
        → Social Media APIs (mock or live)
```

## Multi-agent communication

Two layers of shared memory:

1. **Blackboard (`SharedContext`)** — a per-run object passed agent-to-agent. The Content agent writes `content`/`hashtags`; the SEO agent reads `content` and writes `seoKeywords`; the Image agent reads keywords; Publishing reads everything to assemble the post; Analytics reads SEO score to model engagement; Recommendation reads analytics. Every `BaseAgent.run()` also appends to a **timeline** and **event log** so the dashboard can show exactly what each agent did and how long it took.

2. **Vector memory (RAG)** — a long-term store spanning runs. The Recommendation agent writes each post's text + engagement outcome; the Content agent retrieves the most relevant high performers before writing the next post. This is the mechanism behind the **auto-learning loop**.

## Why a base agent class

`BaseAgent<TInput, TOutput>` standardizes:
- status (`idle | running | error`), run count, last-run timestamp (surfaced at `GET /api/agents`)
- timing + event logging onto the shared context
- a uniform `run()` wrapper around each agent's `handle()`

This keeps every agent small and focused on its single responsibility while the orchestrator stays a thin sequencer.

## Provider abstraction

Each external dependency is wrapped in a service with a **mock default** and a **live integration point** gated on configuration:

| Service | File | Mock | Live |
|---|---|---|---|
| LLM | `services/llm.ts` | template generator | Anthropic / OpenAI fetch calls |
| Image | `services/image.ts` | seeded placeholder URL | OpenAI Images / Stability |
| Social | `services/social.ts` | fake external id | platform REST/Graph APIs |
| Trends | `services/trends.ts` | deterministic ideas | Google Trends / Reddit / News |
| Memory | `memory/vector-memory.ts` | in-process cosine store | ChromaDB / pgvector |
| Data | `store/repository.ts` | in-memory maps | PostgreSQL |

Because agents depend only on these interfaces, switching from mock to live never touches agent logic.

## Data flow for `POST /api/campaign/run`

1. **Content** retrieves RAG context → generates copy + hashtags.
2. **SEO** extracts keywords, pulls trends, scores the draft.
3. **Image** builds a prompt from brief + keywords → image URL.
4. **Publishing** persists the post, schedules to the platform's best hour, publishes (mock/live).
5. **Analytics** synthesizes/collects reach, impressions, clicks, likes, engagement rate (scaled by quality signals).
6. **Recommendation** proposes improvements and writes the outcome into vector memory.

The response bundles the post, SEO, analytics, recommendations and the agent timeline.

## Production topology (target)

- **Redis + BullMQ** for scheduled/queued publishing instead of inline publish.
- **ChromaDB / pgvector** for memory with real embeddings.
- **PostgreSQL** for persistence (schema already defined in `db/schema.sql`).
- Stateless API replicas behind a load balancer; agents are pure functions of (input, services).
