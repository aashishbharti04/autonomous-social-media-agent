// Shared domain types for the Autonomous Social Media Agent.

export type Platform =
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'threads'
  | 'pinterest';

export const PLATFORMS: Platform[] = [
  'linkedin',
  'instagram',
  'facebook',
  'twitter',
  'threads',
  'pinterest',
];

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export type Tone = 'professional' | 'friendly' | 'witty' | 'inspirational' | 'bold';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  plan: 'free' | 'pro' | 'business';
  emailVerified: boolean;
  createdAt: string;
}

/** User without the password hash — safe to return in API responses. */
export type SafeUser = Omit<User, 'passwordHash'>;

export interface SocialAccount {
  id: string;
  userId: string;
  platform: Platform;
  /** Never store raw tokens in responses — masked for display. */
  accessTokenMasked: string;
}

export interface Post {
  id: string;
  userId: string;
  accountId?: string;
  platform: Platform;
  content: string;
  hashtags: string[];
  imageUrl?: string;
  status: PostStatus;
  scheduledFor?: string;
  publishedAt?: string;
  externalId?: string;
  failureReason?: string;
  createdAt: string;
}

export interface Analytics {
  id: string;
  postId: string;
  reach: number;
  impressions: number;
  clicks: number;
  likes: number;
  engagementRate: number;
  capturedAt: string;
}

export type RecommendationType = 'timing' | 'hashtags' | 'format' | 'topic' | 'frequency';

export interface Recommendation {
  id: string;
  postId: string;
  type: RecommendationType;
  suggestion: string;
  createdAt: string;
}

export interface SeoResult {
  keywords: string[];
  score: number;
  trendingTopics: string[];
}

export interface ContentBrief {
  businessType: string;
  goal: string;
  platform: Platform;
  tone: Tone;
  userId: string;
  /** Publish to a specific connected account (overrides platform). */
  accountId?: string;
  /** Attach an existing media asset instead of generating an image. */
  imageUrl?: string;
  /** ISO timestamp to schedule for later. Omit to publish immediately. */
  scheduledFor?: string;
}

/** A client's social account that the agent can automate. */
export interface ConnectedAccount {
  id: string;
  userId: string;
  platform: Platform;
  handle: string;
  label: string;
  active: boolean;
  /** Raw token kept server-side; never serialized to clients. */
  accessToken: string;
  createdAt: string;
}

/** Public view of an account — token redacted. */
export interface AccountView {
  id: string;
  platform: Platform;
  handle: string;
  label: string;
  active: boolean;
  connected: boolean;
  tokenMasked: string;
  createdAt: string;
}

// ---- AI provider integrations (bring-your-own API keys) ----

export type IntegrationKind = 'llm';
export type IntegrationProvider = 'anthropic' | 'openai' | 'openai-compatible';

export interface ApiIntegration {
  id: string;
  userId: string;
  kind: IntegrationKind;
  provider: IntegrationProvider;
  label: string;
  model?: string;
  /** For openai-compatible providers (Groq, OpenRouter, Gemini, Mistral, …). */
  baseUrl?: string;
  /** Encrypted API key (never returned to clients). */
  secretEnc: string;
  active: boolean;
  createdAt: string;
}

/** Public view — secret replaced with a mask. */
export interface IntegrationView {
  id: string;
  kind: IntegrationKind;
  provider: IntegrationProvider;
  label: string;
  model?: string;
  baseUrl?: string;
  active: boolean;
  keyMasked: string;
  createdAt: string;
}

/** Resolved provider config the LLM service uses to make a real call. */
export interface ResolvedLlm {
  provider: IntegrationProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export type MediaSource = 'upload' | 'generated';

export interface MediaAsset {
  id: string;
  userId: string;
  url: string;
  /** Disk path for uploads (absent for remote/generated URLs). */
  filePath?: string;
  source: MediaSource;
  mimeType: string;
  sizeBytes: number;
  prompt?: string | null;
  createdAt: string;
}

export interface TrendIdea {
  source: 'google-trends' | 'reddit' | 'news' | 'social';
  topic: string;
  score: number;
  suggestedAngle: string;
}

export interface AgentRunRecord {
  agent: string;
  ms: number;
  summary: string;
}
