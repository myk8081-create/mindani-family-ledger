import { Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { FAMILY_AUTHORS } from '../lib/constants';
import { childCategories, findCategory, rootCategories } from '../lib/ledger';
import type { Category, PaymentMethod, TransactionFormValues } from '../types';

interface TransactionFormProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  initialValues: TransactionFormValues;
  submitLabel: string;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function TransactionForm({
  categories,
  paymentMethods,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [values, setValues] = useState<TransactionFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rootOptions = useMemo(() => rootCategories(categories, values.type), [categories, values.type]);
  const selectedCategory = findCategory(categories, values.category_id);
  const subcategoryOptions = childCategories(categories, selectedCategory?.id);
  const showSubcategory = selectedCategory?.name === '고양이' && subcategoryOptions.length > 0;

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    if (rootOptions.length === 0) return;
    const current = rootOptions.some((category) => category.id === values.category_id);
    if (!current) {
      setValues((previous) => ({
        ...previous,
        category_id: rootOptions[0].id,
        subcategory_id: '',
      }));
    }
  }, [rootOptions, values.category_id]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !values.payment_method_id) {
      setValues((previous) => ({ ...previous, payment_method_id: paymentMethods[0].id }));
    }
  }, [paymentMethods, values.payment_method_id]);

  const setValue = <K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        {(['expense', 'income'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setValues((previous) => ({ ...previous, type, category_id: '', subcategory_id: '' }))}
            className={`min-h-12 rounded-lg text-base font-black transition ${
              values.type === type ? 'bg-white text-navy shadow-sm' : 'text-slate-500'
            }`}
          >
            {type === 'expense' ? '지출' : '수입'}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-sm font-bold text-slate-600">금액</span>
        <input
          value={values.amount}
          onChange={(event) => setValue('amount', event.target.value.replace(/[^\d,]/g, ''))}
          inputMode="numeric"
          placeholder="0"
          className="mt-2 h-16 w-full rounded-lg border border-slate-200 bg-white px-4 text-right text-3xl font-black text-ink outline-none transition focus:border-ocean focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-bold text-slate-600">날짜</span>
          <input
            type="date"
            value={values.transaction_date}
            onChange={(event) => setValue('transaction_date', event.target.value)}
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold text-ink outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-600">작성자</span>
          <select
            value={values.author_name}
            onChange={(event) => setValue('author_name', event.target.value as TransactionFormValues['author_name'])}
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold text-ink outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
          >
            {FAMILY_AUTHORS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-bold text-slate-600">카테고리</span>
          <select
            value={values.category_id}
            onChange={(event) => setValues((previous) => ({ ...previous, category_id: event.target.value, subcategory_id: '' }))}
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold text-ink outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
          >
            {rootOptions.map((category) => (
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
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold text-ink outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
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
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold text-ink outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
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

      <label className="block">
        <span className="text-sm font-bold text-slate-600">메모</span>
        <input
          value={values.memo}
          onChange={(event) => setValue('memo', event.target.value)}
          placeholder="메모"
          className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-medium text-ink outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
        />
      </label>

      {values.type === 'expense' ? (
        <label className="flex min-h-12 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 font-bold text-ink">
          <span>고정지출</span>
          <input
            type="checkbox"
            checked={values.is_fixed}
            onChange={(event) => setValue('is_fixed', event.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-ocean focus:ring-ocean"
          />
        </label>
      ) : null}

      {error ? <p className="rounded-lg bg-warm/10 px-3 py-2 text-sm font-bold text-warm">{error}</p> : null}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-navy px-4 text-base font-black text-white shadow-soft active:scale-[0.99] disabled:opacity-60"
        >
          <Save className="h-5 w-5" aria-hidden />
          {saving ? '저장 중' : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-14 rounded-lg border border-slate-200 bg-white px-4 font-black text-slate-600"
          >
            취소
          </button>
        ) : null}
      </div>
    </form>
  );
}
