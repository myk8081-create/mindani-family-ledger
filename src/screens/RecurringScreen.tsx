import { CalendarPlus, Repeat, Save, Trash2, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { currencyFormatter, FAMILY_AUTHORS, RECURRING_LABELS } from '../lib/constants';
import { categoryName, childCategories, findCategory, paymentMethodName, rootCategories } from '../lib/ledger';
import type { AuthorName, Category, PaymentMethod, RecurringFormValues, RecurringTransaction } from '../types';

interface RecurringScreenProps {
  authorName: AuthorName;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  recurringTransactions: RecurringTransaction[];
  onSave: (values: RecurringFormValues, editingId?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGenerate: () => Promise<number>;
  onBack: () => void;
}

const defaultForm = (
  authorName: AuthorName,
  categories: Category[],
  paymentMethods: PaymentMethod[],
): RecurringFormValues => {
  const expenseCategories = rootCategories(categories, 'expense');
  const rent = expenseCategories.find((category) => category.name === '월세') ?? expenseCategories[0];
  return {
    recurring_label: RECURRING_LABELS[0],
    amount: '',
    day_of_month: '1',
    category_id: rent?.id ?? '',
    subcategory_id: '',
    payment_method_id: paymentMethods[0]?.id ?? '',
    author_name: authorName,
    memo: '',
    is_shared: false,
    is_active: true,
  };
};

const formFromRecurring = (item: RecurringTransaction): RecurringFormValues => ({
  recurring_label: item.recurring_label,
  amount: String(item.amount),
  day_of_month: String(item.day_of_month),
  category_id: item.category_id,
  subcategory_id: item.subcategory_id ?? '',
  payment_method_id: item.payment_method_id ?? '',
  author_name: item.author_name,
  memo: item.memo ?? '',
  is_shared: item.is_shared,
  is_active: item.is_active,
});

export function RecurringScreen({
  authorName,
  categories,
  paymentMethods,
  recurringTransactions,
  onSave,
  onDelete,
  onGenerate,
  onBack,
}: RecurringScreenProps) {
  const [values, setValues] = useState(() => defaultForm(authorName, categories, paymentMethods));
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = useMemo(() => rootCategories(categories, 'expense'), [categories]);
  const selectedCategory = findCategory(categories, values.category_id);
  const subcategoryOptions = childCategories(categories, selectedCategory?.id);
  const showSubcategory = selectedCategory?.name === '고양이' && subcategoryOptions.length > 0;

  useEffect(() => {
    if (editing) {
      setValues(formFromRecurring(editing));
    } else {
      setValues(defaultForm(authorName, categories, paymentMethods));
    }
  }, [authorName, categories, editing, paymentMethods]);

  const setValue = <K extends keyof RecurringFormValues>(key: K, value: RecurringFormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await onSave(values, editing?.id);
      setMessage(editing ? '수정되었습니다.' : '추가되었습니다.');
      setEditing(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setMessage(null);
    try {
      const count = await onGenerate();
      setMessage(count > 0 ? `${count}건을 생성했습니다.` : '생성할 항목이 없습니다.');
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : '생성하지 못했습니다.');
    }
  };

  const handleDelete = async (item: RecurringTransaction) => {
    if (!window.confirm('이 반복 지출을 삭제할까요?')) return;
    await onDelete(item.id);
  };

  if (expenseCategories.length === 0) {
    return <EmptyState icon={<Repeat className="h-6 w-6" />} title="카테고리를 불러오는 중입니다" />;
  }

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5 lg:space-y-0">
      <div className="flex items-center justify-between lg:col-span-12">
        <button type="button" onClick={onBack} className="rounded-lg px-3 py-2 text-sm font-black text-ocean">
          설정
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-black text-white shadow-soft"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          이번 달 생성
        </button>
      </div>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft lg:col-span-5 lg:sticky lg:top-28">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">{editing ? '반복 지출 수정' : '반복 지출 추가'}</h2>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg p-2 text-slate-500 active:bg-slate-100"
              aria-label="닫기"
              title="닫기"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">항목</span>
              <select
                value={values.recurring_label}
                onChange={(event) => setValue('recurring_label', event.target.value)}
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
              >
                {RECURRING_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-600">매월</span>
              <input
                type="number"
                min={1}
                max={31}
                value={values.day_of_month}
                onChange={(event) => setValue('day_of_month', event.target.value)}
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-slate-600">금액</span>
            <input
              value={values.amount}
              onChange={(event) => setValue('amount', event.target.value.replace(/[^\d,]/g, ''))}
              inputMode="numeric"
              placeholder="0"
              className="mt-2 h-14 w-full rounded-lg border border-slate-200 bg-white px-4 text-right text-2xl font-black outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">카테고리</span>
              <select
                value={values.category_id}
                onChange={(event) =>
                  setValues((previous) => ({ ...previous, category_id: event.target.value, subcategory_id: '' }))
                }
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
              >
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-600">결제수단</span>
              <select
                value={values.payment_method_id}
                onChange={(event) => setValue('payment_method_id', event.target.value)}
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
              >
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {showSubcategory ? (
            <label className="block">
              <span className="text-sm font-bold text-slate-600">고양이 세부</span>
              <select
                value={values.subcategory_id}
                onChange={(event) => setValue('subcategory_id', event.target.value)}
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
              >
                <option value="">선택 안 함</option>
                {subcategoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">작성자</span>
              <select
                value={values.author_name}
                onChange={(event) => setValue('author_name', event.target.value as AuthorName)}
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
              >
                {FAMILY_AUTHORS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end">
              <span className="flex h-12 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 font-bold text-ink">
                활성
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(event) => setValue('is_active', event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-ocean focus:ring-ocean"
                />
              </span>
            </label>
          </div>

          <label className="flex min-h-12 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 font-bold text-ink">
            <span>공동생활비</span>
            <input
              type="checkbox"
              checked={values.is_shared}
              onChange={(event) => setValue('is_shared', event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-ocean focus:ring-ocean"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-600">메모</span>
            <input
              value={values.memo}
              onChange={(event) => setValue('memo', event.target.value)}
              placeholder="메모"
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-medium outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
            />
          </label>

          {error ? <p className="rounded-lg bg-warm/10 px-3 py-2 text-sm font-bold text-warm">{error}</p> : null}
          {message ? <p className="rounded-lg bg-mint/10 px-3 py-2 text-sm font-bold text-teal-700">{message}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 text-base font-black text-white shadow-soft disabled:opacity-60"
          >
            <Save className="h-5 w-5" aria-hidden />
            {saving ? '저장 중' : editing ? '수정 저장' : '추가'}
          </button>
        </form>
      </section>

      <section className="space-y-3 lg:col-span-7">
        <h2 className="text-lg font-black text-ink">반복 지출 목록</h2>
        {recurringTransactions.length > 0 ? (
          <div className="space-y-3 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0">
            {recurringTransactions.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-skywash px-2.5 py-1 text-xs font-bold text-navy">
                        {item.is_active ? '활성' : '중지'}
                      </span>
                      <span className="text-xs font-bold text-slate-500">매월 {item.day_of_month}일</span>
                    </div>
                    <h3 className="mt-2 font-black text-ink">{item.recurring_label}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {categoryName(categories, item.category_id)} · {paymentMethodName(paymentMethods, item.payment_method_id)} ·{' '}
                      {item.author_name}
                      {item.is_shared ? ' · 공동' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-warm">-{currencyFormatter.format(item.amount)}</p>
                    <div className="mt-3 flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="rounded-lg px-3 py-2 text-sm font-black text-ocean active:bg-slate-100"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="rounded-lg p-2 text-warm active:bg-orange-50"
                        aria-label="삭제"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Repeat className="h-6 w-6" />} title="반복 지출이 없습니다" />
        )}
      </section>
    </div>
  );
}
