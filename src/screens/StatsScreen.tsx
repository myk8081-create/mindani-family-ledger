import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, BarChart3, Cat, CreditCard, Repeat, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { currencyFormatter } from '../lib/constants';
import { currentMonthKey, monthLabel, recentMonthKeys } from '../lib/date';
import { categoryName, isCashLikeTransaction, isCatTransaction, isCreditCardTransaction } from '../lib/ledger';
import type { Category, ChartPoint, PaymentMethod, Transaction } from '../types';

interface StatsScreenProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
}

const chartColors = ['#2563eb', '#f9735b', '#22c7a9', '#f6b94b', '#7c3aed', '#0f766e', '#ef4444'];

const shortMonth = (month: string) => `${Number(month.slice(5, 7))}월`;

const sumTransactions = (transactions: Transaction[]) =>
  transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

export function StatsScreen({ categories, paymentMethods, transactions }: StatsScreenProps) {
  const currentMonth = currentMonthKey();

  const stats = useMemo(() => {
    const months = recentMonthKeys(6, currentMonth);
    const monthly = months.map((month) => {
      const monthTransactions = transactions.filter((transaction) => transaction.transaction_date.startsWith(month));
      const income = sumTransactions(monthTransactions.filter((transaction) => transaction.type === 'income'));
      const expense = sumTransactions(monthTransactions.filter((transaction) => transaction.type === 'expense'));
      return {
        name: shortMonth(month),
        income,
        expense,
        balance: income - expense,
      };
    });

    const current = transactions.filter((transaction) => transaction.transaction_date.startsWith(currentMonth));
    const currentIncome = current.filter((transaction) => transaction.type === 'income');
    const currentExpense = current.filter((transaction) => transaction.type === 'expense');

    const byCategory = new Map<string, number>();
    currentExpense.forEach((transaction) => {
      const name = categoryName(categories, transaction.category_id);
      byCategory.set(name, (byCategory.get(name) ?? 0) + transaction.amount);
    });

    const categoryPie = [...byCategory.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);
    const categoryTotal = categoryPie.reduce((sum, item) => sum + item.value, 0);

    const authorRows = [
      {
        name: '민다니',
        value: sumTransactions(
          currentExpense.filter(
            (transaction) =>
              transaction.author_name === '민다니' &&
              !transaction.is_shared &&
              !transaction.is_fixed &&
              !isCatTransaction(transaction, categories),
          ),
        ),
        color: '#2563eb',
      },
      {
        name: '찌미찌미',
        value: sumTransactions(
          currentExpense.filter(
            (transaction) =>
              transaction.author_name === '찌미찌미' &&
              !transaction.is_shared &&
              !transaction.is_fixed &&
              !isCatTransaction(transaction, categories),
          ),
        ),
        color: '#f6b94b',
      },
    ];

    const fixedExpense = sumTransactions(currentExpense.filter((transaction) => transaction.is_fixed));
    const catExpense = sumTransactions(currentExpense.filter((transaction) => isCatTransaction(transaction, categories)));
    const sharedExpense = sumTransactions(currentExpense.filter((transaction) => transaction.is_shared));
    const cashLikeExpense = sumTransactions(
      currentExpense.filter((transaction) => isCashLikeTransaction(transaction, paymentMethods)),
    );
    const creditCardExpense = sumTransactions(
      currentExpense.filter((transaction) => isCreditCardTransaction(transaction, paymentMethods)),
    );

    return {
      monthly,
      categoryPie,
      categoryTotal,
      authorRows,
      income: sumTransactions(currentIncome),
      expense: sumTransactions(currentExpense),
      balance: sumTransactions(currentIncome) - sumTransactions(currentExpense),
      fixedExpense,
      catExpense,
      sharedExpense,
      cashLikeExpense,
      creditCardExpense,
    };
  }, [categories, currentMonth, paymentMethods, transactions]);

  const hasChartData = transactions.length > 0;

  if (!hasChartData) {
    return <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="통계 데이터가 없습니다" />;
  }

  const tooltipFormatter = (value: unknown) => currencyFormatter.format(Number(value));
  const maxAuthorExpense = Math.max(...stats.authorRows.map((row) => row.value), 1);

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-navy p-5 text-white shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-100">{monthLabel(currentMonth)} 통계</p>
            <h2 className="mt-2 text-lg font-black">이번 달 지출</h2>
            <p className="mt-1 break-words text-3xl font-black tracking-normal">{currencyFormatter.format(stats.expense)}</p>
          </div>
          <Wallet className="h-10 w-10 text-honey" aria-hidden />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs font-bold text-blue-100">수입</p>
            <p className="mt-1 break-words text-base font-black">{currencyFormatter.format(stats.income)}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs font-bold text-blue-100">잔액</p>
            <p className="mt-1 break-words text-base font-black">{currencyFormatter.format(stats.balance)}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="총 수입" value={stats.income} tone="mint" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="총 지출" value={stats.expense} tone="warm" icon={<TrendingDown className="h-5 w-5" />} />
        <StatCard label="현금/체크" value={stats.cashLikeExpense} tone="mint" icon={<Banknote className="h-5 w-5" />} />
        <StatCard label="신용카드" value={stats.creditCardExpense} tone="blue" icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="공동생활비" value={stats.sharedExpense} tone="mint" icon={<Users className="h-5 w-5" />} />
        <StatCard label="고정비" value={stats.fixedExpense} tone="warm" icon={<Repeat className="h-5 w-5" />} />
        <StatCard label="고양이" value={stats.catExpense} tone="plain" icon={<Cat className="h-5 w-5" />} />
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">카테고리 TOP</h2>
        {stats.categoryPie.length > 0 ? (
          <div className="mt-4 space-y-3">
            {stats.categoryPie.slice(0, 6).map((item, index) => {
              const percent = stats.categoryTotal > 0 ? Math.round((item.value / stats.categoryTotal) * 100) : 0;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span className="truncate text-ink">{item.name}</span>
                    <span className="shrink-0 text-slate-500">
                      {percent}% · {currencyFormatter.format(item.value)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.max(6, percent)}%`,
                        backgroundColor: chartColors[index % chartColors.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="이번 달 지출이 없습니다" />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">카테고리 비율</h2>
        {stats.categoryPie.length > 0 ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {stats.categoryPie.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="이번 달 지출이 없습니다" />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">작성자별 개인 지출</h2>
        <div className="mt-4 space-y-4">
          {stats.authorRows.map((row) => (
            <div key={row.name}>
              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span>{row.name}</span>
                <span>{currencyFormatter.format(row.value)}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-slate-100">
                <div
                  className="h-3 rounded-full"
                  style={{ width: `${Math.max(4, (row.value / maxAuthorExpense) * 100)}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs font-bold text-slate-500">공동생활비, 고정비, 고양이 지출은 개인 지출에서 제외됩니다.</p>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">월별 수입/지출</h2>
        <div className="mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthly as ChartPoint[]}>
              <CartesianGrid vertical={false} stroke="#edf2f7" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={tooltipFormatter} />
              <Bar dataKey="income" name="수입" fill="#22c7a9" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="지출" fill="#f9735b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">최근 6개월 지출 추이</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.monthly as ChartPoint[]}>
              <defs>
                <linearGradient id="expenseTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.26} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#edf2f7" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={tooltipFormatter} />
              <Area
                type="monotone"
                dataKey="expense"
                name="지출"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#expenseTrend)"
                dot={{ r: 4, fill: '#2563eb' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
