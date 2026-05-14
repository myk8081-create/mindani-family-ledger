import type { ReactNode } from 'react';
import { currencyFormatter } from '../lib/constants';

interface StatCardProps {
  label: string;
  value: number;
  tone?: 'blue' | 'warm' | 'mint' | 'plain';
  icon?: ReactNode;
}

const toneClass = {
  blue: 'border-blue-100 bg-white text-ocean',
  warm: 'border-orange-100 bg-white text-warm',
  mint: 'border-teal-100 bg-white text-teal-600',
  plain: 'border-slate-100 bg-white text-navy',
};

export function StatCard({ label, value, tone = 'plain', icon }: StatCardProps) {
  return (
    <div className={`rounded-lg border p-4 shadow-soft ${toneClass[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        {icon ? <div className="text-current">{icon}</div> : null}
      </div>
      <p className="mt-2 break-words text-2xl font-black tracking-normal text-ink">{currencyFormatter.format(value)}</p>
    </div>
  );
}
