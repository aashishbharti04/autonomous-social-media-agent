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

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export type Tone = 'professional' | 'friendly' | 'witty' | 'inspirational' | 'bold';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'business';
}

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
  platform: Platform;
  content: string;
  hashtags: string[];
  imageUrl?: string;
  status: PostStatus;
  scheduledFor?: string;
  publishedAt?: string;
  externalId?: string;
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
  userId?: string;
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
