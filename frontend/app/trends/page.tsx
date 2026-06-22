'use client';

import { getTrends } from '@/lib/api';
import { useAsync } from '../components/useAsync';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';

export default function TrendsPage() {
  const { data, loading, error, reload } = useAsync(getTrends, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Trends</h2>
        <p className="mt-1 text-sm text-slate-400">
          Trend Detection Engine output with suggested content angles.
        </p>
      </div>

      {loading && <Spinner label="Detecting trends…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <Card>
          <p className="text-sm text-slate-400">No trends detected right now.</p>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((trend, i) => {
            const pct = Math.round(Math.min(Math.max(trend.score, 0), 1) * 100);
            return (
              <Card key={`${trend.topic}-${i}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-100">{trend.topic}</h3>
                  <Badge tone="indigo">{trend.source}</Badge>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Trend score</span>
                    <span className="font-medium text-slate-300">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-300">
                  <span className="font-medium text-slate-200">Suggested angle: </span>
                  {trend.suggestedAngle}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
