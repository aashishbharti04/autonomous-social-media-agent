'use client';

import { useState } from 'react';
import { searchMemory, ApiError, type MemoryHit } from '@/lib/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import { formatPercent } from '../components/format';

export default function MemoryPage() {
  const [query, setQuery] = useState('dental leads');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<MemoryHit[] | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      setHits(await searchMemory(q, 5));
    } catch (err) {
      setHits(null);
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Memory</h2>
        <p className="mt-1 text-sm text-slate-400">
          Vector similarity search over past posts and engagement — the self-learning loop.
        </p>
      </div>

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onSearch}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memory, e.g. 'dental leads'"
            aria-label="Search memory"
          />
          <button type="submit" className="btn-primary sm:w-40" disabled={loading || !query.trim()}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
      </Card>

      {loading && <Spinner label="Searching vector memory…" />}

      {error && !loading && (
        <Card>
          <p className="text-sm font-medium text-red-300">Search failed</p>
          <p className="mt-1 text-sm text-slate-400">{error}</p>
        </Card>
      )}

      {hits && !loading && hits.length === 0 && (
        <Card>
          <p className="text-sm text-slate-400">No similar memories found for that query.</p>
        </Card>
      )}

      {hits && !loading && hits.length > 0 && (
        <div className="space-y-3">
          {hits.map((hit) => (
            <Card key={hit.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed text-slate-200">{hit.text}</p>
                <Badge tone="green">{formatPercent(hit.score, 0)} match</Badge>
              </div>
              {hit.metadata && Object.keys(hit.metadata).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(hit.metadata).map(([key, value]) => (
                    <Badge key={key} tone="slate">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
