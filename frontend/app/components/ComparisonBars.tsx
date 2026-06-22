import { formatPercent } from './format';

interface ComparisonBarsProps {
  comparison: {
    manual: number;
    aiGenerated: number;
    autonomousAgent: number;
  };
}

const ROWS: { key: keyof ComparisonBarsProps['comparison']; label: string; color: string }[] = [
  { key: 'manual', label: 'Manual', color: 'bg-slate-500' },
  { key: 'aiGenerated', label: 'AI Generated', color: 'bg-sky-500' },
  { key: 'autonomousAgent', label: 'Autonomous Agent', color: 'bg-brand-500' },
];

export default function ComparisonBars({ comparison }: ComparisonBarsProps) {
  const max = Math.max(comparison.manual, comparison.aiGenerated, comparison.autonomousAgent, 0.0001);

  return (
    <div className="space-y-4">
      {ROWS.map((row) => {
        const value = comparison[row.key];
        const width = Math.max(2, (value / max) * 100);
        return (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-300">{row.label}</span>
              <span className="font-medium text-slate-100">{formatPercent(value)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${row.color} transition-all`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-xs text-slate-500">Average engagement rate by workflow.</p>
    </div>
  );
}
