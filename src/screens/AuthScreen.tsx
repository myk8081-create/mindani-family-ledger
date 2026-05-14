import { LockKeyhole, Mail, WalletCards } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { APP_DISPLAY_NAME } from '../lib/constants';

interface AuthScreenProps {
  hasConfig: boolean;
  authError: string | null;
  onSignIn: (email: string, password: string) => Promise<{ error: Error | null } | { error: unknown }>;
  onSignUp: (email: string, password: string) => Promise<{ error: Error | null } | { error: unknown }>;
}

export function AuthScreen({ hasConfig, authError, onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(authError);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = mode === 'login' ? await onSignIn(normalizedEmail, password) : await onSignUp(normalizedEmail, password);
    const resultError = result.error instanceof Error ? result.error.message : null;
    if (resultError) {
      setError(resultError);
    } else if (mode === 'signup') {
      setMessage('회원가입이 완료되었습니다. 로그인 후 가족 설정을 진행해 주세요.');
      setMode('login');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_right,#d9ecff_0,#f8fbff_34%,#f6f8fb_100%)] px-5 py-8 text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center">
        <div className="mb-8">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-navy text-white shadow-soft">
            <WalletCards className="h-9 w-9" aria-hidden />
          </div>
          <h1 className="text-3xl font-black tracking-normal">{APP_DISPLAY_NAME}</h1>
          <p className="mt-2 text-base font-semibold text-slate-600">민다니와 찌미찌미의 공동 가계부</p>
        </div>

        <section className="rounded-lg border border-white bg-white/90 p-5 shadow-soft backdrop-blur">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`h-12 rounded-lg font-black ${mode === 'login' ? 'bg-white text-navy shadow-sm' : 'text-slate-500'}`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`h-12 rounded-lg font-black ${mode === 'signup' ? 'bg-white text-navy shadow-sm' : 'text-slate-500'}`}
            >
              회원가입
            </button>
          </div>

          {!hasConfig ? (
            <div className="mt-5 rounded-lg bg-warm/10 p-4 text-sm font-bold text-warm">
              Supabase 환경변수를 설정한 뒤 다시 실행해 주세요.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">이메일</span>
              <div className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-ocean focus-within:ring-4 focus-within:ring-blue-100">
                <Mail className="h-5 w-5 text-slate-400" aria-hidden />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
                  autoComplete="email"
                  required
                />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-600">비밀번호</span>
              <div className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-ocean focus-within:ring-4 focus-within:ring-blue-100">
                <LockKeyhole className="h-5 w-5 text-slate-400" aria-hidden />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                />
              </div>
            </label>

            {error ? <p className="rounded-lg bg-warm/10 px-3 py-2 text-sm font-bold text-warm">{error}</p> : null}
            {message ? <p className="rounded-lg bg-mint/10 px-3 py-2 text-sm font-bold text-teal-700">{message}</p> : null}

            <button
              type="submit"
              disabled={!hasConfig || loading}
              className="min-h-14 w-full rounded-lg bg-navy px-4 text-base font-black text-white shadow-soft active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? '처리 중' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
