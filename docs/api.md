# REST API Contract

Base URL: `http://localhost:4000`
All request/response bodies are JSON. All responses are wrapped: `{ "ok": true, "data": ... }` on success, `{ "ok": false, "error": "message" }` on failure.

---

## Health & meta

### `GET /api/health`
```json
{ "ok": true, "data": { "status": "up", "mode": "mock", "uptimeMs": 1234 } }
```

### `GET /api/agents`
Returns the registered agents and their last activity.
```json
{ "ok": true, "data": [
  { "id": "content",        "name": "Content Agent",        "status": "idle", "runs": 3, "lastRunAt": "2026-06-22T10:00:00.000Z" },
  { "id": "image",          "name": "Image Agent",          "status": "idle", "runs": 3 },
  { "id": "seo",            "name": "SEO Agent",            "status": "idle", "runs": 3 },
  { "id": "publishing",     "name": "Publishing Agent",     "status": "idle", "runs": 3 },
  { "id": "analytics",      "name": "Analytics Agent",      "status": "idle", "runs": 3 },
  { "id": "recommendation", "name": "Recommendation Agent", "status": "idle", "runs": 3 }
] }
```

---

## Content

### `POST /api/content/generate`
Runs the Content + SEO + Image agents only (no publishing) and returns a draft.
Request:
```json
{ "businessType": "Dental Clinic", "goal": "Generate Leads", "platform": "linkedin", "tone": "professional" }
```
`platform` ∈ `linkedin | instagram | facebook | twitter | threads | pinterest`.
Response `data`:
```json
{
  "content": "AI generated post text...",
  "hashtags": ["#DentalCare", "#SmileDesign"],
  "imageUrl": "https://picsum.photos/seed/abc/1024/1024",
  "seo": { "keywords": ["dental implants", "..."], "score": 82, "trendingTopics": ["..."] }
}
```

---

## Campaigns (the full multi-agent pipeline)

### `POST /api/campaign/run`
Runs the **full orchestrated pipeline**: Content → SEO → Image → Publishing (schedule + publish, mock) → Analytics → Recommendation. Persists a `post` with attached analytics + recommendations, and writes to vector memory.
Request: same shape as `/api/content/generate` plus optional `userId`.
Response `data`:
```json
{
  "post": { "id": "uuid", "platform": "linkedin", "content": "...", "hashtags": ["..."], "imageUrl": "...", "status": "published", "scheduledFor": "...", "publishedAt": "...", "externalId": "mock-..." },
  "seo": { "keywords": ["..."], "score": 82 },
  "analytics": { "reach": 5400, "impressions": 8200, "clicks": 210, "likes": 320, "engagementRate": 0.061 },
  "recommendations": [ { "id": "uuid", "type": "timing", "suggestion": "Post Tue 9am..." } ],
  "timeline": [ { "agent": "content", "ms": 12, "summary": "Generated 1 post" }, ... ]
}
```

---

## Posts

### `GET /api/posts`
List all posts (newest first). Each item: `{ id, platform, content, imageUrl, status, createdAt, analytics }`.

### `GET /api/posts/:id`
Full post detail including `analytics` and `recommendations`.

### `POST /api/posts/:id/publish`
Publishes a draft/scheduled post (mock). Returns the updated post.

---

## Analytics

### `GET /api/analytics/summary`
```json
{ "ok": true, "data": {
  "totals": { "posts": 12, "reach": 64000, "impressions": 98000, "clicks": 2400, "avgEngagementRate": 0.058 },
  "byPlatform": [ { "platform": "linkedin", "posts": 4, "avgEngagementRate": 0.07 } ],
  "comparison": { "manual": 0.018, "aiGenerated": 0.034, "autonomousAgent": 0.058 }
} }
```
`comparison` powers the thesis research table (Manual vs AI vs Autonomous).

---

## Recommendations

### `GET /api/recommendations`
List recommendations across all posts: `{ id, postId, type, suggestion, createdAt }`.

---

## Trends

### `GET /api/trends`
Trend Detection Engine output (mock): `{ source, topic, score, suggestedAngle }[]`.

---

## Memory (RAG)

### `GET /api/memory/search?q=dental+leads&k=5`
Vector similarity search over past posts/engagement. Returns
`{ id, text, score, metadata }[]`. Powers the self-learning loop.
