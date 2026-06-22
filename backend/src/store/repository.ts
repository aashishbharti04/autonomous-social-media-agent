import { v4 as uuid } from 'uuid';
import type {
  Analytics,
  Post,
  Recommendation,
  SocialAccount,
  User,
} from '../types.js';

/**
 * In-memory data store. Mirrors the PostgreSQL schema in `db/schema.sql`.
 * Swap this for a Postgres-backed implementation (same method surface) by
 * setting DB_PROVIDER=postgres — the agents only depend on these methods.
 */
class Repository {
  private users = new Map<string, User>();
  private accounts = new Map<string, SocialAccount>();
  private posts = new Map<string, Post>();
  private analytics = new Map<string, Analytics>();
  private recommendations = new Map<string, Recommendation>();

  constructor() {
    this.seed();
  }

  // ---- Users ----
  getDefaultUser(): User {
    return [...this.users.values()][0];
  }

  listUsers(): User[] {
    return [...this.users.values()];
  }

  // ---- Social accounts ----
  listAccounts(userId: string): SocialAccount[] {
    return [...this.accounts.values()].filter((a) => a.userId === userId);
  }

  // ---- Posts ----
  createPost(data: Omit<Post, 'id' | 'createdAt'>): Post {
    const post: Post = { ...data, id: uuid(), createdAt: new Date().toISOString() };
    this.posts.set(post.id, post);
    return post;
  }

  updatePost(id: string, patch: Partial<Post>): Post | undefined {
    const existing = this.posts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.posts.set(id, updated);
    return updated;
  }

  getPost(id: string): Post | undefined {
    return this.posts.get(id);
  }

  listPosts(): Post[] {
    return [...this.posts.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  // ---- Analytics ----
  setAnalytics(data: Omit<Analytics, 'id' | 'capturedAt'>): Analytics {
    const record: Analytics = {
      ...data,
      id: uuid(),
      capturedAt: new Date().toISOString(),
    };
    this.analytics.set(record.postId, record);
    return record;
  }

  getAnalytics(postId: string): Analytics | undefined {
    return this.analytics.get(postId);
  }

  listAnalytics(): Analytics[] {
    return [...this.analytics.values()];
  }

  // ---- Recommendations ----
  addRecommendations(items: Omit<Recommendation, 'id' | 'createdAt'>[]): Recommendation[] {
    return items.map((item) => {
      const rec: Recommendation = {
        ...item,
        id: uuid(),
        createdAt: new Date().toISOString(),
      };
      this.recommendations.set(rec.id, rec);
      return rec;
    });
  }

  listRecommendations(postId?: string): Recommendation[] {
    const all = [...this.recommendations.values()];
    return (postId ? all.filter((r) => r.postId === postId) : all).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  // ---- Seed demo data so the dashboard isn't empty on first boot ----
  private seed(): void {
    const user: User = {
      id: uuid(),
      name: 'Demo Business',
      email: 'owner@demo-clinic.com',
      plan: 'pro',
    };
    this.users.set(user.id, user);

    for (const platform of ['linkedin', 'instagram', 'facebook', 'twitter'] as const) {
      const acc: SocialAccount = {
        id: uuid(),
        userId: user.id,
        platform,
        accessTokenMasked: '••••••••' + platform.slice(0, 3),
      };
      this.accounts.set(acc.id, acc);
    }
  }
}

export const repo = new Repository();
