import type {
  Analytics,
  ConnectedAccount,
  MediaAsset,
  Post,
  Recommendation,
  User,
} from '../types.js';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export interface CreateAccountInput {
  userId: string;
  platform: ConnectedAccount['platform'];
  handle: string;
  label: string;
  accessToken: string;
}

export type AddMediaInput = Omit<MediaAsset, 'id' | 'createdAt'>;
export type CreatePostInput = Omit<Post, 'id' | 'createdAt'>;
export type SetAnalyticsInput = Omit<Analytics, 'id' | 'capturedAt'>;
export type AddRecommendationInput = Omit<Recommendation, 'id' | 'createdAt'>;

/**
 * Persistence abstraction. Two implementations exist behind it — an in-memory
 * store (default, for local/offline) and a PostgreSQL store (DB_PROVIDER=postgres).
 * Everything except `users` is scoped by userId so each account sees only its own data.
 */
export interface Store {
  /** Which backend is active — surfaced at /api/health for observability. */
  readonly kind: 'memory' | 'postgres';
  init(): Promise<void>;

  // Users
  createUser(input: CreateUserInput): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;

  // Connected accounts
  listAccounts(userId: string): Promise<ConnectedAccount[]>;
  getAccount(userId: string, id: string): Promise<ConnectedAccount | undefined>;
  createAccount(input: CreateAccountInput): Promise<ConnectedAccount>;
  updateAccount(
    userId: string,
    id: string,
    patch: Partial<Pick<ConnectedAccount, 'label' | 'handle' | 'active' | 'accessToken'>>,
  ): Promise<ConnectedAccount | undefined>;
  deleteAccount(userId: string, id: string): Promise<boolean>;

  // Media
  listMedia(userId: string): Promise<MediaAsset[]>;
  getMedia(userId: string, id: string): Promise<MediaAsset | undefined>;
  addMedia(input: AddMediaInput): Promise<MediaAsset>;
  deleteMedia(userId: string, id: string): Promise<MediaAsset | undefined>;

  // Posts
  createPost(input: CreatePostInput): Promise<Post>;
  updatePost(id: string, patch: Partial<Post>): Promise<Post | undefined>;
  getPost(userId: string, id: string): Promise<Post | undefined>;
  listPosts(userId: string): Promise<Post[]>;
  /** Scheduled posts whose time has arrived — used by the scheduler. */
  listDuePosts(nowIso: string): Promise<Post[]>;

  // Analytics
  setAnalytics(input: SetAnalyticsInput): Promise<Analytics>;
  getAnalytics(postId: string): Promise<Analytics | undefined>;
  listAnalytics(userId: string): Promise<Analytics[]>;

  // Recommendations
  addRecommendations(items: AddRecommendationInput[]): Promise<Recommendation[]>;
  listRecommendations(userId: string, postId?: string): Promise<Recommendation[]>;
}
