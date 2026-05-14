import { Cat, CircleDollarSign, Crown, ListChecks, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { TransactionListItem } from '../components/TransactionListItem';
import { currencyFormatter } from '../lib/constants';
import { currentMonthKey, monthLabel } from '../lib/date';
import { categoryName, isCatTransaction } from '../lib/ledger';
import type { Category, PaymentMethod, Transaction } from '../types';

interface HomeScreenProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  onShowHistory: () => void;
}

export function HomeScreen({ categories, paymentMethods, transactions, onShowHistory }: HomeScreenProps) {
  const currentMonth = currentMonthKey();

  const summary = useMemo(() => {
    const monthTransactions = transactions.filter((transaction) => transaction.transaction_date.startsWith(currentMonth));
    const income = monthTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expense = monthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const mindaniExpense = monthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          transaction.author_name === '민다니' &&
          !transaction.is_shared &&
          !transaction.is_fixed,
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const jjimiExpense = monthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          transaction.author_name === '찌미찌미' &&
          !transaction.is_shared &&
          !transaction.is_fixed,
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const sharedExpense = monthTransactions
      .filter((transaction) => transaction.type === 'expense' && transaction.is_shared)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const fixedExpense = monthTransactions
      .filter((transaction) => transaction.type === 'expense' && transaction.is_fixed)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const catExpense = monthTransactions
      .filter((transaction) => transaction.type === 'expense' && isCatTransaction(transaction, categories))
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const categoryMap = new Map<string, number>();
    monthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
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
      topCategories,
      recent: transactions.filter((transaction) => !transaction.is_shared && !transaction.is_fixed).slice(0, 5),
      sharedRecent: monthTransactions
        .filter((transaction) => transaction.type === 'expense' && transaction.is_shared)
        .slice(0, 5),
      fixedRecent: monthTransactions
        .filter((transaction) => transaction.type === 'expense' && transaction.is_fixed)
        .slice(0, 5),
    };
  }, [categories, currentMonth, transactions]);

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-navy p-5 text-white shadow-soft">
        <p className="text-sm font-bold text-blue-100">{monthLabel(currentMonth)}</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-100">이번 달 잔액</p>
            <p className="mt-1 break-words text-3xl font-black tracking-normal">{currencyFormatter.format(summary.balance)}</p>
          </div>
          <Wallet className="h-10 w-10 text-honey" aria-hidden />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="총 수입" value={summary.income} tone="mint" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="총 지출" value={summary.expense} tone="warm" icon={<TrendingDown className="h-5 w-5" />} />
        <StatCard label="민다니 지출" value={summary.mindaniExpense} tone="blue" icon={<CircleDollarSign className="h-5 w-5" />} />
        <StatCard label="찌미찌미 지출" value={summary.jjimiExpense} tone="blue" icon={<CircleDollarSign className="h-5 w-5" />} />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="공동생활비" value={summary.sharedExpense} tone="mint" icon={<Users className="h-5 w-5" />} />
        <StatCard label="고정비" value={summary.fixedExpense} tone="warm" icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="고양이 지출" value={summary.catExpense} tone="plain" icon={<Cat className="h-5 w-5" />} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">공동생활비 목록</h2>
          <span className="text-sm font-bold text-slate-500">{summary.sharedRecent.length}건</span>
        </div>
        {summary.sharedRecent.length > 0 ? (
          summary.sharedRecent.map((transaction) => (
            <TransactionListItem
              key={transaction.id}
              transaction={transaction}
              categories={categories}
              paymentMethods={paymentMethods}
            />
          ))
        ) : (
          <EmptyState icon={<Users className="h-6 w-6" />} title="이번 달 공동생활비가 없습니다" />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">고정비 목록</h2>
          <span className="text-sm font-bold text-slate-500">{summary.fixedRecent.length}건</span>
        </div>
        {summary.fixedRecent.length > 0 ? (
          summary.fixedRecent.map((transaction) => (
            <TransactionListItem
              key={transaction.id}
              transaction={transaction}
              categories={categories}
              paymentMethods={paymentMethods}
            />
          ))
        ) : (
          <EmptyState icon={<ListChecks className="h-6 w-6" />} title="이번 달 고정비가 없습니다" />
        )}
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
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

      <section className="space-y-3">
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
