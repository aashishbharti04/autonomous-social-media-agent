import { v4 as uuid } from 'uuid';
import type {
  Analytics,
  ApiIntegration,
  ConnectedAccount,
  IntegrationKind,
  MediaAsset,
  Post,
  Recommendation,
  User,
} from '../types.js';
import type {
  AddIntegrationInput,
  AddMediaInput,
  AddRecommendationInput,
  CreateAccountInput,
  CreatePostInput,
  CreateUserInput,
  SetAnalyticsInput,
  Store,
} from './store.js';

/**
 * In-memory store. Data lives only for the process lifetime — fine for local
 * development and offline demos. Use DB_PROVIDER=postgres for persistence.
 */
export class MemoryStore implements Store {
  readonly kind = 'memory' as const;
  private users = new Map<string, User>();
  private accounts = new Map<string, ConnectedAccount>();
  private media = new Map<string, MediaAsset>();
  private posts = new Map<string, Post>();
  private analytics = new Map<string, Analytics>();
  private recommendations = new Map<string, Recommendation>();
  private integrations = new Map<string, ApiIntegration>();

  async init(): Promise<void> {
    /* nothing to set up */
  }

  // ---- Users ----
  async createUser(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: uuid(),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      plan: 'free',
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return [...this.users.values()].find((u) => u.email === email.toLowerCase());
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async setEmailVerified(userId: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.emailVerified = true;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.passwordHash = passwordHash;
  }

  // ---- Accounts ----
  async listAccounts(userId: string): Promise<ConnectedAccount[]> {
    return [...this.accounts.values()]
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAccount(userId: string, id: string): Promise<ConnectedAccount | undefined> {
    const a = this.accounts.get(id);
    return a && a.userId === userId ? a : undefined;
  }

  async createAccount(input: CreateAccountInput): Promise<ConnectedAccount> {
    const account: ConnectedAccount = {
      id: uuid(),
      userId: input.userId,
      platform: input.platform,
      handle: input.handle,
      label: input.label,
      active: true,
      accessToken: input.accessToken,
      createdAt: new Date().toISOString(),
    };
    this.accounts.set(account.id, account);
    return account;
  }

  async updateAccount(
    userId: string,
    id: string,
    patch: Partial<Pick<ConnectedAccount, 'label' | 'handle' | 'active' | 'accessToken'>>,
  ): Promise<ConnectedAccount | undefined> {
    const account = await this.getAccount(userId, id);
    if (!account) return undefined;
    Object.assign(account, patch);
    return account;
  }

  async deleteAccount(userId: string, id: string): Promise<boolean> {
    const account = await this.getAccount(userId, id);
    if (!account) return false;
    this.accounts.delete(id);
    return true;
  }

  // ---- Media ----
  async listMedia(userId: string): Promise<MediaAsset[]> {
    return [...this.media.values()]
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getMedia(userId: string, id: string): Promise<MediaAsset | undefined> {
    const m = this.media.get(id);
    return m && m.userId === userId ? m : undefined;
  }

  async addMedia(input: AddMediaInput): Promise<MediaAsset> {
    const asset: MediaAsset = { ...input, id: uuid(), createdAt: new Date().toISOString() };
    this.media.set(asset.id, asset);
    return asset;
  }

  async deleteMedia(userId: string, id: string): Promise<MediaAsset | undefined> {
    const asset = await this.getMedia(userId, id);
    if (!asset) return undefined;
    this.media.delete(id);
    return asset;
  }

  // ---- Posts ----
  async createPost(input: CreatePostInput): Promise<Post> {
    const post: Post = { ...input, id: uuid(), createdAt: new Date().toISOString() };
    this.posts.set(post.id, post);
    return post;
  }

  async updatePost(id: string, patch: Partial<Post>): Promise<Post | undefined> {
    const existing = this.posts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.posts.set(id, updated);
    return updated;
  }

  async getPost(userId: string, id: string): Promise<Post | undefined> {
    const p = this.posts.get(id);
    return p && p.userId === userId ? p : undefined;
  }

  async listPosts(userId: string): Promise<Post[]> {
    return [...this.posts.values()]
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listDuePosts(nowIso: string): Promise<Post[]> {
    return [...this.posts.values()].filter(
      (p) => p.status === 'scheduled' && !!p.scheduledFor && p.scheduledFor <= nowIso,
    );
  }

  // ---- Analytics ----
  async setAnalytics(input: SetAnalyticsInput): Promise<Analytics> {
    const record: Analytics = { ...input, id: uuid(), capturedAt: new Date().toISOString() };
    this.analytics.set(record.postId, record);
    return record;
  }

  async getAnalytics(postId: string): Promise<Analytics | undefined> {
    return this.analytics.get(postId);
  }

  async listAnalytics(userId: string): Promise<Analytics[]> {
    const myPostIds = new Set(
      [...this.posts.values()].filter((p) => p.userId === userId).map((p) => p.id),
    );
    return [...this.analytics.values()].filter((a) => myPostIds.has(a.postId));
  }

  // ---- Recommendations ----
  async addRecommendations(items: AddRecommendationInput[]): Promise<Recommendation[]> {
    return items.map((item) => {
      const rec: Recommendation = { ...item, id: uuid(), createdAt: new Date().toISOString() };
      this.recommendations.set(rec.id, rec);
      return rec;
    });
  }

  async listRecommendations(userId: string, postId?: string): Promise<Recommendation[]> {
    const myPostIds = new Set(
      [...this.posts.values()].filter((p) => p.userId === userId).map((p) => p.id),
    );
    return [...this.recommendations.values()]
      .filter((r) => myPostIds.has(r.postId) && (!postId || r.postId === postId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ---- Integrations ----
  async listIntegrations(userId: string): Promise<ApiIntegration[]> {
    return [...this.integrations.values()]
      .filter((i) => i.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addIntegration(input: AddIntegrationInput): Promise<ApiIntegration> {
    const existing = [...this.integrations.values()].filter(
      (i) => i.userId === input.userId && i.kind === input.kind,
    );
    const integration: ApiIntegration = {
      ...input,
      id: uuid(),
      active: existing.length === 0, // first of its kind becomes active
      createdAt: new Date().toISOString(),
    };
    this.integrations.set(integration.id, integration);
    return integration;
  }

  async deleteIntegration(userId: string, id: string): Promise<boolean> {
    const i = this.integrations.get(id);
    if (!i || i.userId !== userId) return false;
    this.integrations.delete(id);
    // If we removed the active one, promote another of the same kind.
    if (i.active) {
      const sibling = [...this.integrations.values()].find(
        (x) => x.userId === userId && x.kind === i.kind,
      );
      if (sibling) sibling.active = true;
    }
    return true;
  }

  async setActiveIntegration(
    userId: string,
    kind: IntegrationKind,
    id: string,
  ): Promise<boolean> {
    const target = this.integrations.get(id);
    if (!target || target.userId !== userId || target.kind !== kind) return false;
    for (const i of this.integrations.values()) {
      if (i.userId === userId && i.kind === kind) i.active = i.id === id;
    }
    return true;
  }

  async getActiveIntegration(
    userId: string,
    kind: IntegrationKind,
  ): Promise<ApiIntegration | undefined> {
    return [...this.integrations.values()].find(
      (i) => i.userId === userId && i.kind === kind && i.active,
    );
  }
}
