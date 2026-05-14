import {
  ArrowLeft,
  Banknote,
  Cat,
  CircleDollarSign,
  CreditCard,
  Crown,
  ListChecks,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { TransactionListItem } from '../components/TransactionListItem';
import { currencyFormatter } from '../lib/constants';
import { addDays, addMonths, currentMonthKey, monthLabel, todayISO, weekEndISO, weekStartISO } from '../lib/date';
import { categoryName, isCashLikeTransaction, isCatTransaction, isCreditCardTransaction } from '../lib/ledger';
import type { BudgetKey, BudgetSetting, Category, PaymentMethod, Transaction } from '../types';

interface HomeScreenProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  budgetSettings: BudgetSetting[];
  onShowHistory: () => void;
}

const sumTransactions = (transactions: Transaction[]) =>
  transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

type HomeDetailKey =
  | 'income'
  | 'expense'
  | 'mindani'
  | 'jjimi'
  | 'shared'
  | 'fixed'
  | 'cat'
  | 'cash'
  | 'credit';

const calculateBudget = (
  budgetSettings: BudgetSetting[],
  transactions: Transaction[],
  key: BudgetKey,
) => {
  const setting = budgetSettings.find((item) => item.budget_key === key);
  const amount = setting?.amount ?? 0;
  const now = todayISO();
  const isWeekly = key === 'shared_weekly';
  const currentStart = isWeekly ? weekStartISO(now) : currentMonthKey() + '-01';
  const currentEnd = isWeekly ? weekEndISO(now) : addDays(addMonths(currentMonthKey(), 1) + '-01', -1);
  const periodLabel = isWeekly ? `${currentStart.slice(5)}~${currentEnd.slice(5)}` : monthLabel(currentMonthKey());

  const sharedExpenses = transactions.filter((transaction) => transaction.type === 'expense' && transaction.is_shared);
  const currentSpent = sumTransactions(
    sharedExpenses.filter(
      (transaction) => transaction.transaction_date >= currentStart && transaction.transaction_date <= currentEnd,
    ),
  );

  let carryover = 0;
  if (setting?.carryover_enabled && amount > 0) {
    let cursor = setting.carryover_start_date ?? currentStart;
    cursor = isWeekly ? weekStartISO(cursor) : cursor.slice(0, 7) + '-01';
    while (cursor < currentStart) {
      const periodStart = cursor;
      const periodEnd = isWeekly ? weekEndISO(periodStart) : addDays(addMonths(periodStart.slice(0, 7), 1) + '-01', -1);
      const spent = sumTransactions(
        sharedExpenses.filter(
          (transaction) => transaction.transaction_date >= periodStart && transaction.transaction_date <= periodEnd,
        ),
      );
      carryover += Math.max(0, amount - spent);
      cursor = isWeekly ? addDays(periodStart, 7) : addMonths(periodStart.slice(0, 7), 1) + '-01';
    }
  }

  const available = amount + carryover;
  return {
    amount,
    carryover,
    spent: currentSpent,
    available,
    remaining: available - currentSpent,
    periodLabel,
  };
};

