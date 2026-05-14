import { BarChart3, Home, List, PlusCircle, Settings } from 'lucide-react';
import type { AppScreen } from '../types';

interface BottomNavProps {
  active: AppScreen;
  onChange: (screen: AppScreen) => void;
}

const items: Array<{ screen: AppScreen; label: string; icon: typeof Home }> = [
  { screen: 'home', label: '홈', icon: Home },
  { screen: 'entry', label: '입력', icon: PlusCircle },
  { screen: 'history', label: '내역', icon: List },
  { screen: 'stats', label: '통계', icon: BarChart3 },
  { screen: 'settings', label: '설정', icon: Settings },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-[0_-8px_24px_rgba(15,42,68,0.08)] backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.screen === active;
          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => onChange(item.screen)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition ${
                selected ? 'bg-skywash text-navy' : 'text-slate-500 active:bg-slate-100'
              }`}
              aria-label={item.label}
              title={item.label}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
