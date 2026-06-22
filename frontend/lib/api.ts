/**
 * Typed fetch helper for the Autonomous Social Media Agent backend.
 * All responses are wrapped: { ok: true, data } | { ok: false, error }.
 * Each exported function maps to a single endpoint in docs/api.md.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:4000';

// ---------------------------------------------------------------------------
// Shared domain types (match docs/api.md)
// ---------------------------------------------------------------------------

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

export type AgentStatus = 'idle' | 'running' | 'error' | string;

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  runs: number;
  lastRunAt?: string;
}

export interface Health {
  status: string;
  mode: string;
  uptimeMs: number;
}

export interface Seo {
  keywords: string[];
  score: number;
  trendingTopics?: string[];
}

export interface Draft {
  content: string;
  hashtags: string[];
  imageUrl: string;
  seo: Seo;
}

export interface Analytics {
  reach: number;
  impressions: number;
  clicks: number;
  likes?: number;
  engagementRate: number;
}

export type PostStatus = 'draft' | 'scheduled' | 'published' | string;

export interface Post {
  id: string;
  platform: Platform;
  content: string;
  hashtags?: string[];
  imageUrl?: string;
  status: PostStatus;
  createdAt?: string;
  scheduledFor?: string;
  publishedAt?: string;
  externalId?: string;
  analytics?: Analytics;
}

export type RecommendationType = 'timing' | 'content' | 'hashtag' | string;

export interface Recommendation {
  id: string;
  postId?: string;
  type: RecommendationType;
  suggestion: string;
  createdAt?: string;
}

export interface TimelineStep {
  agent: string;
  ms: number;
  summary: string;
}

export interface CampaignResult {
  post: Post;
  seo: Seo;
  analytics: Analytics;
  recommendations: Recommendation[];
  timeline: TimelineStep[];
}

export interface PlatformBreakdown {
  platform: Platform;
  posts: number;
  avgEngagementRate: number;
}

export interface AnalyticsSummary {
  totals: {
    posts: number;
    reach: number;
    impressions: number;
    clicks: number;
    avgEngagementRate: number;
  };
  byPlatform: PlatformBreakdown[];
  comparison: {
    manual: number;
    aiGenerated: number;
    autonomousAgent: number;
  };
}

export interface Trend {
  source: string;
  topic: string;
  score: number;
  suggestedAngle: string;
}

export interface MemoryHit {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface GenerateRequest {
  businessType: string;
  goal: string;
  platform: Platform;
  tone: string;
}

export interface CampaignRequest extends GenerateRequest {
  userId?: string;
}

// ---------------------------------------------------------------------------
// Envelope + core request helper
// ---------------------------------------------------------------------------

type Envelope<T> = { ok: true; data: T } | { ok: false; error: string };

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(
      'Cannot reach the backend. Is it running on ' + API_BASE_URL + '?'
    );
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    if (!res.ok) {
      throw new ApiError(`Request failed (${res.status} ${res.statusText})`);
    }
    throw new ApiError('Received an invalid response from the backend.');
  }

  if (!body.ok) {
    throw new ApiError(body.error || `Request failed (${res.status})`);
  }
  return body.data;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// Endpoint functions (one per route in docs/api.md)
// ---------------------------------------------------------------------------

export function getHealth(): Promise<Health> {
  return request<Health>('/api/health');
}

export function getAgents(): Promise<Agent[]> {
  return request<Agent[]>('/api/agents');
}

export function generateContent(payload: GenerateRequest): Promise<Draft> {
  return request<Draft>('/api/content/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function runCampaign(payload: CampaignRequest): Promise<CampaignResult> {
  return request<CampaignResult>('/api/campaign/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPosts(): Promise<Post[]> {
  return request<Post[]>('/api/posts');
}

export function getPost(id: string): Promise<Post> {
  return request<Post>(`/api/posts/${encodeURIComponent(id)}`);
}

export function publishPost(id: string): Promise<Post> {
  return request<Post>(`/api/posts/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
  });
}

export function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>('/api/analytics/summary');
}

export function getRecommendations(): Promise<Recommendation[]> {
  return request<Recommendation[]>('/api/recommendations');
}

export function getTrends(): Promise<Trend[]> {
  return request<Trend[]>('/api/trends');
}

export function searchMemory(q: string, k = 5): Promise<MemoryHit[]> {
  return request<MemoryHit[]>(`/api/memory/search${buildQuery({ q, k })}`);
}
