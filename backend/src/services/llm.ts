import { config } from '../config.js';
import type { ContentBrief, Platform, ResolvedLlm } from '../types.js';

export interface GeneratedContent {
  content: string;
  hashtags: string[];
}

const MAX_LEN: Record<Platform, number> = {
  linkedin: 700,
  instagram: 400,
  facebook: 600,
  twitter: 270,
  threads: 480,
  pinterest: 240,
};

/**
 * LLM abstraction. Resolution order:
 *   1. The user's active API key (passed as `resolved`) — real generation.
 *   2. A server-wide key from env (LLM_PROVIDER + key).
 *   3. Template-based mock (no key needed).
 * Any provider error falls back to the mock so a campaign never hard-fails.
 */
export async function generatePost(
  brief: ContentBrief,
  retrievedContext: string[],
  resolved?: ResolvedLlm | null,
): Promise<GeneratedContent> {
  const prompt = buildPrompt(brief, retrievedContext);

  // 1. Per-user key.
  if (resolved?.apiKey) {
    try {
      const raw =
        resolved.provider === 'anthropic'
          ? await callAnthropic(prompt, resolved.apiKey, resolved.model)
          : await callOpenAICompatible(
              prompt,
              resolved.apiKey,
              resolved.baseUrl || 'https://api.openai.com/v1',
              resolved.model || 'gpt-4o-mini',
            );
      return parse(raw, brief.platform);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('User LLM call failed, falling back to mock:', (err as Error).message);
      return mockPost(brief, retrievedContext);
    }
  }

  // 2. Server-wide env key.
  try {
    if (config.llm.provider === 'anthropic' && config.llm.anthropicApiKey) {
      return parse(await callAnthropic(prompt, config.llm.anthropicApiKey, config.llm.anthropicModel), brief.platform);
    }
    if (config.llm.provider === 'openai' && config.llm.openaiApiKey) {
      return parse(
        await callOpenAICompatible(prompt, config.llm.openaiApiKey, 'https://api.openai.com/v1', config.llm.openaiModel),
        brief.platform,
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Server LLM call failed, falling back to mock:', (err as Error).message);
  }

  // 3. Mock.
  return mockPost(brief, retrievedContext);
}

function buildPrompt(brief: ContentBrief, ctx: string[]): string {
  const memo = ctx.length
    ? `\n\nHere are our highest-performing past posts — match what worked:\n- ${ctx.join('\n- ')}`
    : '';
  return [
    `You are a social media expert writing a ${brief.platform} post.`,
    `Business type: ${brief.businessType}. Goal: ${brief.goal}. Tone: ${brief.tone}.`,
    `Keep it under ${MAX_LEN[brief.platform]} characters. End with 4-6 relevant hashtags on the last line.${memo}`,
  ].join('\n');
}

// ---- Providers ----

async function callAnthropic(prompt: string, apiKey: string, model?: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-opus-4-8',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { content: { text: string }[] };
  return json.content.map((c) => c.text).join('');
}

/**
 * OpenAI Chat Completions format — works for OpenAI and every OpenAI-compatible
 * provider (Groq, OpenRouter, Mistral, Together, Gemini's OpenAI endpoint, …)
 * via a custom baseUrl.
 */
async function callOpenAICompatible(
  prompt: string,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? '';
}

function parse(raw: string, platform: Platform): GeneratedContent {
  const tags = (raw.match(/#[A-Za-z0-9_]+/g) ?? []).slice(0, 6);
  const content = raw.replace(/#[A-Za-z0-9_]+/g, '').trim().slice(0, MAX_LEN[platform]);
  return { content, hashtags: tags.length ? tags : ['#Marketing', '#Business'] };
}

// ---- Mock provider (default) ----

function mockPost(brief: ContentBrief, ctx: string[]): GeneratedContent {
  const noun = brief.businessType;
  const hook: Record<string, string> = {
    professional: `Looking for a trusted ${noun}?`,
    friendly: `Hey! Your friendly ${noun} is here for you 👋`,
    witty: `Plot twist: your search for a great ${noun} ends today.`,
    inspirational: `Every great journey deserves a great ${noun}.`,
    bold: `Stop settling. The best ${noun} is right here.`,
  };
  const cta: Record<string, string> = {
    'Generate Leads': 'Book your free consultation today — link in bio.',
    'Brand Awareness': 'Follow us for more tips that actually help.',
    'Drive Sales': 'Limited spots this week. DM us to claim yours.',
    Engagement: 'Tell us in the comments — what matters most to you?',
  };
  const learned = ctx.length ? ` (Tuned from ${ctx.length} of your best-performing posts.)` : '';
  const content =
    `${hook[brief.tone] ?? hook.professional} ` +
    `Our mission at this ${noun} is simple: deliver results that move your goal — ${brief.goal} — forward.` +
    `${learned} ${cta[brief.goal] ?? cta.Engagement}`;

  const base = noun.replace(/[^a-z]/gi, '');
  const hashtags = [
    `#${base}`,
    `#${brief.goal.replace(/\s+/g, '')}`,
    '#GrowthMarketing',
    '#AIContent',
    `#${brief.platform[0].toUpperCase()}${brief.platform.slice(1)}`,
  ];
  return { content: content.slice(0, MAX_LEN[brief.platform]), hashtags };
}
