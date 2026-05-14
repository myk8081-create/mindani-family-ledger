import type { Category, PaymentMethod, Transaction, TransactionType } from '../types';

export const activeOnly = <T extends { deleted_at: string | null; is_active?: boolean }>(items: T[]) =>
  items.filter((item) => !item.deleted_at && item.is_active !== false);

export const bySortOrder = <T extends { sort_order: number; name: string }>(left: T, right: T) =>
  left.sort_order - right.sort_order || left.name.localeCompare(right.name, 'ko');

export const findCategory = (categories: Category[], id: string | null | undefined) =>
  id ? categories.find((category) => category.id === id) ?? null : null;

export const findPaymentMethod = (methods: PaymentMethod[], id: string | null | undefined) =>
  id ? methods.find((method) => method.id === id) ?? null : null;

export const categoryName = (categories: Category[], id: string | null | undefined) =>
  findCategory(categories, id)?.name ?? '기타';

export const paymentMethodName = (methods: PaymentMethod[], id: string | null | undefined) =>
  findPaymentMethod(methods, id)?.name ?? '기타';

export const isCardTransaction = (transaction: Transaction, methods: PaymentMethod[]) => {
  const method = findPaymentMethod(methods, transaction.payment_method_id);
  return transaction.type === 'expense' && Boolean(method?.name.includes('카드'));
};

export const childCategories = (categories: Category[], parentId: string | null | undefined) =>
  activeOnly(categories)
    .filter((category) => category.parent_id === parentId)
    .sort(bySortOrder);

export const rootCategories = (categories: Category[], type: TransactionType) =>
  activeOnly(categories)
    .filter((category) => category.type === type && !category.parent_id)
    .sort(bySortOrder);

export const isCatTransaction = (transaction: Transaction, categories: Category[]) => {
  const category = findCategory(categories, transaction.category_id);
  const subcategory = findCategory(categories, transaction.subcategory_id);
  const parent = findCategory(categories, subcategory?.parent_id);
  return category?.name === '고양이' || parent?.name === '고양이' || subcategory?.name === '고양이';
};

export const normalizeAmount = (value: unknown) => Number(value ?? 0);
