# Research Component (MCA Thesis)

## Hypothesis

An **autonomous multi-agent system** that (a) retrieves high-performing past content (RAG) and (b) learns from each post's measured outcome will produce **higher engagement** than both manual posting and single-shot AI generation.

## Method

Three conditions, same business brief and platform:

1. **Manual** — human-written posts, no optimization.
2. **AI Generated** — single LLM call, no memory, no feedback.
3. **Autonomous Agent** — this system: RAG-informed content + SEO + best-time scheduling + analytics-driven self-learning.

Engagement rate = `(clicks + likes) / impressions`, averaged over N posts per condition.

## Metric source

In the running system, the **Autonomous Agent** figure is the live measured average from the Analytics agent (`GET /api/analytics/summary` → `comparison.autonomousAgent`). The Manual and AI baselines are study constants you can replace with your own field data.

## Illustrative result

| Method            | Avg. Engagement Rate | Relative lift |
|-------------------|----------------------|---------------|
| Manual Posting    | 1.8%                 | baseline      |
| AI Generated      | 3.4%                 | +89%          |
| Autonomous Agent  | 5.8%                 | +222%         |

> Replace the table with your experiment's numbers. The dashboard's **Analytics** page renders this comparison from live data.

## Why the autonomous condition wins (mechanistically)

- **RAG memory** biases new content toward patterns that previously engaged the audience.
- **SEO scoring** enforces length, keyword and CTA quality before publishing.
- **Best-time scheduling** places posts in each platform's high-traffic window.
- **Auto-learning loop** feeds measured outcomes back into memory, so quality compounds over time rather than resetting every post.

## Threats to validity / future work

- Mock analytics are modeled, not observed — replace with live platform insights for a real study.
- Larger N and multiple audiences needed for significance.
- A/B test individual mechanisms (ablate RAG, ablate scheduling) to attribute the lift.
