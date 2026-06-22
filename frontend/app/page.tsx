'use client';

import { getAgents, getAnalyticsSummary } from '@/lib/api';
import { useAsync } from './components/useAsync';
import Card from './components/Card';
import StatCard from './components/StatCard';
import Badge, { toneForStatus } from './components/Badge';
import Spinner from './components/Spinner';
import ErrorState from './components/ErrorState';
import ComparisonBars from './components/ComparisonBars';
import { formatNumber, formatPercent, formatDate } from './components/format';

export default function DashboardPage() {
  const agents = useAsync(getAgents, []);
  const summary = useAsync(getAnalyticsSummary, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">
          Live status of the agent fleet and platform-wide performance.
        </p>
      </div>

      {/* KPIs */}
      <section>
        {summary.loading && <Spinner label="Loading analytics…" />}
        {summary.error && <ErrorState message={summary.error} onRetry={summary.reload} />}
        {summary.data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Posts" value={formatNumber(summary.data.totals.posts)} accent="indigo" />
            <StatCard label="Reach" value={formatNumber(summary.data.totals.reach)} accent="sky" />
            <StatCard
              label="Impressions"
              value={formatNumber(summary.data.totals.impressions)}
              accent="slate"
            />
            <StatCard
              label="Avg Engagement"
              value={formatPercent(summary.data.totals.avgEngagementRate)}
              accent="emerald"
            />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Comparison */}
        <Card title="Manual vs AI vs Autonomous" subtitle="Engagement uplift from autonomy">
          {summary.loading && <Spinner />}
          {summary.error && <ErrorState message={summary.error} onRetry={summary.reload} />}
          {summary.data && <ComparisonBars comparison={summary.data.comparison} />}
        </Card>

        {/* Agent fleet */}
        <Card title="Agent Fleet" subtitle="Last activity per agent" actions={
          <Badge tone="indigo">{agents.data ? `${agents.data.length} agents` : '—'}</Badge>
        }>
          {agents.loading && <Spinner label="Loading agents…" />}
          {agents.error && <ErrorState message={agents.error} onRetry={agents.reload} />}
          {agents.data && (
            <ul className="divide-y divide-slate-800/80">
              {agents.data.map((agent) => (
                <li key={agent.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{agent.name}</p>
                    <p className="text-xs text-slate-500">
                      {agent.runs} runs
                      {agent.lastRunAt ? ` · last ${formatDate(agent.lastRunAt)}` : ''}
                    </p>
                  </div>
                  <Badge tone={toneForStatus(agent.status)}>{agent.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
