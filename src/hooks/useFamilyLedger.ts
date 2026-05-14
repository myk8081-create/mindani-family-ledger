import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { DEFAULT_INVITE_CODE } from '../lib/constants';
import { addMonthsToDate, currentMonthKey, dateForMonthDay } from '../lib/date';
import {
  categoryName,
  findCategory,
  findPaymentMethod,
  normalizeAmount,
  paymentMethodName,
} from '../lib/ledger';
import { readJson, removeJson, writeJson } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type {
  AuthorName,
  BudgetKey,
  BudgetSetting,
  BudgetSettingsFormValues,
  Category,
  FamilyGroup,
  FamilyMember,
  LedgerBackup,
  PaymentMethod,
  Profile,
  RecurringFormValues,
  RecurringTransaction,
  SyncStatus,
  Transaction,
  TransactionFormValues,
  TransactionType,
} from '../types';

type QueueTable = 'transactions' | 'recurring_transactions';
type QueueAction = 'insert' | 'update' | 'soft-delete';

interface QueueItem {
  id: string;
  table: QueueTable;
  action: QueueAction;
  payload: Record<string, unknown>;
}

interface CacheSnapshot {
  profile: Profile | null;
  familyGroup: FamilyGroup | null;
  member: FamilyMember | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  budgetSettings: BudgetSetting[];
}

const emptySnapshot: CacheSnapshot = {
  profile: null,
  familyGroup: null,
  member: null,
  categories: [],
  paymentMethods: [],
  transactions: [],
  recurringTransactions: [],
  budgetSettings: [],
};

const isBrowserOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

const cacheName = (userId: string) => `cache:${userId}`;
const queueName = (userId: string) => `queue:${userId}`;

const nowISO = () => new Date().toISOString();

const cleanPayload = (payload: Record<string, unknown>) => {
  const copy = { ...payload };
  delete copy.pending;
  if (typeof copy.id === 'string' && copy.id.startsWith('offline-')) {
    delete copy.id;
  }
  return copy;
};

const rowToTransaction = (row: Record<string, unknown>): Transaction => ({
  id: String(row.id),
  family_group_id: String(row.family_group_id),
  user_id: String(row.user_id),
  type: row.type as TransactionType,
  transaction_date: String(row.transaction_date),
  amount: normalizeAmount(row.amount),
  category_id: String(row.category_id),
  subcategory_id: row.subcategory_id ? String(row.subcategory_id) : null,
  payment_method_id: row.payment_method_id ? String(row.payment_method_id) : null,
  author_name: row.author_name as AuthorName,
  memo: row.memo ? String(row.memo) : null,
  is_fixed: Boolean(row.is_fixed),
  is_shared: Boolean(row.is_shared),
  split_group_id: row.split_group_id ? String(row.split_group_id) : null,
  split_index: Number(row.split_index ?? 1),
  split_total: Number(row.split_total ?? 1),
  original_amount: row.original_amount ? normalizeAmount(row.original_amount) : null,
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
  deleted_at: row.deleted_at ? String(row.deleted_at) : null,
});

