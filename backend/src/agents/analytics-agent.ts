import { repo } from '../store/repository.js';
import type { Analytics, Post, SeoResult } from '../types.js';
import { BaseAgent, type SharedContext } from './base-agent.js';

/**
 * Analytics Agent — captures post performance. In production it polls each
 * platform's insights API. Here it synthesizes realistic metrics that respond
 * to signal quality (SEO score, presence of an image) so downstream learning
 * has something meaningful to optimize against.
 */
export class AnalyticsAgent extends BaseAgent<Post, Analytics> {
  readonly id = 'analytics';
  readonly name = 'Analytics Agent';

  protected async handle(post: Post, ctx: SharedContext): Promise<Analytics> {
    const seo = (ctx.blackboard.seo as SeoResult | undefined)?.score ?? 60;
    const hasImage = Boolean(post.imageUrl);

    // Engagement scales with content quality signals.
    const quality = seo / 100 + (hasImage ? 0.15 : 0);
    const reach = Math.round(3000 + quality * 6000 + this.jitter(post.id, 1500));
    const impressions = Math.round(reach * (1.4 + quality * 0.4));
    const ctr = 0.02 + quality * 0.04;
    const clicks = Math.round(impressions * ctr);
    const likes = Math.round(reach * (0.03 + quality * 0.05));
    const engagementRate = Number(((clicks + likes) / impressions).toFixed(4));

    const analytics = repo.setAnalytics({
      postId: post.id,
      reach,
      impressions,
      clicks,
      likes,
      engagementRate,
    });
    ctx.blackboard.engagementRate = engagementRate;
    return analytics;
  }

  /** Deterministic per-post jitter so repeated runs are reproducible. */
  private jitter(seed: string, span: number): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
    return (h / 100000) * span;
  }

  protected summarize(output: Analytics): string {
    return `Reach ${output.reach}, engagement ${(output.engagementRate * 100).toFixed(1)}%`;
  }
}
