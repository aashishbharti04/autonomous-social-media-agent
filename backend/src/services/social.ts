import { config } from '../config.js';
import type { Platform, Post } from '../types.js';

export interface PublishResult {
  externalId: string;
  permalink: string;
  live: boolean;
}

/**
 * Publishing backend. With no social tokens configured it returns a mock
 * external id (the post is marked published locally but nothing is sent to a
 * real network). Wire each platform's Graph/REST API here for live posting.
 */
export async function publishToPlatform(post: Post): Promise<PublishResult> {
  const token = tokenFor(post.platform);

  if (token) {
    // Integration point: call the platform API with `token`.
    // e.g. LinkedIn UGC Posts, Facebook/Instagram Graph API, X v2 tweets.
    // Falls through to mock until implemented.
  }

  const externalId = `mock-${post.platform}-${post.id.slice(0, 8)}`;
  return {
    externalId,
    permalink: `https://${post.platform}.example/p/${externalId}`,
    live: false,
  };
}

function tokenFor(platform: Platform): string {
  switch (platform) {
    case 'linkedin':
      return config.social.linkedin;
    case 'facebook':
      return config.social.facebook;
    case 'instagram':
      return config.social.instagram;
    case 'twitter':
      return config.social.twitter;
    default:
      return '';
  }
}
