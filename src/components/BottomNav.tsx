import { BarChart3, Home, List, PlusCircle, Settings } from 'lucide-react';
import { APP_DISPLAY_NAME } from '../lib/constants';
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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-[0_-8px_24px_rgba(15,42,68,0.08)] backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-72 lg:border-r lg:border-t-0 lg:px-5 lg:py-6 lg:shadow-[8px_0_28px_rgba(15,42,68,0.07)]">
      <div className="mb-8 hidden lg:block">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-navy shadow-soft">
          <img src="/icons/icon-192.png" alt="" className="h-full w-full object-cover" />
        </div>
        <p className="mt-4 text-xl font-black tracking-normal text-ink">{APP_DISPLAY_NAME}</p>
        <p className="mt-1 text-sm font-bold text-slate-500">공동 가계부</p>
      </div>

      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 lg:mx-0 lg:max-w-none lg:grid-cols-1 lg:gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.screen === active;
          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => onChange(item.screen)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base lg:font-black ${
                selected ? 'bg-skywash text-navy' : 'text-slate-500 active:bg-slate-100 lg:hover:bg-slate-50'
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
