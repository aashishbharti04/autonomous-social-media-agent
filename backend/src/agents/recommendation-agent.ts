import { memory } from '../memory/vector-memory.js';
import { store } from '../db/index.js';
import type { Analytics, Post, Recommendation, SeoResult } from '../types.js';
import { BaseAgent, type SharedContext } from './base-agent.js';

export interface RecommendationInput {
  post: Post;
  analytics: Analytics;
}

/**
 * Recommendation Agent — closes the Auto-Learning Loop. It inspects performance,
 * proposes concrete next-time improvements, AND writes the outcome back into
 * vector memory so the Content Agent can retrieve and replicate winners.
 */
export class RecommendationAgent extends BaseAgent<RecommendationInput, Recommendation[]> {
  readonly id = 'recommendation';
  readonly name = 'Recommendation Agent';

  protected async handle(
    input: RecommendationInput,
    ctx: SharedContext,
  ): Promise<Recommendation[]> {
    const { post, analytics } = input;
    const seo = ctx.blackboard.seo as SeoResult | undefined;
    const drafts: Omit<Recommendation, 'id' | 'createdAt'>[] = [];

    drafts.push({
      postId: post.id,
      type: 'timing',
      suggestion: `Engagement was ${(analytics.engagementRate * 100).toFixed(1)}%. ` +
        `Keep posting ${post.platform} content around ${this.hour(post)} for this audience.`,
    });

    if ((seo?.keywords.length ?? 0) < 5) {
      drafts.push({
        postId: post.id,
        type: 'hashtags',
        suggestion: 'Add 2-3 more niche hashtags — posts with 5+ keywords reached further.',
      });
    }

    if (!post.imageUrl) {
      drafts.push({
        postId: post.id,
        type: 'format',
        suggestion: 'Attach a visual next time — image posts averaged ~15% more reach.',
      });
    }

    drafts.push({
      postId: post.id,
      type: analytics.engagementRate > 0.05 ? 'topic' : 'frequency',
      suggestion:
        analytics.engagementRate > 0.05
          ? 'This topic outperformed — generate 2 follow-up posts on the same theme.'
          : 'Below-average engagement — test a different angle and increase cadence.',
    });

    // --- Self-learning: store the outcome in long-term memory (per user) ---
    memory.add(`${post.content} ${post.hashtags.join(' ')}`, {
      userId: post.userId,
      postId: post.id,
      platform: post.platform,
      engagementRate: analytics.engagementRate,
      performedWell: analytics.engagementRate > 0.05,
    });

    return store.addRecommendations(drafts);
  }

  private hour(post: Post): string {
    if (!post.scheduledFor) return 'peak hours';
    const h = new Date(post.scheduledFor).getHours();
    return `${h}:00`;
  }

  protected summarize(output: Recommendation[]): string {
    return `Produced ${output.length} recommendations + stored outcome in memory`;
  }
}
