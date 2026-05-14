import type { AuthorName, TransactionFormValues } from '../types';
import { todayISO } from './date';

export const FAMILY_GROUP_NAME = '민다니 패밀리';
export const FAMILY_AUTHORS: AuthorName[] = ['민다니', '찌미찌미'];

export const EXPENSE_CATEGORY_NAMES = [
  '식비',
  '카페',
  '교통',
  '주거',
  '월세',
  '공과금',
  '통신비',
  '쇼핑',
  '생활용품',
  '의료',
  '문화생활',
  '여행',
  '고양이',
  '저축',
  '기타',
] as const;

export const CAT_SUBCATEGORY_NAMES = ['사료', '간식', '병원', '모래', '장난감', '용품'] as const;
export const INCOME_CATEGORY_NAMES = ['급여', '부수입', '환급', '기타'] as const;
export const PAYMENT_METHOD_NAMES = ['현금', '체크카드', '신용카드', '계좌이체', '간편결제', '기타'] as const;
export const RECURRING_LABELS = ['월세', '통신비', '보험', '구독료', '적금', '기타 고정비'] as const;

export const DEFAULT_INVITE_CODE = import.meta.env.VITE_DEFAULT_FAMILY_INVITE_CODE || 'MINDANI-FAMILY-2026';

export const emptyTransactionForm = (authorName: AuthorName): TransactionFormValues => ({
  type: 'expense',
  transaction_date: todayISO(),
  amount: '',
  category_id: '',
  subcategory_id: '',
  payment_method_id: '',
  author_name: authorName,
  memo: '',
  is_fixed: false,
  is_shared: false,
  split_months: '1',
});

export const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export const numberFormatter = new Intl.NumberFormat('ko-KR');
