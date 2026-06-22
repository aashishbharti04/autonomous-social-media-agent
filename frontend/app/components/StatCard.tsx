import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'indigo' | 'emerald' | 'sky' | 'amber' | 'slate';
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  indigo: 'text-brand-300',
  emerald: 'text-emerald-300',
  sky: 'text-sky-300',
  amber: 'text-amber-300',
  slate: 'text-slate-100',
};

export default function StatCard({ label, value, hint, accent = 'slate' }: StatCardProps) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${accentMap[accent]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
