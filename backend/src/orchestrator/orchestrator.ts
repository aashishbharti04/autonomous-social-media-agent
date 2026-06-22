import { AnalyticsAgent } from '../agents/analytics-agent.js';
import { ContentAgent } from '../agents/content-agent.js';
import { ImageAgent } from '../agents/image-agent.js';
import { PublishingAgent } from '../agents/publishing-agent.js';
import { RecommendationAgent } from '../agents/recommendation-agent.js';
import { SeoAgent } from '../agents/seo-agent.js';
import { createContext, type AgentMeta } from '../agents/base-agent.js';
import { store } from '../db/index.js';
import { publishToPlatform } from '../services/social.js';
import type {
  AgentRunRecord,
  Analytics,
  ContentBrief,
  Post,
  Recommendation,
  SeoResult,
} from '../types.js';

export interface DraftResult {
  content: string;
  hashtags: string[];
  imageUrl: string;
  seo: SeoResult;
}

export interface CampaignResult {
  post: Post;
  seo: SeoResult;
  scheduled: boolean;
  analytics: Analytics | null;
  recommendations: Recommendation[];
  timeline: AgentRunRecord[];
}

/**
 * AI Orchestrator — sequences the agents over a shared context:
 *   Content → SEO → Image → Publishing → (Analytics → Recommendation when live)
 * When a campaign is scheduled for later, it stops after Publishing; the
 * scheduler runs Analytics + Recommendation once the post actually goes out.
 */
class Orchestrator {
  private content = new ContentAgent();
  private seo = new SeoAgent();
  private image = new ImageAgent();
  private publishing = new PublishingAgent();
  private analytics = new AnalyticsAgent();
  private recommendation = new RecommendationAgent();

  /** Draft-only path: Content → SEO → Image (no publishing). */
  async generateDraft(brief: ContentBrief): Promise<DraftResult> {
    const ctx = createContext(brief);
    const generated = await this.content.run(brief, ctx);
    const seo = await this.seo.run(brief, ctx);
    ctx.blackboard.seo = seo;
    const imageUrl = await this.image.run(brief, ctx);
    return { content: generated.content, hashtags: generated.hashtags, imageUrl, seo };
  }

  /** Full pipeline. Publishes now, or schedules for later. */
  async runCampaign(brief: ContentBrief): Promise<CampaignResult> {
    const ctx = createContext(brief);

    await this.content.run(brief, ctx);
    const seo = await this.seo.run(brief, ctx);
    ctx.blackboard.seo = seo;
    await this.image.run(brief, ctx);

    const post = await this.publishing.run(brief, ctx);

    if (ctx.blackboard.scheduled) {
      return { post, seo, scheduled: true, analytics: null, recommendations: [], timeline: ctx.timeline };
    }

    const analytics = await this.analytics.run(post, ctx);
    const recommendations = await this.recommendation.run({ post, analytics }, ctx);
    return { post, seo, scheduled: false, analytics, recommendations, timeline: ctx.timeline };
  }

  /**
   * Publish a previously-scheduled post (called by the scheduler when its time
   * arrives), then run Analytics + Recommendation on it.
   */
  async finalizeScheduledPost(post: Post): Promise<Post> {
    await store.updatePost(post.id, { status: 'publishing' });
    try {
      const result = await publishToPlatform(post);
      const published =
        (await store.updatePost(post.id, {
          status: 'published',
          publishedAt: new Date().toISOString(),
          externalId: result.externalId,
        })) ?? post;

      const ctx = createContext({
        businessType: '',
        goal: '',
        platform: post.platform,
        tone: 'professional',
        userId: post.userId,
      });
      const analytics = await this.analytics.run(published, ctx);
      await this.recommendation.run({ post: published, analytics }, ctx);
      return published;
    } catch (err) {
      const failed =
        (await store.updatePost(post.id, {
          status: 'failed',
          failureReason: (err as Error).message,
        })) ?? post;
      return failed;
    }
  }

  listAgents(): AgentMeta[] {
    return [
      this.content,
      this.image,
      this.seo,
      this.publishing,
      this.analytics,
      this.recommendation,
    ].map((a) => a.meta());
  }
}

export const orchestrator = new Orchestrator();
