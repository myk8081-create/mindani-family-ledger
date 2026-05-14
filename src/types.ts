import type { User } from '@supabase/supabase-js';

export type TransactionType = 'income' | 'expense';
export type AuthorName = '민다니' | '찌미찌미';
export type AppScreen = 'home' | 'entry' | 'history' | 'stats' | 'settings' | 'recurring';
export type SyncStatus = 'online' | 'offline' | 'syncing';
export type BudgetKey = 'shared_weekly' | 'shared_monthly';

export interface Profile {
  id: string;
  display_name: AuthorName;
  created_at: string;
  updated_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  family_group_id: string;
  user_id: string;
  display_name: AuthorName;
  role: 'owner' | 'member';
  created_at: string;
}

export interface Category {
  id: string;
  family_group_id: string;
  type: TransactionType;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PaymentMethod {
  id: string;
  family_group_id: string;
  name: string;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Transaction {
  id: string;
  family_group_id: string;
  user_id: string;
  type: TransactionType;
  transaction_date: string;
  amount: number;
  category_id: string;
  subcategory_id: string | null;
  payment_method_id: string | null;
  author_name: AuthorName;
  memo: string | null;
  is_fixed: boolean;
  is_shared: boolean;
  split_group_id: string | null;
  split_index: number;
  split_total: number;
  original_amount: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pending?: boolean;
}

export interface RecurringTransaction {
  id: string;
  family_group_id: string;
  user_id: string;
  recurring_label: string;
  amount: number;
  day_of_month: number;
  category_id: string;
  subcategory_id: string | null;
  payment_method_id: string | null;
  author_name: AuthorName;
  memo: string | null;
  is_active: boolean;
  is_shared: boolean;
  last_generated_month: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pending?: boolean;
}

export interface TransactionFormValues {
  type: TransactionType;
  transaction_date: string;
  amount: string;
  category_id: string;
  subcategory_id: string;
  payment_method_id: string;
  author_name: AuthorName;
  memo: string;
  is_fixed: boolean;
  is_shared: boolean;
  split_months: string;
}

export interface RecurringFormValues {
  recurring_label: string;
  amount: string;
  day_of_month: string;
  category_id: string;
  subcategory_id: string;
  payment_method_id: string;
  author_name: AuthorName;
  memo: string;
  is_active: boolean;
  is_shared: boolean;
}

export interface BudgetSetting {
  id: string;
  family_group_id: string;
  budget_key: BudgetKey;
  amount: number;
  carryover_enabled: boolean;
  carryover_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetSettingsFormValues {
  weekly_amount: string;
  weekly_carryover_enabled: boolean;
  monthly_amount: string;
  monthly_carryover_enabled: boolean;
}

export interface LedgerBackup {
  app: 'mindani-family-ledger';
  exported_at: string;
  family_group: FamilyGroup | null;
  transactions: Array<Transaction & { category_name?: string; subcategory_name?: string; payment_method_name?: string }>;
  recurring_transactions: Array<
    RecurringTransaction & { category_name?: string; subcategory_name?: string; payment_method_name?: string }
  >;
  budget_settings: BudgetSetting[];
  categories: Category[];
  payment_methods: PaymentMethod[];
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface DashboardSummary {
  income: number;
  expense: number;
  balance: number;
  mindaniExpense: number;
  jjimiExpense: number;
  sharedExpense: number;
  catExpense: number;
  topCategories: Array<{ name: string; value: number }>;
}

export interface ChartPoint {
  name: string;
  income?: number;
  expense?: number;
  value?: number;
  민다니?: number;
  찌미찌미?: number;
}
