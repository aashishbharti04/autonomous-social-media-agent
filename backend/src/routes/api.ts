import { Router } from 'express';
import { z } from 'zod';
import { appMode } from '../config.js';
import { requireAuth } from '../auth/middleware.js';
import { store } from '../db/index.js';
import { memory } from '../memory/vector-memory.js';
import { orchestrator } from '../orchestrator/orchestrator.js';
import { buildPlaceholderSvg } from '../services/image.js';
import { detectTrends } from '../services/trends.js';
import { authRouter } from './auth.js';
import { accountsRouter } from './accounts.js';
import { mediaRouter } from './media.js';
import { PLATFORMS, type ContentBrief } from '../types.js';

export const api = Router();
const startedAt = Date.now();

// ---- Sub-resources ----
api.use('/auth', authRouter); // public (register/login)
api.use('/accounts', accountsRouter); // self-applies requireAuth
api.use('/media', mediaRouter); // self-applies requireAuth

// ---- Public: health & meta ----
api.get('/health', (_req, res) => {
  res.json({
    ok: true,
    data: { status: 'up', mode: appMode(), db: store.kind, uptimeMs: Date.now() - startedAt },
  });
});

api.get('/agents', (_req, res) => {
  res.json({ ok: true, data: orchestrator.listAgents() });
});

api.get('/trends', (_req, res) => {
  res.json({ ok: true, data: detectTrends() });
});

// Public so <img> tags can load it (no auth header on image requests).
api.get('/image/placeholder', (req, res) => {
  const svg = buildPlaceholderSvg({
    title: String(req.query.title ?? 'Brand'),
    subtitle: String(req.query.subtitle ?? ''),
    badge: String(req.query.badge ?? ''),
    seed: String(req.query.seed ?? req.query.title ?? 'seed'),
  });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// ---- Everything below requires authentication ----
api.use(requireAuth);

const briefSchema = z.object({
  businessType: z.string().min(2),
  goal: z.string().min(2),
  platform: z.enum(PLATFORMS as [string, ...string[]]),
  tone: z
    .enum(['professional', 'friendly', 'witty', 'inspirational', 'bold'])
    .default('professional'),
  accountId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  scheduledFor: z.string().datetime().optional(),
});

async function toBrief(
  body: z.infer<typeof briefSchema>,
  userId: string,
): Promise<ContentBrief> {
  const brief = { ...body, userId } as ContentBrief;
  if (body.accountId) {
    const account = await store.getAccount(userId, body.accountId);
    if (!account) throw new Error('Connected account not found');
    if (!account.active) throw new Error('That account is paused — reactivate it first');
    brief.platform = account.platform;
  }
  return brief;
}

// ---- Content / campaigns ----
api.post('/content/generate', async (req, res, next) => {
  try {
    const brief = await toBrief(briefSchema.parse(req.body), req.userId!);
    res.json({ ok: true, data: await orchestrator.generateDraft(brief) });
  } catch (err) {
    next(err);
  }
});

api.post('/campaign/run', async (req, res, next) => {
  try {
    const brief = await toBrief(briefSchema.parse(req.body), req.userId!);
    res.json({ ok: true, data: await orchestrator.runCampaign(brief) });
  } catch (err) {
    next(err);
  }
});

// ---- Posts ----
api.get('/posts', async (req, res, next) => {
  try {
    const posts = await store.listPosts(req.userId!);
    const data = await Promise.all(
      posts.map(async (p) => ({ ...p, analytics: (await store.getAnalytics(p.id)) ?? null })),
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

api.get('/posts/:id', async (req, res, next) => {
  try {
    const post = await store.getPost(req.userId!, req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: 'Post not found' });
    res.json({
      ok: true,
      data: {
        ...post,
        analytics: (await store.getAnalytics(post.id)) ?? null,
        recommendations: await store.listRecommendations(req.userId!, post.id),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Publish a scheduled/failed post right now.
api.post('/posts/:id/publish', async (req, res, next) => {
  try {
    const post = await store.getPost(req.userId!, req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: 'Post not found' });
    if (post.status === 'published') {
      return res.status(400).json({ ok: false, error: 'Post is already published' });
    }
    const updated = await orchestrator.finalizeScheduledPost(post);
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Retry a failed post.
api.post('/posts/:id/retry', async (req, res, next) => {
  try {
    const post = await store.getPost(req.userId!, req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: 'Post not found' });
    if (post.status !== 'failed') {
      return res.status(400).json({ ok: false, error: 'Only failed posts can be retried' });
    }
    const updated = await orchestrator.finalizeScheduledPost(post);
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Cancel a scheduled (waiting) post.
api.post('/posts/:id/cancel', async (req, res, next) => {
  try {
    const post = await store.getPost(req.userId!, req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: 'Post not found' });
    if (post.status !== 'scheduled') {
      return res.status(400).json({ ok: false, error: 'Only scheduled posts can be cancelled' });
    }
    const updated = await store.updatePost(post.id, { status: 'cancelled' });
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ---- Analytics summary ----
api.get('/analytics/summary', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const posts = await store.listPosts(userId);
    const all = await store.listAnalytics(userId);
    const sum = (sel: (a: (typeof all)[number]) => number) => all.reduce((s, a) => s + sel(a), 0);
    const avgEngagement = all.length
      ? Number((sum((a) => a.engagementRate) / all.length).toFixed(4))
      : 0;

    const byPlatform = PLATFORMS.map((platform) => {
      const ids = new Set(posts.filter((p) => p.platform === platform).map((p) => p.id));
      const rows = all.filter((a) => ids.has(a.postId));
      return {
        platform,
        posts: ids.size,
        avgEngagementRate: rows.length
          ? Number((rows.reduce((s, a) => s + a.engagementRate, 0) / rows.length).toFixed(4))
          : 0,
      };
    }).filter((p) => p.posts > 0);

    const counts = posts.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      ok: true,
      data: {
        totals: {
          posts: posts.length,
          reach: sum((a) => a.reach),
          impressions: sum((a) => a.impressions),
          clicks: sum((a) => a.clicks),
          avgEngagementRate: avgEngagement,
        },
        statusCounts: counts,
        byPlatform,
        comparison: { manual: 0.018, aiGenerated: 0.034, autonomousAgent: avgEngagement || 0.058 },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---- Recommendations ----
api.get('/recommendations', async (req, res, next) => {
  try {
    res.json({ ok: true, data: await store.listRecommendations(req.userId!) });
  } catch (err) {
    next(err);
  }
});

// ---- Memory (RAG), scoped to the user ----
api.get('/memory/search', (req, res) => {
  const q = String(req.query.q ?? '');
  const k = Number(req.query.k ?? 5);
  if (!q) return res.status(400).json({ ok: false, error: 'Query param `q` is required' });
  const hits = memory.search(q, Number.isFinite(k) ? k : 5, (m) => m.userId === req.userId);
  res.json({ ok: true, data: hits });
});
