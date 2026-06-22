import { AnalyticsAgent } from '../agents/analytics-agent.js';
import { ContentAgent } from '../agents/content-agent.js';
import { ImageAgent } from '../agents/image-agent.js';
import { PublishingAgent } from '../agents/publishing-agent.js';
import { RecommendationAgent } from '../agents/recommendation-agent.js';
import { SeoAgent } from '../agents/seo-agent.js';
import { createContext, type AgentMeta } from '../agents/base-agent.js';
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
  analytics: Analytics;
  recommendations: Recommendation[];
  timeline: AgentRunRecord[];
}

/**
 * AI Orchestrator — the conductor. Holds one long-lived instance of each agent
 * (so run counts / status persist) and sequences them over a shared context,
 * implementing the multi-agent communication chain:
 *
 *   Content → SEO → Image → Publishing → Analytics → Recommendation
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

  /** Full autonomous pipeline. */
  async runCampaign(brief: ContentBrief): Promise<CampaignResult> {
    const ctx = createContext(brief);

    await this.content.run(brief, ctx);
    const seo = await this.seo.run(brief, ctx);
    ctx.blackboard.seo = seo;
    await this.image.run(brief, ctx);

    const post = await this.publishing.run(brief, ctx);
    const analytics = await this.analytics.run(post, ctx);
    const recommendations = await this.recommendation.run({ post, analytics }, ctx);

    return { post, seo, analytics, recommendations, timeline: ctx.timeline };
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