export function HomeScreen({ categories, paymentMethods, transactions, budgetSettings, onShowHistory }: HomeScreenProps) {
  const currentMonth = currentMonthKey();
  const [activeDetail, setActiveDetail] = useState<HomeDetailKey | null>(null);

  const summary = useMemo(() => {
    const monthTransactions = transactions.filter((transaction) => transaction.transaction_date.startsWith(currentMonth));
    const buildDetails = (sourceTransactions: Transaction[]) => {
      const incomeTransactions = sourceTransactions.filter((transaction) => transaction.type === 'income');
      const expenseTransactions = sourceTransactions.filter((transaction) => transaction.type === 'expense');
      const mindaniTransactions = expenseTransactions.filter(
        (transaction) =>
          transaction.author_name === '민다니' &&
          !transaction.is_shared &&
          !transaction.is_fixed &&
          !isCatTransaction(transaction, categories),
      );
      const jjimiTransactions = expenseTransactions.filter(
        (transaction) =>
          transaction.author_name === '찌미찌미' &&
          !transaction.is_shared &&
          !transaction.is_fixed &&
          !isCatTransaction(transaction, categories),
      );
      return {
        income: incomeTransactions,
        expense: expenseTransactions,
        mindani: mindaniTransactions,
        jjimi: jjimiTransactions,
        shared: expenseTransactions.filter((transaction) => transaction.is_shared),
        fixed: expenseTransactions.filter((transaction) => transaction.is_fixed),
        cat: expenseTransactions.filter((transaction) => isCatTransaction(transaction, categories)),
        cash: expenseTransactions.filter((transaction) => isCashLikeTransaction(transaction, paymentMethods)),
        credit: expenseTransactions.filter((transaction) => isCreditCardTransaction(transaction, paymentMethods)),
      } satisfies Record<HomeDetailKey, Transaction[]>;
    };

    const details = buildDetails(monthTransactions);
    const allDetails = buildDetails(transactions);
    const income = sumTransactions(details.income);
    const expense = sumTransactions(details.expense);
    const mindaniExpense = sumTransactions(details.mindani);
    const jjimiExpense = sumTransactions(details.jjimi);
    const sharedExpense = sumTransactions(details.shared);
    const fixedExpense = sumTransactions(details.fixed);
    const catExpense = sumTransactions(details.cat);
    const cashLikeExpense = sumTransactions(details.cash);
    const creditCardExpense = sumTransactions(details.credit);

    const categoryMap = new Map<string, number>();
    details.expense.forEach((transaction) => {
      const name = categoryName(categories, transaction.category_id);
      categoryMap.set(name, (categoryMap.get(name) ?? 0) + transaction.amount);
    });

    const topCategories = [...categoryMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);

    return {
      income,
      expense,
      balance: income - expense,
      mindaniExpense,
      jjimiExpense,
      sharedExpense,
      fixedExpense,
      catExpense,
      cashLikeExpense,
      creditCardExpense,
      topCategories,
      weeklyBudget: calculateBudget(budgetSettings, transactions, 'shared_weekly'),
      monthlyBudget: calculateBudget(budgetSettings, transactions, 'shared_monthly'),
      details,
      allDetails,
      recent: transactions
        .filter(
          (transaction) =>
            !transaction.is_shared &&
            !transaction.is_fixed &&
            !isCatTransaction(transaction, categories) &&
            !isCreditCardTransaction(transaction, paymentMethods),
        )
        .slice(0, 5),
    };
  }, [budgetSettings, categories, currentMonth, paymentMethods, transactions]);

  const detailCards: Array<{
    key: HomeDetailKey;
    label: string;
    value: number;
    tone: 'blue' | 'warm' | 'mint' | 'plain';
    icon: ReactNode;
  }> = [
    { key: 'income', label: '총 수입', value: summary.income, tone: 'mint', icon: <TrendingUp className="h-5 w-5" /> },
    { key: 'expense', label: '총 지출', value: summary.expense, tone: 'warm', icon: <TrendingDown className="h-5 w-5" /> },
    {
      key: 'mindani',
      label: '민다니 지출',
      value: summary.mindaniExpense,
      tone: 'blue',
      icon: <CircleDollarSign className="h-5 w-5" />,
    },
    {
      key: 'jjimi',
      label: '찌미찌미 지출',
      value: summary.jjimiExpense,
      tone: 'blue',
      icon: <CircleDollarSign className="h-5 w-5" />,
    },
    { key: 'shared', label: '공동생활비', value: summary.sharedExpense, tone: 'mint', icon: <Users className="h-5 w-5" /> },
    { key: 'fixed', label: '고정비', value: summary.fixedExpense, tone: 'warm', icon: <ListChecks className="h-5 w-5" /> },
    { key: 'cat', label: '고양이 지출', value: summary.catExpense, tone: 'plain', icon: <Cat className="h-5 w-5" /> },
    { key: 'cash', label: '현금/체크', value: summary.cashLikeExpense, tone: 'mint', icon: <Banknote className="h-5 w-5" /> },
    {
      key: 'credit',
      label: '신용카드',
      value: summary.creditCardExpense,
      tone: 'blue',
      icon: <CreditCard className="h-5 w-5" />,
    },
  ];

  const activeDetailCard = activeDetail ? detailCards.find((card) => card.key === activeDetail) ?? null : null;
  const monthlyActiveTransactions = activeDetail ? summary.details[activeDetail] ?? [] : [];
  const fallbackActiveTransactions = activeDetail ? summary.allDetails[activeDetail] ?? [] : [];
  const activeTransactions = monthlyActiveTransactions.length > 0 ? monthlyActiveTransactions : fallbackActiveTransactions;
  const isShowingMonthlyDetail = monthlyActiveTransactions.length > 0 || fallbackActiveTransactions.length === 0;
  const detailScopeLabel = isShowingMonthlyDetail ? `${monthLabel(currentMonth)} 내역` : '최근 전체 내역';
  const monthlyBudgetRate =
    summary.monthlyBudget.available > 0
      ? Math.min(100, Math.max(0, (summary.monthlyBudget.spent / summary.monthlyBudget.available) * 100))
      : 0;

  const selectDetail = (key: HomeDetailKey) => {
    setActiveDetail(key);
  };

  if (activeDetail && activeDetailCard) {
    return (
      <div className="space-y-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5 lg:space-y-0">
        <button
          type="button"
          onClick={() => setActiveDetail(null)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-navy shadow-soft active:bg-slate-100 lg:col-span-12 lg:w-fit"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          홈으로 돌아가기
        </button>

        <section className="rounded-lg bg-navy p-5 text-white shadow-soft lg:col-span-4 lg:sticky lg:top-28">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-blue-100">{detailScopeLabel}</p>
              <h2 className="mt-2 text-2xl font-black tracking-normal">{activeDetailCard.label}</h2>
              <p className="mt-2 break-words text-3xl font-black tracking-normal">
                {currencyFormatter.format(activeDetailCard.value)}
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 text-honey">{activeDetailCard.icon}</div>
          </div>
          <p className="mt-4 text-sm font-bold text-blue-100">{activeTransactions.length}건의 거래가 있습니다.</p>
        </section>

        {activeTransactions.length > 0 ? (
          <section className="space-y-3 lg:col-span-8 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {activeTransactions.map((transaction) => (
              <TransactionListItem
                key={transaction.id}
                transaction={transaction}
                categories={categories}
                paymentMethods={paymentMethods}
              />
            ))}
          </section>
        ) : (
          <div className="lg:col-span-8">
            <EmptyState icon={<ListChecks className="h-6 w-6" />} title="표시할 내역이 없습니다" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5 lg:space-y-0">
      <section className="rounded-lg bg-navy p-5 text-white shadow-soft lg:col-span-12">
        <p className="text-sm font-bold text-blue-100">{monthLabel(currentMonth)} 공동생활비</p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-100">월간 남은 한도</p>
            <p className={`mt-1 break-words text-3xl font-black tracking-normal ${summary.monthlyBudget.remaining < 0 ? 'text-honey' : ''}`}>
              {currencyFormatter.format(summary.monthlyBudget.remaining)}
            </p>
            <p className="mt-2 text-xs font-bold text-blue-100">
              한도 {currencyFormatter.format(summary.monthlyBudget.amount)} · 사용{' '}
              {currencyFormatter.format(summary.monthlyBudget.spent)}
            </p>
          </div>
          <Users className="h-10 w-10 text-honey" aria-hidden />
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/15">
          <div className="h-2 rounded-full bg-honey" style={{ width: `${monthlyBudgetRate}%` }} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:col-span-8 lg:grid-cols-3">
        {detailCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={card.value}
            tone={card.tone}
            icon={card.icon}
            onClick={() => selectDetail(card.key)}
          />
        ))}
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft lg:col-span-4">
        <h2 className="text-lg font-black text-ink">공동생활비 한도</h2>
        <div className="mt-4 grid gap-3">
          {[
            { label: '주간', budget: summary.weeklyBudget },
            { label: '월간', budget: summary.monthlyBudget },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-skywash p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-navy">{item.label} 한도</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.budget.periodLabel}</p>
                </div>
                <p className={`text-lg font-black ${item.budget.remaining < 0 ? 'text-warm' : 'text-teal-700'}`}>
                  {currencyFormatter.format(item.budget.remaining)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-500">
                <div>
                  <p>한도</p>
                  <p className="mt-1 text-ink">{currencyFormatter.format(item.budget.amount)}</p>
                </div>
                <div>
                  <p>이월</p>
                  <p className="mt-1 text-ink">{currencyFormatter.format(item.budget.carryover)}</p>
                </div>
                <div>
                  <p>사용</p>
                  <p className="mt-1 text-ink">{currencyFormatter.format(item.budget.spent)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft lg:col-span-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">TOP 지출 카테고리</h2>
          <Crown className="h-5 w-5 text-honey" aria-hidden />
        </div>
        {summary.topCategories.length > 0 ? (
          <div className="mt-4 space-y-3">
            {summary.topCategories.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between gap-3 text-sm font-bold">
                  <span>{item.name}</span>
                  <span>{currencyFormatter.format(item.value)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-ocean"
                    style={{ width: `${Math.max(8, (item.value / summary.topCategories[0].value) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState icon={<ListChecks className="h-6 w-6" />} title="이번 달 지출이 없습니다" />
          </div>
        )}
      </section>

      <section className="space-y-3 lg:col-span-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">최근 거래</h2>
          <button type="button" onClick={onShowHistory} className="rounded-lg px-3 py-2 text-sm font-black text-ocean">
            전체
          </button>
        </div>
        {summary.recent.length > 0 ? (
          summary.recent.map((transaction) => (
            <TransactionListItem
              key={transaction.id}
              transaction={transaction}
              categories={categories}
              paymentMethods={paymentMethods}
            />
          ))
        ) : (
          <EmptyState icon={<ListChecks className="h-6 w-6" />} title="거래 내역이 없습니다" />
        )}
      </section>
    </div>
  );
}
