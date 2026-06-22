import { memory } from '../memory/vector-memory.js';
import { generatePost, type GeneratedContent } from '../services/llm.js';
import type { ContentBrief } from '../types.js';
import { BaseAgent, type SharedContext } from './base-agent.js';

/**
 * Content Agent — writes the post copy and hashtags.
 * RAG step: before writing, it retrieves the most relevant high-performing past
 * posts from vector memory and feeds them to the LLM as exemplars.
 */
export class ContentAgent extends BaseAgent<ContentBrief, GeneratedContent> {
  readonly id = 'content';
  readonly name = 'Content Agent';

  protected async handle(brief: ContentBrief, ctx: SharedContext): Promise<GeneratedContent> {
    const recalled = memory
      .search(
        `${brief.businessType} ${brief.goal} ${brief.platform}`,
        3,
        (m) => m.userId === brief.userId,
      )
      .filter((hit) => hit.score > 0)
      .map((hit) => hit.text);

    ctx.blackboard.retrievedContext = recalled;
    const generated = await generatePost(brief, recalled);
    ctx.blackboard.content = generated.content;
    ctx.blackboard.hashtags = generated.hashtags;
    return generated;
  }

  protected summarize(output: GeneratedContent): string {
    return `Drafted ${output.content.length} chars + ${output.hashtags.length} hashtags`;
  }
}
