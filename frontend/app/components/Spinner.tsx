interface SpinnerProps {
  label?: string;
  className?: string;
}

export default function Spinner({ label = 'Loading…', className = '' }: SpinnerProps) {
  return (
    <div className={`flex items-center gap-3 text-sm text-slate-400 ${className}`}>
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
