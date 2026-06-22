import pg from 'pg';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import type {
  Analytics,
  ApiIntegration,
  ConnectedAccount,
  IntegrationKind,
  IntegrationProvider,
  MediaAsset,
  Post,
  PostStatus,
  Platform,
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

const iso = (d: Date | null): string | undefined => (d ? d.toISOString() : undefined);

/** PostgreSQL-backed store. Auto-creates its schema on init(). */
export class PostgresStore implements Store {
  readonly kind = 'postgres' as const;
  private pool: pg.Pool;

  constructor() {
    this.pool = new pg.Pool({
      connectionString: config.db.url,
      // Neon / Supabase / Render all require TLS; local Postgres does not.
      ssl: /localhost|127\.0\.0\.1/.test(config.db.url) ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        handle TEXT NOT NULL,
        label TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        access_token TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        file_path TEXT,
        source TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        prompt TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id TEXT,
        platform TEXT NOT NULL,
        content TEXT NOT NULL,
        hashtags TEXT[] NOT NULL DEFAULT '{}',
        image_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        scheduled_for TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        external_id TEXT,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY,
        post_id TEXT UNIQUE NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        reach INTEGER NOT NULL DEFAULT 0,
        impressions INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0,
        engagement_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS recommendations (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        suggestion TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        provider TEXT NOT NULL,
        label TEXT NOT NULL,
        model TEXT,
        base_url TEXT,
        secret_enc TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_media_user ON media(user_id);
      CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);
    `);
  }

  // ---- Users ----
  async createUser(input: CreateUserInput): Promise<User> {
    const id = uuid();
    const { rows } = await this.pool.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, input.name, input.email.toLowerCase(), input.passwordHash],
    );
    return mapUser(rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM users WHERE email=$1`, [
      email.toLowerCase(),
    ]);
    return rows[0] ? mapUser(rows[0]) : undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM users WHERE id=$1`, [id]);
    return rows[0] ? mapUser(rows[0]) : undefined;
  }

  // ---- Accounts ----
  async listAccounts(userId: string): Promise<ConnectedAccount[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM accounts WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(mapAccount);
  }

  async getAccount(userId: string, id: string): Promise<ConnectedAccount | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM accounts WHERE id=$1 AND user_id=$2`,
      [id, userId],
    );
    return rows[0] ? mapAccount(rows[0]) : undefined;
  }

  async createAccount(input: CreateAccountInput): Promise<ConnectedAccount> {
    const id = uuid();
    const { rows } = await this.pool.query(
      `INSERT INTO accounts (id, user_id, platform, handle, label, access_token)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, input.userId, input.platform, input.handle, input.label, input.accessToken],
    );
    return mapAccount(rows[0]);
  }

  async updateAccount(
    userId: string,
    id: string,
    patch: Partial<Pick<ConnectedAccount, 'label' | 'handle' | 'active' | 'accessToken'>>,
  ): Promise<ConnectedAccount | undefined> {
    const { rows } = await this.pool.query(
      `UPDATE accounts SET
         label = COALESCE($3, label),
         handle = COALESCE($4, handle),
         active = COALESCE($5, active),
         access_token = COALESCE($6, access_token)
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, userId, patch.label ?? null, patch.handle ?? null, patch.active ?? null, patch.accessToken ?? null],
    );
    return rows[0] ? mapAccount(rows[0]) : undefined;
  }

  async deleteAccount(userId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM accounts WHERE id=$1 AND user_id=$2`, [
      id,
      userId,
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  // ---- Media ----
  async listMedia(userId: string): Promise<MediaAsset[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM media WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(mapMedia);
  }

  async getMedia(userId: string, id: string): Promise<MediaAsset | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM media WHERE id=$1 AND user_id=$2`, [
      id,
      userId,
    ]);
    return rows[0] ? mapMedia(rows[0]) : undefined;
  }

  async addMedia(input: AddMediaInput): Promise<MediaAsset> {
    const id = uuid();
    const { rows } = await this.pool.query(
      `INSERT INTO media (id, user_id, url, file_path, source, mime_type, size_bytes, prompt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        id,
        input.userId,
        input.url,
        input.filePath ?? null,
        input.source,
        input.mimeType,
        input.sizeBytes,
        input.prompt ?? null,
      ],
    );
    return mapMedia(rows[0]);
  }

  async deleteMedia(userId: string, id: string): Promise<MediaAsset | undefined> {
    const { rows } = await this.pool.query(
      `DELETE FROM media WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, userId],
    );
    return rows[0] ? mapMedia(rows[0]) : undefined;
  }

  // ---- Posts ----
  async createPost(input: CreatePostInput): Promise<Post> {
    const id = uuid();
    const { rows } = await this.pool.query(
      `INSERT INTO posts (id, user_id, account_id, platform, content, hashtags, image_url,
        status, scheduled_for, published_at, external_id, failure_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        id,
        input.userId,
        input.accountId ?? null,
        input.platform,
        input.content,
        input.hashtags,
        input.imageUrl ?? null,
        input.status,
        input.scheduledFor ?? null,
        input.publishedAt ?? null,
        input.externalId ?? null,
        input.failureReason ?? null,
      ],
    );
    return mapPost(rows[0]);
  }

  async updatePost(id: string, patch: Partial<Post>): Promise<Post | undefined> {
    const { rows } = await this.pool.query(
      `UPDATE posts SET
         status = COALESCE($2, status),
         scheduled_for = COALESCE($3, scheduled_for),
         published_at = COALESCE($4, published_at),
         external_id = COALESCE($5, external_id),
         failure_reason = $6,
         image_url = COALESCE($7, image_url)
       WHERE id=$1 RETURNING *`,
      [
        id,
        patch.status ?? null,
        patch.scheduledFor ?? null,
        patch.publishedAt ?? null,
        patch.externalId ?? null,
        patch.failureReason ?? null,
        patch.imageUrl ?? null,
      ],
    );
    return rows[0] ? mapPost(rows[0]) : undefined;
  }

  async getPost(userId: string, id: string): Promise<Post | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM posts WHERE id=$1 AND user_id=$2`, [
      id,
      userId,
    ]);
    return rows[0] ? mapPost(rows[0]) : undefined;
  }

  async listPosts(userId: string): Promise<Post[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM posts WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(mapPost);
  }

  async listDuePosts(nowIso: string): Promise<Post[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM posts WHERE status='scheduled' AND scheduled_for IS NOT NULL AND scheduled_for <= $1`,
      [nowIso],
    );
    return rows.map(mapPost);
  }

  // ---- Analytics ----
  async setAnalytics(input: SetAnalyticsInput): Promise<Analytics> {
    const id = uuid();
    const { rows } = await this.pool.query(
      `INSERT INTO analytics (id, post_id, reach, impressions, clicks, likes, engagement_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (post_id) DO UPDATE SET
         reach=EXCLUDED.reach, impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks,
         likes=EXCLUDED.likes, engagement_rate=EXCLUDED.engagement_rate, captured_at=now()
       RETURNING *`,
      [id, input.postId, input.reach, input.impressions, input.clicks, input.likes, input.engagementRate],
    );
    return mapAnalytics(rows[0]);
  }

  async getAnalytics(postId: string): Promise<Analytics | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM analytics WHERE post_id=$1`, [postId]);
    return rows[0] ? mapAnalytics(rows[0]) : undefined;
  }

  async listAnalytics(userId: string): Promise<Analytics[]> {
    const { rows } = await this.pool.query(
      `SELECT a.* FROM analytics a JOIN posts p ON p.id=a.post_id WHERE p.user_id=$1`,
      [userId],
    );
    return rows.map(mapAnalytics);
  }

  // ---- Recommendations ----
  async addRecommendations(items: AddRecommendationInput[]): Promise<Recommendation[]> {
    const out: Recommendation[] = [];
    for (const item of items) {
      const id = uuid();
      const { rows } = await this.pool.query(
        `INSERT INTO recommendations (id, post_id, type, suggestion) VALUES ($1,$2,$3,$4) RETURNING *`,
        [id, item.postId, item.type, item.suggestion],
      );
      out.push(mapRec(rows[0]));
    }
    return out;
  }

  async listRecommendations(userId: string, postId?: string): Promise<Recommendation[]> {
    const { rows } = await this.pool.query(
      `SELECT r.* FROM recommendations r JOIN posts p ON p.id=r.post_id
       WHERE p.user_id=$1 ${postId ? 'AND r.post_id=$2' : ''} ORDER BY r.created_at DESC`,
      postId ? [userId, postId] : [userId],
    );
    return rows.map(mapRec);
  }

  // ---- Integrations ----
  async listIntegrations(userId: string): Promise<ApiIntegration[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM integrations WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(mapIntegration);
  }

  async addIntegration(input: AddIntegrationInput): Promise<ApiIntegration> {
    const id = uuid();
    const { rows: existing } = await this.pool.query(
      `SELECT 1 FROM integrations WHERE user_id=$1 AND kind=$2 LIMIT 1`,
      [input.userId, input.kind],
    );
    const active = existing.length === 0;
    const { rows } = await this.pool.query(
      `INSERT INTO integrations (id, user_id, kind, provider, label, model, base_url, secret_enc, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        id,
        input.userId,
        input.kind,
        input.provider,
        input.label,
        input.model ?? null,
        input.baseUrl ?? null,
        input.secretEnc,
        active,
      ],
    );
    return mapIntegration(rows[0]);
  }

  async deleteIntegration(userId: string, id: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `DELETE FROM integrations WHERE id=$1 AND user_id=$2 RETURNING kind, active`,
      [id, userId],
    );
    if (!rows[0]) return false;
    if (rows[0].active) {
      // Promote another integration of the same kind to active.
      await this.pool.query(
        `UPDATE integrations SET active=true WHERE id = (
           SELECT id FROM integrations WHERE user_id=$1 AND kind=$2 ORDER BY created_at DESC LIMIT 1
         )`,
        [userId, rows[0].kind],
      );
    }
    return true;
  }

  async setActiveIntegration(
    userId: string,
    kind: IntegrationKind,
    id: string,
  ): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM integrations WHERE id=$1 AND user_id=$2 AND kind=$3`,
      [id, userId, kind],
    );
    if (!rows[0]) return false;
    await this.pool.query(
      `UPDATE integrations SET active = (id = $3) WHERE user_id=$1 AND kind=$2`,
      [userId, kind, id],
    );
    return true;
  }

  async getActiveIntegration(
    userId: string,
    kind: IntegrationKind,
  ): Promise<ApiIntegration | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM integrations WHERE user_id=$1 AND kind=$2 AND active=true LIMIT 1`,
      [userId, kind],
    );
    return rows[0] ? mapIntegration(rows[0]) : undefined;
  }
}

// ---- row mappers (snake_case → camelCase) ----
/* eslint-disable @typescript-eslint/no-explicit-any */
function mapUser(r: any): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    passwordHash: r.password_hash,
    plan: r.plan,
    createdAt: iso(r.created_at)!,
  };
}
function mapAccount(r: any): ConnectedAccount {
  return {
    id: r.id,
    userId: r.user_id,
    platform: r.platform as Platform,
    handle: r.handle,
    label: r.label,
    active: r.active,
    accessToken: r.access_token,
    createdAt: iso(r.created_at)!,
  };
}
function mapMedia(r: any): MediaAsset {
  return {
    id: r.id,
    userId: r.user_id,
    url: r.url,
    filePath: r.file_path ?? undefined,
    source: r.source,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    prompt: r.prompt ?? null,
    createdAt: iso(r.created_at)!,
  };
}
function mapPost(r: any): Post {
  return {
    id: r.id,
    userId: r.user_id,
    accountId: r.account_id ?? undefined,
    platform: r.platform as Platform,
    content: r.content,
    hashtags: r.hashtags ?? [],
    imageUrl: r.image_url ?? undefined,
    status: r.status as PostStatus,
    scheduledFor: iso(r.scheduled_for),
    publishedAt: iso(r.published_at),
    externalId: r.external_id ?? undefined,
    failureReason: r.failure_reason ?? undefined,
    createdAt: iso(r.created_at)!,
  };
}
function mapAnalytics(r: any): Analytics {
  return {
    id: r.id,
    postId: r.post_id,
    reach: r.reach,
    impressions: r.impressions,
    clicks: r.clicks,
    likes: r.likes,
    engagementRate: Number(r.engagement_rate),
    capturedAt: iso(r.captured_at)!,
  };
}
function mapRec(r: any): Recommendation {
  return {
    id: r.id,
    postId: r.post_id,
    type: r.type,
    suggestion: r.suggestion,
    createdAt: iso(r.created_at)!,
  };
}
function mapIntegration(r: any): ApiIntegration {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind as IntegrationKind,
    provider: r.provider as IntegrationProvider,
    label: r.label,
    model: r.model ?? undefined,
    baseUrl: r.base_url ?? undefined,
    secretEnc: r.secret_enc,
    active: r.active,
    createdAt: iso(r.created_at)!,
  };
}
