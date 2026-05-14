import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, CircleDollarSign, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '../components/EmptyState';
import { currencyFormatter } from '../lib/constants';
import { currentMonthKey, monthLabel, recentMonthKeys } from '../lib/date';
import { categoryName, isCashLikeTransaction, isCatTransaction, isCreditCardTransaction } from '../lib/ledger';
import type { Category, PaymentMethod, Transaction } from '../types';

interface StatsScreenProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
}

const chartColors = ['#2563eb', '#f9735b', '#22c7a9', '#f6b94b', '#7c3aed', '#0f766e', '#ef4444'];

const shortMonth = (month: string) => `${Number(month.slice(5, 7))}월`;

const sumTransactions = (transactions: Transaction[]) =>
  transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

const percentText = (value: number, total: number) => {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

export function StatsScreen({ categories, paymentMethods, transactions }: StatsScreenProps) {
  const currentMonth = currentMonthKey();

  const stats = useMemo(() => {
    const months = recentMonthKeys(6, currentMonth);
    const monthly = months.map((month) => {
      const monthTransactions = transactions.filter((transaction) => transaction.transaction_date.startsWith(month));
      const income = sumTransactions(monthTransactions.filter((transaction) => transaction.type === 'income'));
      const expense = sumTransactions(monthTransactions.filter((transaction) => transaction.type === 'expense'));
      return {
        key: month,
        name: shortMonth(month),
        income,
        expense,
        balance: income - expense,
      };
    });

    const current = transactions.filter((transaction) => transaction.transaction_date.startsWith(currentMonth));
    const currentIncome = current.filter((transaction) => transaction.type === 'income');
    const currentExpense = current.filter((transaction) => transaction.type === 'expense');
    const income = sumTransactions(currentIncome);
    const expense = sumTransactions(currentExpense);
    const previousExpense = monthly[monthly.length - 2]?.expense ?? 0;
    const averageExpense = Math.round(monthly.reduce((sum, item) => sum + item.expense, 0) / Math.max(1, monthly.length));

    const byCategory = new Map<string, number>();
    currentExpense.forEach((transaction) => {
      const name = categoryName(categories, transaction.category_id);
      byCategory.set(name, (byCategory.get(name) ?? 0) + transaction.amount);
    });

    const categoryRows = [...byCategory.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);
    const topCategory = categoryRows[0] ?? null;

    const mindaniExpense = sumTransactions(
      currentExpense.filter(
        (transaction) =>
          transaction.author_name === '민다니' &&
          !transaction.is_shared &&
          !transaction.is_fixed &&
          !isCatTransaction(transaction, categories),
      ),
    );
    const jjimiExpense = sumTransactions(
      currentExpense.filter(
        (transaction) =>
          transaction.author_name === '찌미찌미' &&
          !transaction.is_shared &&
          !transaction.is_fixed &&
          !isCatTransaction(transaction, categories),
      ),
    );

    const tagRows = [
      { name: '공동생활비', value: sumTransactions(currentExpense.filter((transaction) => transaction.is_shared)), color: '#22c7a9' },
      { name: '고정비', value: sumTransactions(currentExpense.filter((transaction) => transaction.is_fixed)), color: '#f9735b' },
      {
        name: '고양이',
        value: sumTransactions(currentExpense.filter((transaction) => isCatTransaction(transaction, categories))),
        color: '#f6b94b',
      },
    ].filter((item) => item.value > 0);

    const paymentRows = [
      {
        name: '현금/체크',
        value: sumTransactions(currentExpense.filter((transaction) => isCashLikeTransaction(transaction, paymentMethods))),
        color: '#22c7a9',
      },
      {
        name: '신용카드',
        value: sumTransactions(currentExpense.filter((transaction) => isCreditCardTransaction(transaction, paymentMethods))),
        color: '#2563eb',
      },
    ].filter((item) => item.value > 0);

    return {
      monthly,
      income,
      expense,
      balance: income - expense,
      previousExpense,
      averageExpense,
      expenseDelta: expense - previousExpense,
      averageDelta: expense - averageExpense,
      categoryRows,
      topCategory,
      tagRows,
      paymentRows,
      mindaniExpense,
      jjimiExpense,
      authorDiff: Math.abs(mindaniExpense - jjimiExpense),
    };
  }, [categories, currentMonth, paymentMethods, transactions]);

  if (transactions.length === 0) {
    return <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="통계 데이터가 없습니다" />;
  }

  const tooltipFormatter = (value: unknown) => currencyFormatter.format(Number(value));
  const trendIsUp = stats.expenseDelta > 0;
  const topCategoryPercent = stats.topCategory ? percentText(stats.topCategory.value, stats.expense) : '0%';

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-navy p-5 text-white shadow-soft">
        <p className="text-sm font-bold text-blue-100">{monthLabel(currentMonth)} 분석</p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-normal">지출 리포트</h2>
            <p className="mt-2 break-words text-3xl font-black tracking-normal">{currencyFormatter.format(stats.expense)}</p>
            <p className="mt-2 text-xs font-bold text-blue-100">
              수입 {currencyFormatter.format(stats.income)} · 잔액 {currencyFormatter.format(stats.balance)}
            </p>
          </div>
          <Activity className="h-10 w-10 text-honey" aria-hidden />
        </div>
      </section>

      <section className="grid gap-3">
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${trendIsUp ? 'bg-warm/10 text-warm' : 'bg-mint/10 text-teal-700'}`}>
              {trendIsUp ? <TrendingUp className="h-5 w-5" aria-hidden /> : <TrendingDown className="h-5 w-5" aria-hidden />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">전월 대비</p>
              <p className="mt-1 break-words text-2xl font-black text-ink">{currencyFormatter.format(Math.abs(stats.expenseDelta))}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">{trendIsUp ? '더 썼습니다' : '덜 썼습니다'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
            <div className="rounded-lg bg-skywash p-2 text-ocean">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-3 text-sm font-black text-ink">6개월 평균 차이</p>
            <p className="mt-1 break-words text-xl font-black text-ink">{currencyFormatter.format(stats.averageDelta)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
            <div className="rounded-lg bg-orange-50 p-2 text-warm">
              <CircleDollarSign className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-3 text-sm font-black text-ink">최대 카테고리</p>
            <p className="mt-1 truncate text-xl font-black text-ink">{stats.topCategory?.name ?? '없음'}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{topCategoryPercent}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-mint/10 p-2 text-teal-700">
              <Scale className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">개인 지출 균형</p>
              <p className="mt-1 break-words text-xl font-black text-ink">차이 {currencyFormatter.format(stats.authorDiff)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                민다니 {currencyFormatter.format(stats.mindaniExpense)} · 찌미찌미 {currencyFormatter.format(stats.jjimiExpense)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">최근 6개월 흐름</h2>
        <div className="mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.monthly}>
              <defs>
                <linearGradient id="expenseTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
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

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">카테고리 랭킹</h2>
        {stats.categoryRows.length > 0 ? (
          <div className="mt-4 space-y-3">
            {stats.categoryRows.slice(0, 7).map((item, index) => {
              const percent = percentText(item.value, stats.expense);
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span className="truncate text-ink">
                      {index + 1}. {item.name}
                    </span>
                    <span className="shrink-0 text-slate-500">
                      {percent} · {currencyFormatter.format(item.value)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: percent,
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
        <h2 className="text-lg font-black text-ink">지출 태그 분석</h2>
        {stats.tagRows.length > 0 ? (
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tagRows} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} stroke="#edf2f7" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={72} tickLine={false} axisLine={false} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="value" name="금액" radius={[0, 8, 8, 0]}>
                  {stats.tagRows.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="분석할 태그 지출이 없습니다" />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">결제수단 비율</h2>
        {stats.paymentRows.length > 0 ? (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.paymentRows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="none"
                >
                  {stats.paymentRows.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="결제수단 지출이 없습니다" />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">월별 수입/지출 비교</h2>
        <div className="mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthly}>
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
    </div>
  );
}
