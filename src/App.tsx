import { RefreshCw, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { SyncBadge } from './components/SyncBadge';
import { useAuth } from './hooks/useAuth';
import { useFamilyLedger } from './hooks/useFamilyLedger';
import { AuthScreen } from './screens/AuthScreen';
import { EntryScreen } from './screens/EntryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { RecurringScreen } from './screens/RecurringScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StatsScreen } from './screens/StatsScreen';
import type { AppScreen } from './types';

const titles: Record<AppScreen, string> = {
  home: '홈',
  entry: '빠른 입력',
  history: '거래 내역',
  stats: '통계',
  settings: '설정',
  recurring: '반복 지출',
};

function LoadingScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f8fbff] px-6 text-ink">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-navy text-white shadow-soft">
          <WalletCards className="h-9 w-9" aria-hidden />
        </div>
        <p className="text-lg font-black">민다니 패밀리 가계부</p>
      </div>
    </main>
  );
}

export default function App() {
  const auth = useAuth();
  const ledger = useFamilyLedger(auth.user);
  const [screen, setScreen] = useState<AppScreen>('home');

  if (auth.loading) return <LoadingScreen />;

  if (!auth.user) {
    return (
      <AuthScreen
        hasConfig={auth.hasConfig}
        authError={auth.error}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
      />
    );
  }

  if (ledger.loading && !ledger.familyGroup && !ledger.onboardingRequired) return <LoadingScreen />;

  if (ledger.onboardingRequired) {
    return <OnboardingScreen onClaim={ledger.claimFamilyMember} onSignOut={auth.signOut} />;
  }

  const authorName = ledger.member?.display_name ?? ledger.profile?.display_name ?? '민다니';
  const activeTab = screen === 'recurring' ? 'settings' : screen;

  return (
    <main className="min-h-dvh bg-[#f8fbff] text-ink">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f8fbff]/90 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+14px)] backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-500">{ledger.familyGroup?.name ?? '민다니 패밀리'}</p>
            <h1 className="truncate text-2xl font-black tracking-normal text-ink">{titles[screen]}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SyncBadge status={ledger.syncStatus} queueCount={ledger.queueCount} />
            <button
              type="button"
              onClick={() => void ledger.refresh()}
              className="rounded-lg bg-white p-2 text-slate-600 shadow-sm active:bg-slate-100"
              aria-label="새로고침"
              title="새로고침"
            >
              <RefreshCw className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 pb-28 pt-5">
        {ledger.error ? <p className="mb-4 rounded-lg bg-warm/10 px-4 py-3 text-sm font-bold text-warm">{ledger.error}</p> : null}

        {screen === 'home' ? (
          <HomeScreen
            categories={ledger.categories}
            paymentMethods={ledger.paymentMethods}
            transactions={ledger.transactions}
            budgetSettings={ledger.budgetSettings}
            onShowHistory={() => setScreen('history')}
          />
        ) : null}

        {screen === 'entry' ? (
          <EntryScreen
            authorName={authorName}
            categories={ledger.categories}
            paymentMethods={ledger.paymentMethods}
            onSave={ledger.saveTransaction}
          />
        ) : null}

        {screen === 'history' ? (
          <HistoryScreen
            categories={ledger.categories}
            paymentMethods={ledger.paymentMethods}
            transactions={ledger.transactions}
            onSave={ledger.saveTransaction}
            onDelete={ledger.deleteTransaction}
          />
        ) : null}

        {screen === 'stats' ? <StatsScreen categories={ledger.categories} transactions={ledger.transactions} /> : null}

        {screen === 'settings' ? (
          <SettingsScreen
            familyGroup={ledger.familyGroup}
            categories={ledger.categories}
            paymentMethods={ledger.paymentMethods}
            transactions={ledger.transactions}
            budgetSettings={ledger.budgetSettings}
            buildBackup={ledger.buildBackup}
            restoreBackup={ledger.restoreBackup}
            resetData={ledger.resetData}
            saveBudgetSettings={ledger.saveBudgetSettings}
            onOpenRecurring={() => setScreen('recurring')}
            onSignOut={auth.signOut}
          />
        ) : null}

        {screen === 'recurring' ? (
          <RecurringScreen
            authorName={authorName}
            categories={ledger.categories}
            paymentMethods={ledger.paymentMethods}
            recurringTransactions={ledger.recurringTransactions}
            onSave={ledger.saveRecurring}
            onDelete={ledger.deleteRecurring}
            onGenerate={ledger.generateRecurringForMonth}
            onBack={() => setScreen('settings')}
          />
        ) : null}
      </div>

      <BottomNav active={activeTab} onChange={setScreen} />
    </main>
  );
}
