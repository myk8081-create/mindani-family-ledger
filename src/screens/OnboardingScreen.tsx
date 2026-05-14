import { Check, Users } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_INVITE_CODE, FAMILY_AUTHORS, FAMILY_GROUP_NAME } from '../lib/constants';
import type { AuthorName } from '../types';

interface OnboardingScreenProps {
  onClaim: (name: AuthorName) => Promise<void>;
  onSignOut: () => Promise<void> | void;
}

export function OnboardingScreen({ onClaim, onSignOut }: OnboardingScreenProps) {
  const [selected, setSelected] = useState<AuthorName>('민다니');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      await onClaim(selected);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : '가족 그룹에 연결하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-photo-bg min-h-dvh px-5 py-8 text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center">
        <div className="rounded-lg bg-white/80 p-5 shadow-soft backdrop-blur">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-navy text-white shadow-soft">
            <Users className="h-9 w-9" aria-hidden />
          </div>
          <h1 className="text-3xl font-black tracking-normal">{FAMILY_GROUP_NAME}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">초대 코드: {DEFAULT_INVITE_CODE}</p>
        </div>

        <section className="mt-6 rounded-lg border border-white bg-white/90 p-5 shadow-soft backdrop-blur">
          <div className="space-y-2">
            {FAMILY_AUTHORS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                className={`flex min-h-14 w-full items-center justify-between rounded-lg border px-4 text-left font-black ${
                  selected === name ? 'border-ocean bg-skywash text-navy' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span>{name}</span>
                {selected === name ? <Check className="h-5 w-5" aria-hidden /> : null}
              </button>
            ))}
          </div>

          {error ? <p className="mt-4 rounded-lg bg-warm/10 px-3 py-2 text-sm font-bold text-warm">{error}</p> : null}

          <button
            type="button"
            onClick={handleClaim}
            disabled={loading}
            className="mt-5 min-h-14 w-full rounded-lg bg-navy px-4 text-base font-black text-white shadow-soft disabled:opacity-60"
          >
            {loading ? '연결 중' : '가족 그룹 시작'}
          </button>

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 font-black text-slate-600"
          >
            로그아웃
          </button>
        </section>
      </div>
    </main>
  );
}
