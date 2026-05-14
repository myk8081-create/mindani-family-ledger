import { ListChecks, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionListItem } from '../components/TransactionListItem';
import { currentMonthKey } from '../lib/date';
import { activeOnly, bySortOrder, categoryName, paymentMethodName, rootCategories } from '../lib/ledger';
import type { AuthorName, Category, PaymentMethod, Transaction, TransactionFormValues, TransactionType } from '../types';

interface HistoryScreenProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  onSave: (values: TransactionFormValues, editingId?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const formFromTransaction = (transaction: Transaction): TransactionFormValues => ({
  type: transaction.type,
  transaction_date: transaction.transaction_date,
  amount: String(transaction.amount),
  category_id: transaction.category_id,
  subcategory_id: transaction.subcategory_id ?? '',
  payment_method_id: transaction.payment_method_id ?? '',
  author_name: transaction.author_name,
  memo: transaction.memo ?? '',
  is_fixed: transaction.is_fixed,
  is_shared: transaction.is_shared,
  split_months: String(transaction.split_total ?? 1),
});

export function HistoryScreen({ categories, paymentMethods, transactions, onSave, onDelete }: HistoryScreenProps) {
  const [month, setMonth] = useState(currentMonthKey());
  const [author, setAuthor] = useState<'all' | AuthorName>('all');
  const [categoryId, setCategoryId] = useState('all');
  const [type, setType] = useState<'all' | TransactionType>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const categoryOptions = useMemo(
    () =>
      type === 'all'
        ? activeOnly(categories)
            .filter((category) => !category.parent_id)
            .sort(bySortOrder)
        : rootCategories(categories, type),
    [categories, type],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (month && !transaction.transaction_date.startsWith(month)) return false;
      if (author !== 'all' && transaction.author_name !== author) return false;
      if (type !== 'all' && transaction.type !== type) return false;
      if (categoryId !== 'all' && transaction.category_id !== categoryId && transaction.subcategory_id !== categoryId) {
        return false;
      }
      if (!normalizedQuery) return true;
      const text = [
        categoryName(categories, transaction.category_id),
        transaction.subcategory_id ? categoryName(categories, transaction.subcategory_id) : '',
        transaction.payment_method_id ? paymentMethodName(paymentMethods, transaction.payment_method_id) : '',
        transaction.author_name,
        transaction.memo ?? '',
        String(transaction.amount),
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [author, categories, categoryId, month, paymentMethods, query, transactions, type]);

  const handleDelete = async (transaction: Transaction) => {
    if (!window.confirm('이 거래를 삭제할까요?')) return;
    await onDelete(transaction.id);
  };

  const handleEdit = async (values: TransactionFormValues) => {
    if (!editing) return;
    await onSave(values, editing.id);
    setEditing(null);
  };

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5 lg:space-y-0">
      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft lg:col-span-12">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-600">월</span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-600">작성자</span>
            <select
              value={author}
              onChange={(event) => setAuthor(event.target.value as 'all' | AuthorName)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">전체</option>
              <option value="민다니">민다니</option>
              <option value="찌미찌미">찌미찌미</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-600">구분</span>
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as 'all' | TransactionType);
                setCategoryId('all');
              }}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">전체</option>
              <option value="expense">지출</option>
              <option value="income">수입</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-600">카테고리</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">전체</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-ocean focus-within:ring-4 focus-within:ring-blue-100">
          <Search className="h-4 w-4 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="검색"
            className="min-w-0 flex-1 font-semibold outline-none"
          />
        </label>
      </section>

      {editing ? (
        <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-soft lg:col-span-5 lg:sticky lg:top-28">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-ink">거래 수정</h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg p-2 text-slate-500 active:bg-slate-100"
              aria-label="닫기"
              title="닫기"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <TransactionForm
            categories={categories}
            paymentMethods={paymentMethods}
            initialValues={formFromTransaction(editing)}
            submitLabel="수정 저장"
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        </section>
      ) : null}

      <section className={`space-y-3 ${editing ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">거래 내역</h2>
          <span className="text-sm font-bold text-slate-500">{filtered.length}건</span>
        </div>
        {filtered.length > 0 ? (
          <div className={`space-y-3 ${editing ? '' : 'lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0'}`}>
            {filtered.map((transaction) => (
              <TransactionListItem
                key={transaction.id}
                transaction={transaction}
                categories={categories}
                paymentMethods={paymentMethods}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={<ListChecks className="h-6 w-6" />} title="조건에 맞는 거래가 없습니다" />
        )}
      </section>
    </div>
  );
}
