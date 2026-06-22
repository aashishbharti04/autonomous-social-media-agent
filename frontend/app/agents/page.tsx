'use client';

import { getAgents } from '@/lib/api';
import { useAsync } from '../components/useAsync';
import Card from '../components/Card';
import Badge, { toneForStatus } from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import { formatNumber, formatDate } from '../components/format';

export default function AgentsPage() {
  const { data, loading, error, reload } = useAsync(getAgents, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Agents</h2>
        <p className="mt-1 text-sm text-slate-400">
          The registered agents in the orchestration pipeline and their activity.
        </p>
      </div>

      {loading && <Spinner label="Loading agents…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((agent) => (
            <Card key={agent.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">{agent.name}</h3>
                  <p className="text-xs text-slate-500">{agent.id}</p>
                </div>
                <Badge tone={toneForStatus(agent.status)}>{agent.status}</Badge>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Runs</dt>
                  <dd className="mt-0.5 text-lg font-semibold text-slate-100">
                    {formatNumber(agent.runs)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Last run</dt>
                  <dd className="mt-0.5 text-sm text-slate-300">{formatDate(agent.lastRunAt)}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
