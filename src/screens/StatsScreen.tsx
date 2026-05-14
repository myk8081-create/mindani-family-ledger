import { BarChart3, Cat, Repeat, Users } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { currencyFormatter } from '../lib/constants';
import { currentMonthKey, recentMonthKeys } from '../lib/date';
import { categoryName, isCatTransaction } from '../lib/ledger';
import type { Category, ChartPoint, Transaction } from '../types';

interface StatsScreenProps {
  categories: Category[];
  transactions: Transaction[];
}

const chartColors = ['#2563eb', '#f9735b', '#22c7a9', '#f6b94b', '#7c3aed', '#0f766e', '#ef4444'];

const shortMonth = (month: string) => `${Number(month.slice(5, 7))}월`;

export function StatsScreen({ categories, transactions }: StatsScreenProps) {
  const currentMonth = currentMonthKey();

  const stats = useMemo(() => {
    const months = recentMonthKeys(6, currentMonth);
    const monthly = months.map((month) => {
      const monthTransactions = transactions.filter((transaction) => transaction.transaction_date.startsWith(month));
      return {
        name: shortMonth(month),
        income: monthTransactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        expense: monthTransactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      };
    });

    const current = transactions.filter((transaction) => transaction.transaction_date.startsWith(currentMonth));
    const currentExpense = current.filter((transaction) => transaction.type === 'expense');

    const byCategory = new Map<string, number>();
    currentExpense.forEach((transaction) => {
      const name = categoryName(categories, transaction.category_id);
      byCategory.set(name, (byCategory.get(name) ?? 0) + transaction.amount);
    });

    const categoryPie = [...byCategory.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);

    const author = [
      {
        name: '작성자',
        민다니: currentExpense
          .filter((transaction) => transaction.author_name === '민다니')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        찌미찌미: currentExpense
          .filter((transaction) => transaction.author_name === '찌미찌미')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      },
    ];

    const fixedExpense = currentExpense
      .filter((transaction) => transaction.is_fixed)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const catExpense = currentExpense
      .filter((transaction) => isCatTransaction(transaction, categories))
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const sharedExpense = currentExpense
      .filter((transaction) => transaction.is_shared)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      monthly,
      categoryPie,
      author,
      fixedExpense,
      catExpense,
      sharedExpense,
    };
  }, [categories, currentMonth, transactions]);

  const hasChartData = transactions.length > 0;

  if (!hasChartData) {
    return <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="통계 데이터가 없습니다" />;
  }

  const tooltipFormatter = (value: unknown) => currencyFormatter.format(Number(value));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="고정지출" value={stats.fixedExpense} tone="warm" icon={<Repeat className="h-5 w-5" />} />
        <StatCard label="공동생활비" value={stats.sharedExpense} tone="mint" icon={<Users className="h-5 w-5" />} />
        <StatCard label="고양이 지출" value={stats.catExpense} tone="plain" icon={<Cat className="h-5 w-5" />} />
      </div>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">월별 수입/지출</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthly}>
              <CartesianGrid vertical={false} stroke="#edf2f7" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Bar dataKey="income" name="수입" fill="#22c7a9" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="지출" fill="#f9735b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">카테고리 지출 비율</h2>
        {stats.categoryPie.length > 0 ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.categoryPie} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={2}>
                  {stats.categoryPie.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
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
        <h2 className="text-lg font-black text-ink">작성자별 지출</h2>
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.author as ChartPoint[]} layout="vertical" margin={{ left: 12, right: 12 }}>
              <CartesianGrid horizontal={false} stroke="#edf2f7" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Bar dataKey="민다니" fill="#2563eb" radius={[0, 6, 6, 0]} />
              <Bar dataKey="찌미찌미" fill="#f6b94b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">최근 6개월 지출</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.monthly}>
              <CartesianGrid vertical={false} stroke="#edf2f7" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={tooltipFormatter} />
              <Line
                type="monotone"
                dataKey="expense"
                name="지출"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4, fill: '#2563eb' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
