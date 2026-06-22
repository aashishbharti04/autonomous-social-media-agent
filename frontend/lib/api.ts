/**
 * Typed fetch helper for the Autonomous Social Media Agent backend.
 * All responses are wrapped: { ok: true, data } | { ok: false, error }.
 * Each exported function maps to a single endpoint in docs/api.md.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:4000';

// ---------------------------------------------------------------------------
// Auth token store (localStorage, SSR-guarded)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'asma_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable — token simply not persisted */
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

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

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled'
  | string;

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
  failureReason?: string;
  error?: string;
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
  scheduled: boolean;
  analytics: Analytics | null;
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
  statusCounts: Record<string, number>;
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

// Optional fields shared by /content/generate and /campaign/run.
export interface ComposeOptions {
  accountId?: string;
  imageUrl?: string;
  // Only honored by /campaign/run — when set, the post is scheduled instead
  // of published immediately. ISO 8601 string.
  scheduledFor?: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Social accounts
// ---------------------------------------------------------------------------

export interface ConnectedAccount {
  id: string;
  platform: Platform;
  handle: string;
  label: string;
  active: boolean;
  connected: boolean;
  tokenMasked: string;
  createdAt: string;
}

export interface ConnectAccountRequest {
  platform: Platform;
  handle: string;
  label: string;
  accessToken?: string;
}

export interface UpdateAccountRequest {
  label?: string;
  handle?: string;
  active?: boolean;
  accessToken?: string;
}

// ---------------------------------------------------------------------------
// Media library
// ---------------------------------------------------------------------------

export type MediaSource = 'upload' | 'generated';

export interface MediaAsset {
  id: string;
  url: string;
  source: MediaSource;
  mimeType: string;
  sizeBytes: number;
  prompt: string | null;
  createdAt: string;
}

export interface GenerateMediaRequest {
  prompt: string;
  businessType?: string;
  platform?: Platform;
}

// ---------------------------------------------------------------------------
// Envelope + core request helper
// ---------------------------------------------------------------------------

type Envelope<T> = { ok: true; data: T } | { ok: false; error: string };

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(
      'Cannot reach the backend. Is it running on ' + API_BASE_URL + '?'
    );
  }

  // 401 → drop the stale token so the auth gate can redirect to /login.
  if (res.status === 401) {
    clearToken();
    let message = 'Your session has expired. Please sign in again.';
    try {
      const body = (await res.json()) as Envelope<T>;
      if (!body.ok && body.error) message = body.error;
    } catch {
      /* keep default message */
    }
    throw new ApiError(message, 401);
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    if (!res.ok) {
      throw new ApiError(`Request failed (${res.status} ${res.statusText})`, res.status);
    }
    throw new ApiError('Received an invalid response from the backend.', res.status);
  }

  if (!body.ok) {
    throw new ApiError(body.error || `Request failed (${res.status})`, res.status);
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

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function register(body: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function login(body: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getMe(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>('/api/auth/me');
}

export function getAgents(): Promise<Agent[]> {
  return request<Agent[]>('/api/agents');
}

export function generateContent(
  payload: GenerateRequest & ComposeOptions
): Promise<Draft> {
  return request<Draft>('/api/content/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function runCampaign(
  payload: CampaignRequest & ComposeOptions
): Promise<CampaignResult> {
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

export function retryPost(id: string): Promise<Post> {
  return request<Post>(`/api/posts/${encodeURIComponent(id)}/retry`, {
    method: 'POST',
  });
}

export function cancelPost(id: string): Promise<Post> {
  return request<Post>(`/api/posts/${encodeURIComponent(id)}/cancel`, {
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

// ---------------------------------------------------------------------------
// Social accounts
// ---------------------------------------------------------------------------

export function getAccounts(): Promise<ConnectedAccount[]> {
  return request<ConnectedAccount[]>('/api/accounts');
}

export function connectAccount(
  body: ConnectAccountRequest
): Promise<ConnectedAccount> {
  return request<ConnectedAccount>('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateAccount(
  id: string,
  patch: UpdateAccountRequest
): Promise<ConnectedAccount> {
  return request<ConnectedAccount>(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteAccount(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(
    `/api/accounts/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
}

// ---------------------------------------------------------------------------
// Media library
// ---------------------------------------------------------------------------

export function getMedia(): Promise<MediaAsset[]> {
  return request<MediaAsset[]>('/api/media');
}

export function generateMedia(
  body: GenerateMediaRequest
): Promise<MediaAsset> {
  return request<MediaAsset>('/api/media/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteMedia(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(
    `/api/media/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
}

/**
 * Uploads an image as multipart/form-data. We do NOT set Content-Type so the
 * browser can add the multipart boundary; the { ok, data } envelope is still
 * unwrapped and ok:false throws an ApiError, matching request().
 */
// ---------------------------------------------------------------------------
// AI provider integrations (bring-your-own API keys)
// ---------------------------------------------------------------------------

export type IntegrationProvider = 'anthropic' | 'openai' | 'openai-compatible';

export interface Integration {
  id: string;
  kind: 'llm';
  provider: IntegrationProvider;
  label: string;
  model?: string;
  baseUrl?: string;
  active: boolean;
  keyMasked: string;
  createdAt: string;
}

export interface AddIntegrationRequest {
  provider: IntegrationProvider;
  label: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export function getIntegrations(): Promise<Integration[]> {
  return request<Integration[]>('/api/integrations');
}

export function addIntegration(body: AddIntegrationRequest): Promise<Integration> {
  return request<Integration>('/api/integrations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function activateIntegration(id: string): Promise<{ active: string }> {
  return request<{ active: string }>(`/api/integrations/${encodeURIComponent(id)}/activate`, {
    method: 'POST',
  });
}

export function deleteIntegration(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/integrations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function uploadMedia(file: File): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append('file', file);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      // Do NOT set Content-Type — the browser adds the multipart boundary.
      headers: { ...authHeaders() },
      body: formData,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(
      'Cannot reach the backend. Is it running on ' + API_BASE_URL + '?'
    );
  }

  if (res.status === 401) {
    clearToken();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  let body: Envelope<MediaAsset> | null = null;
  try {
    body = (await res.json()) as Envelope<MediaAsset>;
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
