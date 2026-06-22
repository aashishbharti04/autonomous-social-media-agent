'use client';

import { useMemo, useState } from 'react';
import {
  getPosts,
  publishPost,
  retryPost,
  cancelPost,
  ApiError,
  type Post,
} from '@/lib/api';
import { useAsync } from '../components/useAsync';
import Card from '../components/Card';
import Badge from '../components/Badge';
import type { Tone } from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import { formatNumber, formatPercent, formatDate } from '../components/format';

type Filter = 'all' | 'scheduled' | 'published' | 'failed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
  { key: 'failed', label: 'Failed' },
];

/** Maps the full post-status union to a badge tone + human label. */
function statusBadge(status: string): { tone: Tone; label: string } {
  switch (status) {
    case 'scheduled':
      return { tone: 'amber', label: 'waiting' };
    case 'publishing':
      return { tone: 'blue', label: 'publishing' };
    case 'published':
      return { tone: 'green', label: 'published' };
    case 'failed':
      return { tone: 'red', label: 'failed' };
    case 'cancelled':
      return { tone: 'slate', label: 'cancelled' };
    case 'draft':
      return { tone: 'slate', label: 'draft' };
    default:
      return { tone: 'slate', label: status };
  }
}

function matchesFilter(post: Post, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'scheduled':
      return post.status === 'scheduled';
    case 'published':
      // publishing is grouped under Published as an in-flight state.
      return post.status === 'published' || post.status === 'publishing';
    case 'failed':
      return post.status === 'failed';
    default:
      return true;
  }
}

export default function PostsPage() {
  const { data, loading, error, reload } = useAsync(getPosts, []);
  const [filter, setFilter] = useState<Filter>('all');
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base: Record<Filter, number> = { all: 0, scheduled: 0, published: 0, failed: 0 };
    if (!data) return base;
    for (const f of FILTERS) {
      base[f.key] = data.filter((p) => matchesFilter(p, f.key)).length;
    }
    return base;
  }, [data]);

  const visible = useMemo(
    () => (data ? data.filter((p) => matchesFilter(p, filter)) : []),
    [data, filter]
  );

  async function runAction(
    id: string,
    fn: (id: string) => Promise<Post>
  ): Promise<void> {
    setActingId(id);
    setActionError(null);
    try {
      await fn(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setActingId(null);
    }
  }

  function handlePublish(id: string) {
    runAction(id, publishPost);
  }

  function handleRetry(id: string) {
    runAction(id, retryPost);
  }

  function handleCancel(id: string) {
    if (!window.confirm('Cancel this scheduled post? This cannot be undone.')) return;
    runAction(id, cancelPost);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Posts</h2>
        <p className="mt-1 text-sm text-slate-400">
          Manage the post lifecycle: scheduled, publishing, published and failed.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-600/20 text-brand-200 ring-1 ring-inset ring-brand-500/40'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              {f.label}
              <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {actionError && <ErrorState message={actionError} />}

      {loading && <Spinner label="Loading posts…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <Card>
          <p className="text-sm text-slate-400">
            No posts yet. Head to Compose and run a full campaign to create one.
          </p>
        </Card>
      )}

      {data && data.length > 0 && visible.length === 0 && (
        <Card>
          <p className="text-sm text-slate-400">No posts match this filter.</p>
        </Card>
      )}

      {visible.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map((post) => {
            const badge = statusBadge(post.status);
            const busy = actingId === post.id;
            const reason = post.failureReason || post.error;
            return (
              <article key={post.id} className="card flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="slate">{post.platform}</Badge>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </div>

                {post.imageUrl && (
                  <div className="overflow-hidden rounded-lg border border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.imageUrl}
                      alt="Post visual"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                )}

                <p className="line-clamp-4 text-sm leading-relaxed text-slate-300">
                  {post.content}
                </p>

                {/* Scheduled time */}
                {post.status === 'scheduled' && post.scheduledFor && (
                  <p className="text-xs text-amber-300">
                    Scheduled for {formatDate(post.scheduledFor)}
                  </p>
                )}

                {/* Failure reason */}
                {post.status === 'failed' && reason && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                    {reason}
                  </p>
                )}

                {/* Lifecycle actions */}
                {post.status === 'scheduled' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      disabled={busy}
                      onClick={() => handlePublish(post.id)}
                    >
                      {busy ? 'Working…' : 'Publish now'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={busy}
                      onClick={() => handleCancel(post.id)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {post.status === 'failed' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      disabled={busy}
                      onClick={() => handleRetry(post.id)}
                    >
                      {busy ? 'Working…' : 'Retry'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={busy}
                      onClick={() => handlePublish(post.id)}
                    >
                      Publish now
                    </button>
                  </div>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800/80 pt-3 text-xs text-slate-500">
                  {post.analytics && (
                    <>
                      <span>Reach {formatNumber(post.analytics.reach)}</span>
                      <span>Clicks {formatNumber(post.analytics.clicks)}</span>
                      <span className="text-emerald-300">
                        {formatPercent(post.analytics.engagementRate)} engagement
                      </span>
                    </>
                  )}
                  {post.publishedAt ? (
                    <span className="ml-auto">Published {formatDate(post.publishedAt)}</span>
                  ) : post.createdAt ? (
                    <span className="ml-auto">{formatDate(post.createdAt)}</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
