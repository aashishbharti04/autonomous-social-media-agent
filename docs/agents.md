# The Six Agents

Every agent extends `BaseAgent<TInput, TOutput>` and implements `handle()` + `summarize()`. They communicate through the shared blackboard and, for the Content/Recommendation pair, through long-term vector memory.

| Agent | Input | Reads from blackboard | Writes to blackboard | Output |
|---|---|---|---|---|
| **Content** | brief | — | `content`, `hashtags`, `retrievedContext` | copy + hashtags |
| **SEO** | brief | `content` | `seoKeywords` | keywords, score, trending topics |
| **Image** | brief | `seoKeywords` | `imageUrl` | image URL |
| **Publishing** | brief | `content`, `hashtags`, `imageUrl` | `postId` | persisted `Post` |
| **Analytics** | post | `seo` | `engagementRate` | `Analytics` row |
| **Recommendation** | post + analytics | `seo` | — (writes to vector memory) | `Recommendation[]` |

---

### 1. Content Agent — `agents/content-agent.ts`
Writes the post. **RAG step:** queries vector memory for the most relevant high-performing past posts and passes them to the LLM as exemplars. Falls back to a template generator in mock mode.

### 2. SEO Agent — `agents/seo-agent.ts`
Extracts keywords (frequency minus stop-words) from the draft, fetches trending topics from the Trend Detection Engine, and computes a 0–100 SEO score from length, keyword count and CTA signals.

### 3. Image Agent — `agents/image-agent.ts`
Builds an image prompt from the brief and the SEO keywords, then calls the image provider. Mock mode returns a deterministic seeded placeholder so the same brief yields the same creative.

### 4. Publishing Agent — `agents/publishing-agent.ts`
Persists the post, schedules it for the platform's predicted best hour, and publishes. Mock mode returns a fake external id; live mode posts via the platform API when a token is configured.

### 5. Analytics Agent — `agents/analytics-agent.ts`
Captures performance. In mock mode it **synthesizes metrics that respond to quality signals** (SEO score, presence of an image) with deterministic per-post jitter, so the learning loop has a meaningful gradient. Live mode would poll each platform's insights API.

### 6. Recommendation Agent — `agents/recommendation-agent.ts`
Closes the **auto-learning loop**: inspects analytics, proposes concrete next-time improvements (timing, hashtags, format, topic, frequency), and **writes the post + outcome back into vector memory** so future content is shaped by what performed.