const rowToBudgetSetting = (row: Record<string, unknown>): BudgetSetting => ({
  id: String(row.id),
  family_group_id: String(row.family_group_id),
  budget_key: row.budget_key as BudgetKey,
  amount: normalizeAmount(row.amount),
  carryover_enabled: Boolean(row.carryover_enabled),
  carryover_start_date: row.carryover_start_date ? String(row.carryover_start_date) : null,
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

const rowToRecurring = (row: Record<string, unknown>): RecurringTransaction => ({
  id: String(row.id),
  family_group_id: String(row.family_group_id),
  user_id: String(row.user_id),
  recurring_label: String(row.recurring_label),
  amount: normalizeAmount(row.amount),
  day_of_month: Number(row.day_of_month),
  category_id: String(row.category_id),
  subcategory_id: row.subcategory_id ? String(row.subcategory_id) : null,
  payment_method_id: row.payment_method_id ? String(row.payment_method_id) : null,
  author_name: row.author_name as AuthorName,
  memo: row.memo ? String(row.memo) : null,
  is_active: Boolean(row.is_active),
  is_shared: Boolean(row.is_shared),
  last_generated_month: row.last_generated_month ? String(row.last_generated_month) : null,
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
  deleted_at: row.deleted_at ? String(row.deleted_at) : null,
});

const parseAmount = (value: string) => Number(value.replace(/,/g, '').trim());

export const useFamilyLedger = (user: User | null) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSetting[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isBrowserOnline);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isBrowserOnline() ? 'online' : 'offline');

  const persistSnapshot = useCallback(
    (snapshot: CacheSnapshot) => {
      if (!user) return;
      writeJson(cacheName(user.id), snapshot);
    },
    [user],
  );

  const applySnapshot = useCallback((snapshot: CacheSnapshot) => {
    setProfile(snapshot.profile);
    setFamilyGroup(snapshot.familyGroup);
    setMember(snapshot.member);
    setCategories(snapshot.categories);
    setPaymentMethods(snapshot.paymentMethods);
    setTransactions(snapshot.transactions);
    setRecurringTransactions(snapshot.recurringTransactions);
    setBudgetSettings(snapshot.budgetSettings);
  }, []);

  const loadCachedSnapshot = useCallback(() => {
    if (!user) {
      applySnapshot(emptySnapshot);
      return emptySnapshot;
    }
    const snapshot = readJson<CacheSnapshot>(cacheName(user.id), emptySnapshot);
    applySnapshot(snapshot);
    return snapshot;
  }, [applySnapshot, user]);

  const readQueue = useCallback(() => {
    if (!user) return [];
    return readJson<QueueItem[]>(queueName(user.id), []);
  }, [user]);

  const writeQueue = useCallback(
    (items: QueueItem[]) => {
      if (!user) return;
      writeJson(queueName(user.id), items);
    },
    [user],
  );

  const enqueue = useCallback(
    (item: Omit<QueueItem, 'id'>) => {
      if (!user) return;
      const queue = readQueue();
      writeQueue([...queue, { ...item, id: crypto.randomUUID() }]);
    },
    [readQueue, user, writeQueue],
  );

  const replaceQueuedInsert = useCallback(
    (table: QueueTable, offlineId: string, payload: Record<string, unknown>) => {
      const queue = readQueue();
      writeQueue(
        queue.map((item) =>
          item.table === table && item.action === 'insert' && item.payload.id === offlineId ? { ...item, payload } : item,
        ),
      );
    },
    [readQueue, writeQueue],
  );

  const removeQueuedInsert = useCallback(
    (table: QueueTable, offlineId: string) => {
      const queue = readQueue();
      writeQueue(
        queue.filter(
          (item) => !(item.table === table && item.action === 'insert' && item.payload.id === offlineId),
        ),
      );
    },
    [readQueue, writeQueue],
  );

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      applySnapshot(emptySnapshot);
      setLoading(false);
      return;
    }

    if (!isBrowserOnline()) {
      loadCachedSnapshot();
      setSyncStatus('offline');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    if (!memberData) {
      const profileResult = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const snapshot: CacheSnapshot = {
        ...emptySnapshot,
        profile: (profileResult.data as Profile | null) ?? null,
      };
      applySnapshot(snapshot);
      persistSnapshot(snapshot);
      setLoading(false);
      setSyncStatus('online');
      return;
    }

    await supabase.rpc('seed_family_defaults', { target_family_group_id: memberData.family_group_id });

    const [profileResult, familyResult, categoriesResult, paymentResult, transactionResult, recurringResult, budgetResult] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('family_groups').select('*').eq('id', memberData.family_group_id).single(),
        supabase
          .from('categories')
          .select('*')
          .eq('family_group_id', memberData.family_group_id)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true }),
        supabase
          .from('payment_methods')
          .select('*')
          .eq('family_group_id', memberData.family_group_id)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true }),
        supabase
          .from('transactions')
          .select('*')
          .eq('family_group_id', memberData.family_group_id)
          .is('deleted_at', null)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('recurring_transactions')
          .select('*')
          .eq('family_group_id', memberData.family_group_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('budget_settings')
          .select('*')
          .eq('family_group_id', memberData.family_group_id)
          .order('budget_key', { ascending: true }),
      ]);

    const firstError =
      profileResult.error ||
      familyResult.error ||
      categoriesResult.error ||
      paymentResult.error ||
      transactionResult.error ||
      recurringResult.error ||
      budgetResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const snapshot: CacheSnapshot = {
      profile: (profileResult.data as Profile | null) ?? null,
      familyGroup: familyResult.data as FamilyGroup,
      member: memberData as FamilyMember,
      categories: (categoriesResult.data as Category[]) ?? [],
      paymentMethods: (paymentResult.data as PaymentMethod[]) ?? [],
      transactions: ((transactionResult.data as Record<string, unknown>[]) ?? []).map(rowToTransaction),
      recurringTransactions: ((recurringResult.data as Record<string, unknown>[]) ?? []).map(rowToRecurring),
      budgetSettings: ((budgetResult.data as Record<string, unknown>[]) ?? []).map(rowToBudgetSetting),
    };

    applySnapshot(snapshot);
    persistSnapshot(snapshot);
    setLoading(false);
    setSyncStatus('online');
  }, [applySnapshot, loadCachedSnapshot, persistSnapshot, user]);

  const flushQueue = useCallback(async () => {
    if (!user || !supabase || !familyGroup || !isBrowserOnline()) return;
    const queue = readQueue();
    if (queue.length === 0) return;

    setSyncStatus('syncing');
    const remaining: QueueItem[] = [];

    for (const item of queue) {
      const payload = cleanPayload(item.payload);
      const table = supabase.from(item.table);
      let result;

      if (item.action === 'insert') {
        result = await table.insert(payload);
      } else if (item.action === 'update') {
        const id = String(item.payload.id);
        result = await table.update(payload).eq('id', id).eq('family_group_id', familyGroup.id);
      } else {
        const id = String(item.payload.id);
        result = await table.update({ deleted_at: nowISO() }).eq('id', id).eq('family_group_id', familyGroup.id);
      }

      if (result.error) {
        remaining.push(item);
      }
    }

    writeQueue(remaining);
    if (remaining.length > 0) {
      setError('일부 오프라인 변경 사항을 아직 동기화하지 못했습니다.');
    }
    await refresh();
  }, [familyGroup, readQueue, refresh, user, writeQueue]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setSyncStatus('online');
    };
    const onOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      applySnapshot(emptySnapshot);
      setLoading(false);
      return;
    }
    loadCachedSnapshot();
    void refresh();
  }, [applySnapshot, loadCachedSnapshot, refresh, user]);

  useEffect(() => {
    if (isOnline) void flushQueue();
  }, [flushQueue, isOnline]);

  useEffect(() => {
    const client = supabase;
    if (!client || !familyGroup || !isOnline) return undefined;

    const channel = client
      .channel(`family-ledger-${familyGroup.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `family_group_id=eq.${familyGroup.id}` },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_transactions',
          filter: `family_group_id=eq.${familyGroup.id}`,
        },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `family_group_id=eq.${familyGroup.id}` },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budget_settings', filter: `family_group_id=eq.${familyGroup.id}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [familyGroup, isOnline, refresh]);

  const claimFamilyMember = useCallback(
    async (displayName: AuthorName) => {
      if (!user || !supabase) return;
      setError(null);
      const { error: rpcError } = await supabase.rpc('claim_default_family_member', {
        member_name: displayName,
        family_code: DEFAULT_INVITE_CODE,
      });
      if (rpcError) {
        setError(rpcError.message);
        throw rpcError;
      }
      await refresh();
    },
    [refresh, user],
  );

  const updateLocalTransactions = useCallback(
    (nextTransactions: Transaction[]) => {
      setTransactions(nextTransactions);
      persistSnapshot({
        profile,
        familyGroup,
        member,
        categories,
        paymentMethods,
        transactions: nextTransactions,
        recurringTransactions,
        budgetSettings,
      });
    },
    [budgetSettings, categories, familyGroup, member, paymentMethods, persistSnapshot, profile, recurringTransactions],
  );

  const updateLocalRecurring = useCallback(
    (nextRecurring: RecurringTransaction[]) => {
      setRecurringTransactions(nextRecurring);
      persistSnapshot({
        profile,
        familyGroup,
        member,
        categories,
        paymentMethods,
        transactions,
        recurringTransactions: nextRecurring,
        budgetSettings,
      });
    },
    [budgetSettings, categories, familyGroup, member, paymentMethods, persistSnapshot, profile, transactions],
  );

  const saveBudgetSettings = useCallback(
    async (values: BudgetSettingsFormValues) => {
      if (!user || !familyGroup || !supabase || !isBrowserOnline()) {
        throw new Error('예산 설정은 온라인 상태에서 저장할 수 있습니다.');
      }

      const weeklyAmount = Math.max(0, parseAmount(values.weekly_amount || '0') || 0);
      const monthlyAmount = Math.max(0, parseAmount(values.monthly_amount || '0') || 0);
      const startDate = currentMonthKey() + '-01';
      const rows = [
        {
          family_group_id: familyGroup.id,
          budget_key: 'shared_weekly' as BudgetKey,
          amount: weeklyAmount,
          carryover_enabled: values.weekly_carryover_enabled,
          carryover_start_date: startDate,
        },
        {
          family_group_id: familyGroup.id,
          budget_key: 'shared_monthly' as BudgetKey,
          amount: monthlyAmount,
          carryover_enabled: values.monthly_carryover_enabled,
          carryover_start_date: startDate,
        },
      ];

      const { error: budgetError } = await supabase
        .from('budget_settings')
        .upsert(rows, { onConflict: 'family_group_id,budget_key' });
      if (budgetError) throw budgetError;
      await refresh();
    },
    [familyGroup, refresh, user],
  );

  const saveTransaction = useCallback(
    async (values: TransactionFormValues, editingId?: string) => {
      if (!user || !familyGroup) throw new Error('가족 그룹이 준비되지 않았습니다.');
      const amount = parseAmount(values.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('금액을 확인해 주세요.');
      if (!values.category_id) throw new Error('카테고리를 선택해 주세요.');

      const payload = {
        family_group_id: familyGroup.id,
        user_id: user.id,
        type: values.type,
        transaction_date: values.transaction_date,
        amount,
        category_id: values.category_id,
        subcategory_id: values.subcategory_id || null,
        payment_method_id: values.payment_method_id || null,
        author_name: values.author_name,
        memo: values.memo.trim() || null,
        is_fixed: values.is_fixed,
        is_shared: values.type === 'expense' ? values.is_shared : false,
        deleted_at: null,
      };

      const splitMonths =
        !editingId && values.type === 'expense'
          ? Math.min(24, Math.max(1, Number(values.split_months) || 1))
          : 1;

      const buildSplitPayloads = () => {
        if (splitMonths <= 1) {
          return [
            {
              ...payload,
              split_group_id: null,
              split_index: 1,
              split_total: 1,
              original_amount: null,
            },
          ];
        }
        const splitGroupId = crypto.randomUUID();
        const baseAmount = Math.floor(amount / splitMonths);
        const remainder = amount - baseAmount * splitMonths;
        return Array.from({ length: splitMonths }, (_, index) => ({
          ...payload,
          transaction_date: addMonthsToDate(values.transaction_date, index),
          amount: baseAmount + (index < remainder ? 1 : 0),
          memo: values.memo.trim()
            ? `${values.memo.trim()} (${index + 1}/${splitMonths})`
            : `분할 지출 (${index + 1}/${splitMonths})`,
          split_group_id: splitGroupId,
          split_index: index + 1,
          split_total: splitMonths,
          original_amount: amount,
        }));
      };

      if (supabase && isBrowserOnline()) {
        const result = editingId
          ? await supabase
              .from('transactions')
              .update({ ...payload, updated_at: nowISO() })
              .eq('id', editingId)
              .eq('family_group_id', familyGroup.id)
          : await supabase.from('transactions').insert(buildSplitPayloads() as Record<string, unknown>[]);

        if (result.error) throw result.error;
        await refresh();
        return;
      }

      const timestamp = nowISO();
      if (editingId) {
        let updatedOfflineTransaction: Transaction | null = null;
        const next = transactions.map((transaction) => {
          if (transaction.id !== editingId) return transaction;
          updatedOfflineTransaction = { ...transaction, ...payload, updated_at: timestamp, pending: true };
          return updatedOfflineTransaction;
        });
        updateLocalTransactions(next);
        if (editingId.startsWith('offline-') && updatedOfflineTransaction) {
          replaceQueuedInsert('transactions', editingId, updatedOfflineTransaction as unknown as Record<string, unknown>);
        } else {
          enqueue({ table: 'transactions', action: 'update', payload: { id: editingId, ...payload } });
        }
      } else {
        const offlineTransactions: Transaction[] = buildSplitPayloads().map((splitPayload) => ({
          id: `offline-${crypto.randomUUID()}`,
          created_at: timestamp,
          updated_at: timestamp,
          pending: true,
          ...splitPayload,
        }));
        updateLocalTransactions([...offlineTransactions, ...transactions]);
        offlineTransactions.forEach((offlineTransaction) => {
          enqueue({
            table: 'transactions',
            action: 'insert',
            payload: { ...offlineTransaction } as Record<string, unknown>,
          });
        });
      }
      setSyncStatus('offline');
    },
    [enqueue, familyGroup, refresh, replaceQueuedInsert, transactions, updateLocalTransactions, user],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!familyGroup) return;
      if (supabase && isBrowserOnline() && !id.startsWith('offline-')) {
        const { error: deleteError } = await supabase
          .from('transactions')
          .update({ deleted_at: nowISO(), updated_at: nowISO() })
          .eq('id', id)
          .eq('family_group_id', familyGroup.id);
        if (deleteError) throw deleteError;
        await refresh();
        return;
      }

      updateLocalTransactions(transactions.filter((transaction) => transaction.id !== id));
      if (!id.startsWith('offline-')) {
        enqueue({ table: 'transactions', action: 'soft-delete', payload: { id } });
      } else {
        removeQueuedInsert('transactions', id);
      }
    },
    [enqueue, familyGroup, refresh, removeQueuedInsert, transactions, updateLocalTransactions],
  );

  const saveRecurring = useCallback(
    async (values: RecurringFormValues, editingId?: string) => {
      if (!user || !familyGroup) throw new Error('가족 그룹이 준비되지 않았습니다.');
      const amount = parseAmount(values.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('금액을 확인해 주세요.');
      if (!values.category_id) throw new Error('카테고리를 선택해 주세요.');

      const payload = {
        family_group_id: familyGroup.id,
        user_id: user.id,
        recurring_label: values.recurring_label,
        amount,
        day_of_month: Math.min(31, Math.max(1, Number(values.day_of_month) || 1)),
        category_id: values.category_id,
        subcategory_id: values.subcategory_id || null,
        payment_method_id: values.payment_method_id || null,
        author_name: values.author_name,
        memo: values.memo.trim() || null,
        is_active: values.is_active,
        is_shared: values.is_shared,
        deleted_at: null,
      };

      if (supabase && isBrowserOnline()) {
        const result = editingId
          ? await supabase
              .from('recurring_transactions')
              .update({ ...payload, updated_at: nowISO() })
              .eq('id', editingId)
              .eq('family_group_id', familyGroup.id)
          : await supabase.from('recurring_transactions').insert(payload);
        if (result.error) throw result.error;
        await refresh();
        return;
      }

      const timestamp = nowISO();
      if (editingId) {
        let updatedOfflineRecurring: RecurringTransaction | null = null;
        const next = recurringTransactions.map((item) => {
          if (item.id !== editingId) return item;
          updatedOfflineRecurring = { ...item, ...payload, updated_at: timestamp, pending: true };
          return updatedOfflineRecurring;
        });
        updateLocalRecurring(next);
        if (editingId.startsWith('offline-') && updatedOfflineRecurring) {
          replaceQueuedInsert(
            'recurring_transactions',
            editingId,
            updatedOfflineRecurring as unknown as Record<string, unknown>,
          );
        } else {
          enqueue({ table: 'recurring_transactions', action: 'update', payload: { id: editingId, ...payload } });
        }
      } else {
        const offlineRecurring: RecurringTransaction = {
          id: `offline-${crypto.randomUUID()}`,
          last_generated_month: null,
          created_at: timestamp,
          updated_at: timestamp,
          pending: true,
          ...payload,
        };
        updateLocalRecurring([offlineRecurring, ...recurringTransactions]);
        enqueue({
          table: 'recurring_transactions',
          action: 'insert',
          payload: { ...offlineRecurring } as Record<string, unknown>,
        });
      }
      setSyncStatus('offline');
    },
    [enqueue, familyGroup, recurringTransactions, refresh, replaceQueuedInsert, updateLocalRecurring, user],
  );

  const deleteRecurring = useCallback(
    async (id: string) => {
      if (!familyGroup) return;
      if (supabase && isBrowserOnline() && !id.startsWith('offline-')) {
        const { error: deleteError } = await supabase
          .from('recurring_transactions')
          .update({ deleted_at: nowISO(), updated_at: nowISO() })
          .eq('id', id)
          .eq('family_group_id', familyGroup.id);
        if (deleteError) throw deleteError;
        await refresh();
        return;
      }
      updateLocalRecurring(recurringTransactions.filter((item) => item.id !== id));
      if (!id.startsWith('offline-')) {
        enqueue({ table: 'recurring_transactions', action: 'soft-delete', payload: { id } });
      } else {
        removeQueuedInsert('recurring_transactions', id);
      }
    },
    [enqueue, familyGroup, recurringTransactions, refresh, removeQueuedInsert, updateLocalRecurring],
  );

  const generateRecurringForMonth = useCallback(
    async (month = currentMonthKey()) => {
      const client = supabase;
      if (!user || !familyGroup || !client || !isBrowserOnline()) {
        throw new Error('반복 지출 생성은 온라인 상태에서 사용할 수 있습니다.');
      }

      const targets = recurringTransactions.filter(
        (item) => item.is_active && !item.deleted_at && item.last_generated_month !== month,
      );

      if (targets.length === 0) return 0;

      const transactionRows = targets.map((item) => ({
        family_group_id: familyGroup.id,
        user_id: user.id,
        type: 'expense' as const,
        transaction_date: dateForMonthDay(month, item.day_of_month),
        amount: item.amount,
        category_id: item.category_id,
        subcategory_id: item.subcategory_id,
        payment_method_id: item.payment_method_id,
        author_name: item.author_name,
        memo: item.memo || item.recurring_label,
        is_fixed: true,
        is_shared: item.is_shared,
      }));

      const insertResult = await client.from('transactions').insert(transactionRows);
      if (insertResult.error) throw insertResult.error;

      await Promise.all(
        targets.map((item) =>
          client
            .from('recurring_transactions')
            .update({ last_generated_month: month, updated_at: nowISO() })
            .eq('id', item.id)
            .eq('family_group_id', familyGroup.id),
        ),
      );

      await refresh();
      return targets.length;
    },
    [familyGroup, recurringTransactions, refresh, user],
  );

  const buildBackup = useCallback((): LedgerBackup => {
    const transactionsWithNames = transactions.map((transaction) => ({
      ...transaction,
      category_name: categoryName(categories, transaction.category_id),
      subcategory_name: transaction.subcategory_id ? categoryName(categories, transaction.subcategory_id) : undefined,
      payment_method_name: transaction.payment_method_id
        ? paymentMethodName(paymentMethods, transaction.payment_method_id)
        : undefined,
    }));

    const recurringWithNames = recurringTransactions.map((item) => ({
      ...item,
      category_name: categoryName(categories, item.category_id),
      subcategory_name: item.subcategory_id ? categoryName(categories, item.subcategory_id) : undefined,
      payment_method_name: item.payment_method_id ? paymentMethodName(paymentMethods, item.payment_method_id) : undefined,
    }));

    return {
      app: 'mindani-family-ledger',
      exported_at: nowISO(),
      family_group: familyGroup,
      transactions: transactionsWithNames,
      recurring_transactions: recurringWithNames,
      budget_settings: budgetSettings,
      categories,
      payment_methods: paymentMethods,
    };
  }, [budgetSettings, categories, familyGroup, paymentMethods, recurringTransactions, transactions]);

  const restoreBackup = useCallback(
    async (backup: LedgerBackup) => {
      if (!user || !familyGroup || !supabase || !isBrowserOnline()) {
        throw new Error('복원은 온라인 상태에서 사용할 수 있습니다.');
      }

      const backupCategoryName = (id: string | null | undefined) =>
        backup.categories.find((category) => category.id === id)?.name;
      const backupPaymentName = (id: string | null | undefined) =>
        backup.payment_methods.find((method) => method.id === id)?.name;

      const categoryByName = (type: TransactionType, name?: string) =>
        categories.find((category) => category.type === type && category.name === name && !category.parent_id) ??
        categories.find((category) => category.type === type && category.name === '기타' && !category.parent_id) ??
        categories.find((category) => category.type === type && !category.parent_id);

      const childByName = (parentId: string | null | undefined, name?: string) =>
        parentId && name
          ? categories.find((category) => category.parent_id === parentId && category.name === name) ?? null
          : null;

      const paymentByName = (name?: string) =>
        paymentMethods.find((method) => method.name === name) ??
        paymentMethods.find((method) => method.name === '기타') ??
        paymentMethods[0];

      const transactionRows = backup.transactions
        .filter((transaction) => !transaction.deleted_at)
        .map((transaction) => {
          const category = categoryByName(
            transaction.type,
            transaction.category_name ?? backupCategoryName(transaction.category_id),
          );
          const subcategory = childByName(
            category?.id,
            transaction.subcategory_name ?? backupCategoryName(transaction.subcategory_id),
          );
          const method = paymentByName(transaction.payment_method_name ?? backupPaymentName(transaction.payment_method_id));
          return {
            family_group_id: familyGroup.id,
            user_id: user.id,
            type: transaction.type,
            transaction_date: transaction.transaction_date,
            amount: transaction.amount,
            category_id: category?.id,
            subcategory_id: subcategory?.id ?? null,
            payment_method_id: method?.id ?? null,
            author_name: transaction.author_name,
            memo: transaction.memo,
            is_fixed: transaction.is_fixed,
            is_shared: transaction.is_shared,
            split_group_id: transaction.split_group_id,
            split_index: transaction.split_index ?? 1,
            split_total: transaction.split_total ?? 1,
            original_amount: transaction.original_amount,
          };
        })
        .filter((transaction) => transaction.category_id);

      const recurringRows = backup.recurring_transactions
        .filter((item) => !item.deleted_at)
        .map((item) => {
          const category = categoryByName('expense', item.category_name ?? backupCategoryName(item.category_id));
          const subcategory = childByName(category?.id, item.subcategory_name ?? backupCategoryName(item.subcategory_id));
          const method = paymentByName(item.payment_method_name ?? backupPaymentName(item.payment_method_id));
          return {
            family_group_id: familyGroup.id,
            user_id: user.id,
            recurring_label: item.recurring_label,
            amount: item.amount,
            day_of_month: item.day_of_month,
            category_id: category?.id,
            subcategory_id: subcategory?.id ?? null,
            payment_method_id: method?.id ?? null,
            author_name: item.author_name,
            memo: item.memo,
            is_active: item.is_active,
            is_shared: item.is_shared,
            last_generated_month: item.last_generated_month,
          };
        })
        .filter((item) => item.category_id);

      if (transactionRows.length > 0) {
        const { error: transactionError } = await supabase.from('transactions').insert(transactionRows);
        if (transactionError) throw transactionError;
      }

      if (recurringRows.length > 0) {
        const { error: recurringError } = await supabase.from('recurring_transactions').insert(recurringRows);
        if (recurringError) throw recurringError;
      }

      if (backup.budget_settings?.length > 0) {
        const budgetRows = backup.budget_settings.map((setting) => ({
          family_group_id: familyGroup.id,
          budget_key: setting.budget_key,
          amount: setting.amount,
          carryover_enabled: setting.carryover_enabled,
          carryover_start_date: setting.carryover_start_date,
        }));
        const { error: budgetError } = await supabase
          .from('budget_settings')
          .upsert(budgetRows, { onConflict: 'family_group_id,budget_key' });
        if (budgetError) throw budgetError;
      }

      await refresh();
    },
    [categories, familyGroup, paymentMethods, refresh, user],
  );

  const resetData = useCallback(async () => {
    if (!familyGroup || !supabase || !isBrowserOnline()) {
      throw new Error('초기화는 온라인 상태에서 사용할 수 있습니다.');
    }
    const timestamp = nowISO();
    const [transactionsResult, recurringResult] = await Promise.all([
      supabase
        .from('transactions')
        .update({ deleted_at: timestamp, updated_at: timestamp })
        .eq('family_group_id', familyGroup.id)
        .is('deleted_at', null),
      supabase
        .from('recurring_transactions')
        .update({ deleted_at: timestamp, updated_at: timestamp })
        .eq('family_group_id', familyGroup.id)
        .is('deleted_at', null),
    ]);

    if (transactionsResult.error) throw transactionsResult.error;
    if (recurringResult.error) throw recurringResult.error;
    if (user) removeJson(queueName(user.id));
    await refresh();
  }, [familyGroup, refresh, user]);

  const queueCount = user ? readQueue().length : 0;
  const onboardingRequired = Boolean(user && !member && !loading);

  return useMemo(
    () => ({
      profile,
      familyGroup,
      member,
      categories,
      paymentMethods,
      transactions,
      recurringTransactions,
      budgetSettings,
      loading,
      error,
      isOnline,
      syncStatus,
      queueCount,
      onboardingRequired,
      refresh,
      claimFamilyMember,
      saveTransaction,
      deleteTransaction,
      saveRecurring,
      deleteRecurring,
      generateRecurringForMonth,
      saveBudgetSettings,
      buildBackup,
      restoreBackup,
      resetData,
      findCategory: (id: string | null | undefined) => findCategory(categories, id),
      findPaymentMethod: (id: string | null | undefined) => findPaymentMethod(paymentMethods, id),
    }),
    [
      buildBackup,
      budgetSettings,
      categories,
      claimFamilyMember,
      deleteRecurring,
      deleteTransaction,
      error,
      familyGroup,
      generateRecurringForMonth,
      isOnline,
      loading,
      member,
      onboardingRequired,
      paymentMethods,
      profile,
      queueCount,
      recurringTransactions,
      refresh,
      resetData,
      restoreBackup,
      saveRecurring,
      saveBudgetSettings,
      saveTransaction,
      syncStatus,
      transactions,
    ],
  );
};
