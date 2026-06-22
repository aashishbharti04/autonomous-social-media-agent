'use client';

import { getPosts } from '@/lib/api';
import { useAsync } from '../components/useAsync';
import Card from '../components/Card';
import Badge, { toneForStatus } from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import { formatNumber, formatPercent, formatDate } from '../components/format';

export default function PostsPage() {
  const { data, loading, error, reload } = useAsync(getPosts, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Posts</h2>
        <p className="mt-1 text-sm text-slate-400">All posts created by the agent, newest first.</p>
      </div>

      {loading && <Spinner label="Loading posts…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <Card>
          <p className="text-sm text-slate-400">
            No posts yet. Head to Compose and run a full campaign to create one.
          </p>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((post) => (
            <article key={post.id} className="card flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="slate">{post.platform}</Badge>
                <Badge tone={toneForStatus(post.status)}>{post.status}</Badge>
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

              <p className="line-clamp-4 text-sm leading-relaxed text-slate-300">{post.content}</p>

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
                {post.createdAt && <span className="ml-auto">{formatDate(post.createdAt)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
