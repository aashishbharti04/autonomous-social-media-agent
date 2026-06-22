import { store } from '../db/index.js';
import { publishToPlatform } from '../services/social.js';
import type { ContentBrief, Post } from '../types.js';
import { BaseAgent, type SharedContext } from './base-agent.js';

// Heuristic best-time table (local hour) per platform — refined by the
// Recommendation agent's learning over time.
const BEST_HOUR: Record<string, number> = {
  linkedin: 9,
  instagram: 18,
  facebook: 13,
  twitter: 12,
  threads: 19,
  pinterest: 20,
};

/**
 * Publishing Agent — persists the post. If the brief asks to schedule for a
 * future time, the post is saved as `scheduled` (waiting) and the background
 * scheduler publishes it later. Otherwise it publishes immediately.
 */
export class PublishingAgent extends BaseAgent<ContentBrief, Post> {
  readonly id = 'publishing';
  readonly name = 'Publishing Agent';

  protected async handle(brief: ContentBrief, ctx: SharedContext): Promise<Post> {
    const now = Date.now();
    const scheduleAt = brief.scheduledFor ? Date.parse(brief.scheduledFor) : NaN;
    const isFuture = Number.isFinite(scheduleAt) && scheduleAt > now + 1000;
    const scheduledFor = isFuture ? brief.scheduledFor : this.nextSlot(brief.platform);

    let post = await store.createPost({
      userId: brief.userId,
      accountId: brief.accountId,
      platform: brief.platform,
      content: String(ctx.blackboard.content ?? ''),
      hashtags: (ctx.blackboard.hashtags as string[]) ?? [],
      imageUrl: ctx.blackboard.imageUrl as string | undefined,
      status: isFuture ? 'scheduled' : 'publishing',
      scheduledFor,
    });

    ctx.blackboard.scheduled = isFuture;
    ctx.blackboard.postId = post.id;

    if (isFuture) return post; // waiting — the scheduler will publish it

    const result = await publishToPlatform(post);
    post =
      (await store.updatePost(post.id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        externalId: result.externalId,
      })) ?? post;
    return post;
  }

  private nextSlot(platform: string): string {
    const hour = BEST_HOUR[platform] ?? 12;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  protected summarize(output: Post): string {
    return output.status === 'scheduled'
      ? `Scheduled for ${output.scheduledFor}`
      : `Published to ${output.platform} (${output.externalId})`;
  }
}
