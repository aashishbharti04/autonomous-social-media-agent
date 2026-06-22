import type { ContentBrief, TrendIdea } from '../types.js';

/**
 * Trend Detection Engine. In production this aggregates Google Trends, Reddit,
 * news APIs and social listening. Here it produces deterministic, plausible
 * ideas seeded from the brief so the feature is demonstrable offline.
 */
export function detectTrends(brief?: ContentBrief): TrendIdea[] {
  const topic = brief?.businessType ?? 'small business';
  const goal = brief?.goal ?? 'growth';

  const ideas: TrendIdea[] = [
    {
      source: 'google-trends',
      topic: `${topic} near me`,
      score: 0.91,
      suggestedAngle: `Local-intent post optimized for "${topic} near me" searches.`,
    },
    {
      source: 'reddit',
      topic: `questions people ask about ${topic}`,
      score: 0.84,
      suggestedAngle: 'Answer the top community question as a carousel/thread.',
    },
    {
      source: 'news',
      topic: `${topic} industry update`,
      score: 0.78,
      suggestedAngle: 'React to a current headline to ride the news cycle.',
    },
    {
      source: 'social',
      topic: `${goal} success stories`,
      score: 0.73,
      suggestedAngle: 'Share a before/after customer story for social proof.',
    },
  ];

  return ideas.sort((a, b) => b.score - a.score);
}
