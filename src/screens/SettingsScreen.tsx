import { Download, LogOut, Repeat, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FAMILY_GROUP_NAME } from '../lib/constants';
import { categoryName, paymentMethodName } from '../lib/ledger';
import type {
  BudgetSetting,
  BudgetSettingsFormValues,
  Category,
  FamilyGroup,
  LedgerBackup,
  PaymentMethod,
  Transaction,
} from '../types';

interface SettingsScreenProps {
  familyGroup: FamilyGroup | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  budgetSettings: BudgetSetting[];
  buildBackup: () => LedgerBackup;
  restoreBackup: (backup: LedgerBackup) => Promise<void>;
  resetData: () => Promise<void>;
  saveBudgetSettings: (values: BudgetSettingsFormValues) => Promise<void>;
  onOpenRecurring: () => void;
  onSignOut: () => Promise<void> | void;
}

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const csvCell = (value: string | number | null | undefined) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const buildCsv = (transactions: Transaction[], categories: Category[], paymentMethods: PaymentMethod[]) => {
  const header = [
    '날짜',
    '구분',
    '금액',
    '카테고리',
    '세부카테고리',
    '결제수단',
    '작성자',
    '공동생활비',
    '고정지출',
    '메모',
  ];
  const rows = transactions.map((transaction) => [
    transaction.transaction_date,
    transaction.type === 'expense' ? '지출' : '수입',
    transaction.amount,
    categoryName(categories, transaction.category_id),
    transaction.subcategory_id ? categoryName(categories, transaction.subcategory_id) : '',
    transaction.payment_method_id ? paymentMethodName(paymentMethods, transaction.payment_method_id) : '',
    transaction.author_name,
    transaction.is_shared ? 'Y' : 'N',
    transaction.is_fixed ? 'Y' : 'N',
    transaction.memo ?? '',
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
};

const cardClass = 'rounded-lg border border-slate-100 bg-white p-5 shadow-soft';

export function SettingsScreen({
  familyGroup,
  categories,
  paymentMethods,
  transactions,
  budgetSettings,
  buildBackup,
  restoreBackup,
  resetData,
  saveBudgetSettings,
  onOpenRecurring,
  onSignOut,
}: SettingsScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [budgetValues, setBudgetValues] = useState<BudgetSettingsFormValues>({
    weekly_amount: '',
    weekly_carryover_enabled: false,
    monthly_amount: '',
    monthly_carryover_enabled: false,
  });

  useEffect(() => {
    const weekly = budgetSettings.find((setting) => setting.budget_key === 'shared_weekly');
    const monthly = budgetSettings.find((setting) => setting.budget_key === 'shared_monthly');
    setBudgetValues({
      weekly_amount: weekly?.amount ? String(weekly.amount) : '',
      weekly_carryover_enabled: weekly?.carryover_enabled ?? false,
      monthly_amount: monthly?.amount ? String(monthly.amount) : '',
      monthly_carryover_enabled: monthly?.carryover_enabled ?? false,
    });
  }, [budgetSettings]);

  const exportCsv = () => {
    const csv = buildCsv(transactions, categories, paymentMethods);
    downloadFile(`mindani-ledger-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8');
  };

  const exportJson = () => {
    downloadFile(
      `mindani-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(buildBackup(), null, 2),
      'application/json;charset=utf-8',
    );
  };

  const handleRestore = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(await file.text()) as LedgerBackup;
      if (parsed.app !== 'mindani-family-ledger') throw new Error('지원하지 않는 백업 파일입니다.');
      await restoreBackup(parsed);
      setMessage('복원되었습니다.');
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : '복원하지 못했습니다.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    if (!window.confirm('전체 거래와 반복 지출을 초기화할까요?')) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await resetData();
      setMessage('초기화되었습니다.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : '초기화하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleBudgetSave = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await saveBudgetSettings(budgetValues);
      setMessage('공동생활비 한도가 저장되었습니다.');
    } catch (budgetError) {
      setError(budgetError instanceof Error ? budgetError.message : '한도를 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-lg bg-navy p-5 text-white shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-100">가족 그룹</p>
            <h2 className="mt-2 text-3xl font-black tracking-normal">{familyGroup?.name ?? FAMILY_GROUP_NAME}</h2>
          </div>
          {familyGroup?.invite_code ? (
            <div className="rounded-lg bg-white/10 px-4 py-3 text-sm font-black text-blue-100">
              {familyGroup.invite_code}
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <section className={cardClass}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-ink">공동생활비 한도</h2>
              <button
                type="button"
                onClick={() => void handleBudgetSave()}
                disabled={busy}
                className="min-h-11 rounded-lg bg-navy px-5 text-sm font-black text-white shadow-soft disabled:opacity-60"
              >
                저장
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">주간 한도</span>
                  <input
                    value={budgetValues.weekly_amount}
                    onChange={(event) =>
                      setBudgetValues((previous) => ({
                        ...previous,
                        weekly_amount: event.target.value.replace(/[^\d,]/g, ''),
                      }))
                    }
                    inputMode="numeric"
                    placeholder="0"
                    className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-right font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="mt-3 flex min-h-12 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 font-bold text-ink">
                  <span>주간 이월</span>
                  <input
                    type="checkbox"
                    checked={budgetValues.weekly_carryover_enabled}
                    onChange={(event) =>
                      setBudgetValues((previous) => ({ ...previous, weekly_carryover_enabled: event.target.checked }))
                    }
                    className="h-5 w-5 rounded border-slate-300 text-ocean focus:ring-ocean"
                  />
                </label>
              </div>

              <div className="rounded-lg border border-blue-100 bg-skywash p-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">월간 한도</span>
                  <input
                    value={budgetValues.monthly_amount}
                    onChange={(event) =>
                      setBudgetValues((previous) => ({
                        ...previous,
                        monthly_amount: event.target.value.replace(/[^\d,]/g, ''),
                      }))
                    }
                    inputMode="numeric"
                    placeholder="0"
                    className="mt-2 h-12 w-full rounded-lg border border-blue-100 bg-white px-3 text-right font-bold outline-none focus:border-ocean focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="mt-3 flex min-h-12 items-center justify-between rounded-lg border border-blue-100 bg-white px-4 font-bold text-ink">
                  <span>월간 이월</span>
                  <input
                    type="checkbox"
                    checked={budgetValues.monthly_carryover_enabled}
                    onChange={(event) =>
                      setBudgetValues((previous) => ({ ...previous, monthly_carryover_enabled: event.target.checked }))
                    }
                    className="h-5 w-5 rounded border-slate-300 text-ocean focus:ring-ocean"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-black text-ink">백업과 복원</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 font-black text-ink"
              >
                <Download className="h-4 w-4" aria-hidden />
                CSV
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 font-black text-ink"
              >
                <Download className="h-4 w-4" aria-hidden />
                JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-blue-100 bg-skywash px-4 font-black text-navy disabled:opacity-60"
              >
                <Upload className="h-4 w-4" aria-hidden />
                JSON 복원
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleRestore(event.target.files?.[0])}
            />
          </section>
        </div>

        <aside className="space-y-5">
          <section className={cardClass}>
            <h2 className="text-xl font-black text-ink">반복 지출</h2>
            <button
              type="button"
              onClick={onOpenRecurring}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 font-black text-white shadow-soft"
            >
              <Repeat className="h-5 w-5" aria-hidden />
              반복 지출 관리
            </button>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-black text-ink">데이터</h2>
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={busy}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-warm px-4 font-black text-white shadow-soft disabled:opacity-60"
            >
              <RotateCcw className="h-5 w-5" aria-hidden />
              전체 데이터 초기화
            </button>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-black text-ink">계정</h2>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 font-black text-slate-700"
            >
              <LogOut className="h-5 w-5" aria-hidden />
              로그아웃
            </button>
          </section>
        </aside>
      </div>

      {error ? <p className="rounded-lg bg-warm/10 px-4 py-3 text-sm font-bold text-warm">{error}</p> : null}
      {message ? <p className="rounded-lg bg-mint/10 px-4 py-3 text-sm font-bold text-teal-700">{message}</p> : null}
    </div>
  );
}
