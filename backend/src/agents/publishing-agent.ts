import { repo } from '../store/repository.js';
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
 * Publishing Agent — persists the post, schedules it for the predicted best
 * time, then publishes (mock unless a social token is configured).
 */
export class PublishingAgent extends BaseAgent<ContentBrief, Post> {
  readonly id = 'publishing';
  readonly name = 'Publishing Agent';

  protected async handle(brief: ContentBrief, ctx: SharedContext): Promise<Post> {
    const userId = brief.userId ?? repo.getDefaultUser().id;
    const scheduledFor = this.nextSlot(brief.platform);

    let post = repo.createPost({
      userId,
      accountId: brief.accountId,
      platform: brief.platform,
      content: String(ctx.blackboard.content ?? ''),
      hashtags: (ctx.blackboard.hashtags as string[]) ?? [],
      imageUrl: ctx.blackboard.imageUrl as string | undefined,
      status: 'scheduled',
      scheduledFor,
    });

    const result = await publishToPlatform(post);
    post =
      repo.updatePost(post.id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        externalId: result.externalId,
      }) ?? post;

    ctx.blackboard.postId = post.id;
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
    return `Published to ${output.platform} (${output.externalId})`;
  }
}
