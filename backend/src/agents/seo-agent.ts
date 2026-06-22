import { detectTrends } from '../services/trends.js';
import type { ContentBrief, SeoResult } from '../types.js';
import { BaseAgent, type SharedContext } from './base-agent.js';

const STOP = new Set([
  'the', 'and', 'for', 'our', 'your', 'with', 'this', 'that', 'are', 'you',
  'is', 'to', 'a', 'of', 'in', 'on', 'we', 'us', 'it', 'at', 'an',
]);

/**
 * SEO Agent — derives keywords from the draft, pulls trending topics from the
 * Trend Detection Engine, and scores the content's SEO strength (0-100).
 */
export class SeoAgent extends BaseAgent<ContentBrief, SeoResult> {
  readonly id = 'seo';
  readonly name = 'SEO Agent';

  protected async handle(brief: ContentBrief, ctx: SharedContext): Promise<SeoResult> {
    const content = String(ctx.blackboard.content ?? '');
    const keywords = this.extractKeywords(`${brief.businessType} ${brief.goal} ${content}`);
    const trendingTopics = detectTrends(brief).map((t) => t.topic);
    const score = this.score(content, keywords);

    ctx.blackboard.seoKeywords = keywords;
    return { keywords, score, trendingTopics };
  }

  private extractKeywords(text: string): string[] {
    const freq = new Map<string, number>();
    for (const word of text.toLowerCase().match(/[a-z]{3,}/g) ?? []) {
      if (STOP.has(word)) continue;
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w);
  }

  private score(content: string, keywords: string[]): number {
    let s = 50;
    if (content.length > 120) s += 15;
    if (/#[A-Za-z]/.test(content) || keywords.length >= 5) s += 10;
    if (/\b(today|free|now|book|limited)\b/i.test(content)) s += 10; // CTA signal
    s += Math.min(keywords.length, 8) * 2;
    return Math.min(100, s);
  }

  protected summarize(output: SeoResult): string {
    return `SEO score ${output.score}, ${output.keywords.length} keywords`;
  }
}
