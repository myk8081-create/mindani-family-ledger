import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-skywash text-navy">{icon}</div>
      <p className="mt-4 font-black text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm">{description}</p> : null}
    </div>
  );
}
