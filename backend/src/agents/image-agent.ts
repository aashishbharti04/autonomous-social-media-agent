import { generateImage } from '../services/image.js';
import type { ContentBrief } from '../types.js';
import { BaseAgent, type SharedContext } from './base-agent.js';

/**
 * Image Agent — produces a visual for the post (social graphic / thumbnail /
 * ad creative). Builds its prompt from the brief and the keywords the SEO agent
 * left on the blackboard.
 */
export class ImageAgent extends BaseAgent<ContentBrief, string> {
  readonly id = 'image';
  readonly name = 'Image Agent';

  protected async handle(brief: ContentBrief, ctx: SharedContext): Promise<string> {
    const keywords = (ctx.blackboard.seoKeywords as string[] | undefined) ?? [];
    const prompt = `${brief.businessType}, ${brief.tone} style, themes: ${keywords
      .slice(0, 4)
      .join(', ')}`;
    const url = await generateImage(brief, prompt);
    ctx.blackboard.imageUrl = url;
    return url;
  }

  protected summarize(): string {
    return 'Generated creative (1024×1024)';
  }
}
