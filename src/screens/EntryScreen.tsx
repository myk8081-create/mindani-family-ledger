import { PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { TransactionForm } from '../components/TransactionForm';
import { emptyTransactionForm } from '../lib/constants';
import type { AuthorName, Category, PaymentMethod, TransactionFormValues } from '../types';

interface EntryScreenProps {
  authorName: AuthorName;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  onSave: (values: TransactionFormValues) => Promise<void>;
}

export function EntryScreen({ authorName, categories, paymentMethods, onSave }: EntryScreenProps) {
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const initialValues = useMemo(() => emptyTransactionForm(authorName), [authorName, formKey]);

  const handleSave = async (values: TransactionFormValues) => {
    await onSave(values);
    setMessage('저장되었습니다.');
    setFormKey((key) => key + 1);
    window.setTimeout(() => setMessage(null), 1800);
  };

  if (categories.length === 0 || paymentMethods.length === 0) {
    return <EmptyState icon={<PlusCircle className="h-6 w-6" />} title="기본 항목을 불러오는 중입니다" />;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="mb-4 text-lg font-black text-ink">빠른 입력</h2>
        <TransactionForm
          key={formKey}
          categories={categories}
          paymentMethods={paymentMethods}
          initialValues={initialValues}
          submitLabel="저장"
          onSubmit={handleSave}
        />
      </section>
      {message ? <p className="rounded-lg bg-mint/10 px-4 py-3 text-sm font-bold text-teal-700">{message}</p> : null}
    </div>
  );
}
