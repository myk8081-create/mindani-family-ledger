import { Pencil, Trash2 } from 'lucide-react';
import { currencyFormatter } from '../lib/constants';
import { formatKoreanDate } from '../lib/date';
import { categoryName, paymentMethodName } from '../lib/ledger';
import type { Category, PaymentMethod, Transaction } from '../types';

interface TransactionListItemProps {
  transaction: Transaction;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export function TransactionListItem({
  transaction,
  categories,
  paymentMethods,
  onEdit,
  onDelete,
}: TransactionListItemProps) {
  const isExpense = transaction.type === 'expense';
  const category = categoryName(categories, transaction.category_id);
  const subcategory = transaction.subcategory_id ? categoryName(categories, transaction.subcategory_id) : '';
  const method = transaction.payment_method_id ? paymentMethodName(paymentMethods, transaction.payment_method_id) : '';

  return (
    <article className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                isExpense ? 'bg-warm/10 text-warm' : 'bg-mint/10 text-teal-700'
              }`}
            >
              {isExpense ? '지출' : '수입'}
            </span>
            <span className="text-xs font-semibold text-slate-500">{formatKoreanDate(transaction.transaction_date)}</span>
            {transaction.pending ? <span className="text-xs font-bold text-amber-600">대기</span> : null}
          </div>
          <h3 className="mt-2 truncate text-base font-black text-ink">
            {category}
            {subcategory ? ` · ${subcategory}` : ''}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {transaction.author_name}
            {method ? ` · ${method}` : ''}
            {transaction.is_fixed ? ' · 고정' : ''}
            {transaction.memo ? ` · ${transaction.memo}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-black ${isExpense ? 'text-warm' : 'text-teal-600'}`}>
            {isExpense ? '-' : '+'}
            {currencyFormatter.format(transaction.amount)}
          </p>
          <div className="mt-3 flex justify-end gap-1">
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(transaction)}
                className="rounded-lg p-2 text-slate-500 active:bg-slate-100"
                aria-label="수정"
                title="수정"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(transaction)}
                className="rounded-lg p-2 text-warm active:bg-orange-50"
                aria-label="삭제"
                title="삭제"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
