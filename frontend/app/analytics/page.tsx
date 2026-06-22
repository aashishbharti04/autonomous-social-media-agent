'use client';

import { getAnalyticsSummary } from '@/lib/api';
import { useAsync } from '../components/useAsync';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import ComparisonBars from '../components/ComparisonBars';
import { formatNumber, formatPercent } from '../components/format';

export default function AnalyticsPage() {
  const { data, loading, error, reload } = useAsync(getAnalyticsSummary, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Analytics</h2>
        <p className="mt-1 text-sm text-slate-400">
          Platform-wide totals, per-platform breakdown and the workflow comparison.
        </p>
      </div>

      {loading && <Spinner label="Loading analytics…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Posts" value={formatNumber(data.totals.posts)} accent="indigo" />
            <StatCard label="Reach" value={formatNumber(data.totals.reach)} accent="sky" />
            <StatCard label="Impressions" value={formatNumber(data.totals.impressions)} />
            <StatCard label="Clicks" value={formatNumber(data.totals.clicks)} accent="amber" />
            <StatCard
              label="Avg Engagement"
              value={formatPercent(data.totals.avgEngagementRate)}
              accent="emerald"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="By Platform">
              {data.byPlatform.length === 0 ? (
                <p className="text-sm text-slate-400">No platform data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="pb-2 font-medium">Platform</th>
                        <th className="pb-2 font-medium">Posts</th>
                        <th className="pb-2 text-right font-medium">Avg Engagement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {data.byPlatform.map((row) => (
                        <tr key={row.platform}>
                          <td className="py-2.5 capitalize text-slate-200">{row.platform}</td>
                          <td className="py-2.5 text-slate-300">{formatNumber(row.posts)}</td>
                          <td className="py-2.5 text-right font-medium text-emerald-300">
                            {formatPercent(row.avgEngagementRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card
              title="Manual vs AI vs Autonomous"
              subtitle="Thesis research comparison"
            >
              <ComparisonBars comparison={data.comparison} />
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-800/80">
                    <tr>
                      <td className="py-2 text-slate-300">Manual</td>
                      <td className="py-2 text-right font-medium text-slate-100">
                        {formatPercent(data.comparison.manual)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-300">AI Generated</td>
                      <td className="py-2 text-right font-medium text-slate-100">
                        {formatPercent(data.comparison.aiGenerated)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-300">Autonomous Agent</td>
                      <td className="py-2 text-right font-medium text-brand-300">
                        {formatPercent(data.comparison.autonomousAgent)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
