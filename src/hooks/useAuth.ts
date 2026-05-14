import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthError, User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

const messageFromError = (error: AuthError | Error | null) => error?.message ?? null;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setError(messageFromError(sessionError));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase 환경변수가 설정되지 않았습니다.') };
    setError(null);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setError(messageFromError(result.error));
    return result;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase 환경변수가 설정되지 않았습니다.') };
    setError(null);
    const result = await supabase.auth.signUp({ email, password });
    setError(messageFromError(result.error));
    return result;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return useMemo(
    () => ({
      user,
      loading,
      error,
      hasConfig: hasSupabaseConfig,
      signIn,
      signUp,
      signOut,
    }),
    [error, loading, signIn, signOut, signUp, user],
  );
};
