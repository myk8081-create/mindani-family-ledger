import { CheckCircle2, Cloud, RefreshCw, WifiOff } from 'lucide-react';
import type { SyncStatus } from '../types';

interface SyncBadgeProps {
  status: SyncStatus;
  queueCount: number;
}

export function SyncBadge({ status, queueCount }: SyncBadgeProps) {
  const content =
    status === 'offline'
      ? { icon: WifiOff, label: queueCount > 0 ? `오프라인 ${queueCount}` : '오프라인', className: 'bg-warm/10 text-warm' }
      : status === 'syncing'
        ? { icon: RefreshCw, label: '동기화', className: 'bg-honey/15 text-amber-700' }
        : { icon: CheckCircle2, label: '온라인', className: 'bg-mint/10 text-teal-700' };

  const Icon = content.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${content.className}`}>
      {status === 'syncing' ? <Cloud className="h-3.5 w-3.5" aria-hidden /> : <Icon className="h-3.5 w-3.5" aria-hidden />}
      <span>{content.label}</span>
    </div>
  );
}
