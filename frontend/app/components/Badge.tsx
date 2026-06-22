import { ReactNode } from 'react';

type Tone = 'slate' | 'green' | 'blue' | 'amber' | 'red' | 'indigo';

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const toneMap: Record<Tone, string> = {
  slate: 'bg-slate-800 text-slate-300 border-slate-700',
  green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  blue: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  red: 'bg-red-500/10 text-red-300 border-red-500/30',
  indigo: 'bg-brand-500/10 text-brand-300 border-brand-500/30',
};

/** Maps common status/platform strings to a sensible tone. */
export function toneForStatus(status: string): Tone {
  switch (status.toLowerCase()) {
    case 'published':
    case 'up':
    case 'idle':
      return 'green';
    case 'scheduled':
    case 'running':
      return 'blue';
    case 'draft':
      return 'amber';
    case 'error':
    case 'failed':
      return 'red';
    default:
      return 'slate';
  }
}

export default function Badge({ children, tone = 'slate', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${toneMap[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
