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
    // If the user attached an existing asset, reuse it instead of generating.
    if (brief.imageUrl) {
      ctx.blackboard.imageUrl = brief.imageUrl;
      ctx.blackboard.imageReused = true;
      return brief.imageUrl;
    }
    const keywords = (ctx.blackboard.seoKeywords as string[] | undefined) ?? [];
    const prompt = `${brief.businessType}, ${brief.tone} style, themes: ${keywords
      .slice(0, 4)
      .join(', ')}`;
    const url = await generateImage(brief, prompt);
    ctx.blackboard.imageUrl = url;
    return url;
  }

  protected summarize(_output: string, ctx: SharedContext): string {
    return ctx.blackboard.imageReused
      ? 'Attached existing media asset'
      : 'Generated creative (1024×1024)';
  }
}
