import { config } from '../config.js';
import type { ContentBrief } from '../types.js';

/**
 * Image agent backend. Defaults to a deterministic placeholder image so the
 * pipeline produces a real, viewable URL with no API key. Plug in OpenAI Images
 * or Stability AI by setting IMAGE_PROVIDER (+ key).
 */
export async function generateImage(brief: ContentBrief, prompt: string): Promise<string> {
  if (config.image.provider === 'stability' && config.image.stabilityApiKey) {
    // Stubbed integration point — return placeholder until wired to the API.
    // const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {...})
  }
  if (config.image.provider === 'openai' && config.llm.openaiApiKey) {
    // Integration point for OpenAI gpt-image-1 / DALL·E.
  }

  // Mock: stable, seeded placeholder so the same brief yields the same image.
  const seed = encodeURIComponent(
    `${brief.businessType}-${brief.platform}-${prompt}`.slice(0, 40),
  );
  return `https://picsum.photos/seed/${seed}/1024/1024`;
}
