import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load the repo-root .env (one level up from backend/) as well as a local .env.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
dotenv.config({ path: path.resolve(repoRoot, '.env') });
dotenv.config();

/** Filesystem locations for persisted data and uploaded media. */
export const paths = {
  root: repoRoot,
  dataDir: path.resolve(repoRoot, 'data'),
  uploadsDir: path.resolve(repoRoot, 'data', 'uploads'),
};

function env(key: string, fallback = ''): string {
  return process.env[key]?.trim() || fallback;
}

export const config = {
  port: Number(env('PORT', '4000')),
  nodeEnv: env('NODE_ENV', 'development'),
  /**
   * Absolute base URL used to build links to uploaded media.
   * Falls back to Render's injected RENDER_EXTERNAL_URL in production.
   */
  publicBaseUrl: env(
    'PUBLIC_BASE_URL',
    env('RENDER_EXTERNAL_URL', `http://localhost:${Number(env('PORT', '4000'))}`),
  ),

  llm: {
    provider: env('LLM_PROVIDER', 'mock') as 'mock' | 'anthropic' | 'openai',
    anthropicApiKey: env('ANTHROPIC_API_KEY'),
    anthropicModel: env('ANTHROPIC_MODEL', 'claude-opus-4-8'),
    openaiApiKey: env('OPENAI_API_KEY'),
    openaiModel: env('OPENAI_MODEL', 'gpt-4o-mini'),
  },

  image: {
    provider: env('IMAGE_PROVIDER', 'mock') as 'mock' | 'openai' | 'stability',
    stabilityApiKey: env('STABILITY_API_KEY'),
  },

  vector: {
    provider: env('VECTOR_PROVIDER', 'memory') as 'memory' | 'chroma',
    chromaUrl: env('CHROMA_URL', 'http://localhost:8000'),
  },

  db: {
    provider: env('DB_PROVIDER', 'memory') as 'memory' | 'postgres',
    url: env('DATABASE_URL'),
  },

  social: {
    linkedin: env('LINKEDIN_ACCESS_TOKEN'),
    facebook: env('FACEBOOK_ACCESS_TOKEN'),
    instagram: env('INSTAGRAM_ACCESS_TOKEN'),
    twitter: env('TWITTER_BEARER_TOKEN'),
  },
};

/** True when every external dependency is unconfigured — the all-offline demo mode. */
export const isFullMock =
  config.llm.provider === 'mock' &&
  config.image.provider === 'mock' &&
  config.vector.provider === 'memory' &&
  config.db.provider === 'memory';

export type AppMode = 'mock' | 'live' | 'hybrid';

export function appMode(): AppMode {
  if (isFullMock) return 'mock';
  if (config.llm.provider !== 'mock' && config.social.linkedin) return 'live';
  return 'hybrid';
}
