import type { Post } from '../types.js';

export interface PublishResult {
  externalId: string;
  permalink: string;
  live: boolean;
  error?: string;
}

/**
 * Publishing backend. When the target account has an access token AND we have a
 * real implementation for that platform, it posts for real; otherwise it
 * simulates publishing (returns a mock id). A failed real call returns an
 * `error` so the post is marked `failed` (and can be retried) rather than
 * crashing the pipeline.
 *
 * Implemented live: Facebook Page (Graph API). Others fall back to mock until
 * their OAuth apps are wired (see DEPLOY/INTEGRATIONS docs).
 */
export async function publishToPlatform(
  post: Post,
  accessToken?: string,
): Promise<PublishResult> {
  if (post.platform === 'facebook' && accessToken) {
    return publishToFacebook(post, accessToken);
  }
  // Mock publish (no token, or no live implementation for this platform yet).
  const externalId = `mock-${post.platform}-${post.id.slice(0, 8)}`;
  return { externalId, permalink: `https://${post.platform}.example/p/${externalId}`, live: false };
}

/**
 * Post text to a Facebook Page. A Page access token's `me` resolves to the
 * page itself, so we don't need to store the page id separately.
 * Docs: https://developers.facebook.com/docs/pages-api/posts
 */
async function publishToFacebook(post: Post, token: string): Promise<PublishResult> {
  const message = [post.content, post.hashtags.join(' ')].filter(Boolean).join('\n\n');
  try {
    const res = await fetch('https://graph.facebook.com/v21.0/me/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, access_token: token }),
    });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || json.error) {
      return {
        externalId: '',
        permalink: '',
        live: false,
        error: json.error?.message || `Facebook API ${res.status}`,
      };
    }
    const id = json.id ?? '';
    return { externalId: id, permalink: `https://facebook.com/${id}`, live: true };
  } catch (err) {
    return { externalId: '', permalink: '', live: false, error: (err as Error).message };
  }
}
