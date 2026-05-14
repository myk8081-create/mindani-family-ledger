import { Download, LogOut, Repeat, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { FAMILY_GROUP_NAME } from '../lib/constants';
import { categoryName, paymentMethodName } from '../lib/ledger';
import type { Category, FamilyGroup, LedgerBackup, PaymentMethod, Transaction } from '../types';

interface SettingsScreenProps {
  familyGroup: FamilyGroup | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  buildBackup: () => LedgerBackup;
  restoreBackup: (backup: LedgerBackup) => Promise<void>;
  resetData: () => Promise<void>;
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

export function SettingsScreen({
  familyGroup,
  categories,
  paymentMethods,
  transactions,
  buildBackup,
  restoreBackup,
  resetData,
  onOpenRecurring,
  onSignOut,
}: SettingsScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">가족 그룹</h2>
        <div className="mt-4 rounded-lg bg-skywash p-4">
          <p className="text-sm font-bold text-slate-500">그룹명</p>
          <p className="mt-1 text-xl font-black text-navy">{familyGroup?.name ?? FAMILY_GROUP_NAME}</p>
          {familyGroup?.invite_code ? <p className="mt-2 text-sm font-bold text-slate-500">{familyGroup.invite_code}</p> : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">반복 지출</h2>
        <button
          type="button"
          onClick={onOpenRecurring}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 font-black text-white shadow-soft"
        >
          <Repeat className="h-5 w-5" aria-hidden />
          반복 지출 관리
        </button>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">백업</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
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
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-blue-100 bg-skywash px-4 font-black text-navy disabled:opacity-60"
        >
          <Upload className="h-4 w-4" aria-hidden />
          JSON 복원
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleRestore(event.target.files?.[0])}
        />
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">데이터</h2>
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={busy}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-warm px-4 font-black text-white shadow-soft disabled:opacity-60"
        >
          <RotateCcw className="h-5 w-5" aria-hidden />
          전체 데이터 초기화
        </button>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">계정</h2>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 font-black text-slate-700"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          로그아웃
        </button>
      </section>

      {error ? <p className="rounded-lg bg-warm/10 px-4 py-3 text-sm font-bold text-warm">{error}</p> : null}
      {message ? <p className="rounded-lg bg-mint/10 px-4 py-3 text-sm font-bold text-teal-700">{message}</p> : null}
    </div>
  );
}
