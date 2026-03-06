import { useState } from 'react';
import { saveExpenses, updateDemoTrip } from '../hooks/useTrips';
import { useExchangeRate, detectCurrency, getCurrencySymbol } from '../hooks/useExchangeRate';
import { useToast } from '../contexts/ToastContext';
import { SaveCancelButtons } from './InlineEditButtons';
import { EXPENSE_CATEGORIES } from '../constants/tripConstants';
import { expenseCategoryLabel, formatCurrency } from '../utils/format';
import type { Expense } from '../types/trip';

interface Props {
  tripId: string;
  isDemo: boolean;
  isCompleted: boolean;
  initialExpenses: Expense[];
  otherExpenses?: Expense[];
  onDone: () => void;
  refetch: () => void;
  destination?: string;
  country?: string;
}

export default function InlineExpenseEditor({ tripId, isDemo, isCompleted, initialExpenses, otherExpenses = [], onDone, refetch, destination, country }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [draftExpenses, setDraftExpenses] = useState<Expense[]>(
    initialExpenses.length > 0 ? [...initialExpenses] : [],
  );

  // 목적지 기반 현지 통화 감지
  const localCurrency = destination ? detectCurrency(destination, country) : null;
  const { rate: exchangeRate } = useExchangeRate(destination, country);
  const localSymbol = localCurrency ? getCurrencySymbol(localCurrency) : '';

  const addDraftExpense = () => setDraftExpenses([...draftExpenses, { category: 'other', amount: 0, currency: 'KRW', label: '' }]);
  const removeDraftExpense = (i: number) => setDraftExpenses(draftExpenses.filter((_, idx) => idx !== i));
  const updateDraftExpense = (i: number, field: keyof Expense, value: string | number) => {
    setDraftExpenses(draftExpenses.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };

  // 현지 통화 → KRW 환산
  const toKRW = (amount: number): number => {
    if (!exchangeRate?.rate || exchangeRate.rate === 0) return 0;
    return Math.round(amount / exchangeRate.rate);
  };

  const handleSave = async () => {
    const valid = draftExpenses.filter((e) => e.amount > 0);
    const allExpenses = [...valid, ...otherExpenses];
    try {
      setSaving(true);
      let sbOk = true;
      if (isDemo) {
        updateDemoTrip(tripId, { expenses: allExpenses });
      } else {
        try {
          await saveExpenses(tripId, allExpenses);
        } catch (err) {
          sbOk = false;
          console.error('[saveExpenses] Supabase 실패, 로컬 저장 fallback:', err);
          updateDemoTrip(tripId, { expenses: allExpenses });
        }
      }
      onDone();
      refetch();
      toast(sbOk ? '경비가 저장되었습니다' : '서버 저장 실패 — 로컬에 임시 저장되었습니다', sbOk ? 'success' : 'error');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 통화 옵션 목록
  const currencyOptions: { code: string; label: string }[] = [
    { code: 'KRW', label: '₩ 원' },
  ];
  if (localCurrency && localCurrency !== 'KRW') {
    currencyOptions.push({ code: localCurrency, label: `${localSymbol} ${localCurrency}` });
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
          {isCompleted ? 'Expenses' : 'Est. Budget'}
        </h3>
        <button
          type="button"
          onClick={addDraftExpense}
          className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-3 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors bg-transparent"
        >
          + Add
        </button>
      </div>

      {/* 환율 안내 (현지 통화가 있을 때) */}
      {localCurrency && exchangeRate && (
        <div className="mb-3 px-3 py-2 bg-[#0d9488]/10 rounded-lg border border-[#0d9488]/20 flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#0d9488] uppercase tracking-wider">Rate</span>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            {localSymbol}1 = {formatCurrency(Math.round(1 / exchangeRate.rate))}
          </span>
        </div>
      )}

      {draftExpenses.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4 font-medium">아직 경비 항목이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {draftExpenses.map((expense, i) => (
            <div key={i} className="space-y-1.5">
              {/* Row 1: 카테고리 + 금액 + 통화 + 삭제 */}
              <div className="flex items-start gap-1.5">
                <select
                  value={expense.category}
                  onChange={(e) => updateDraftExpense(i, 'category', e.target.value)}
                  className="w-20 shrink-0 px-1.5 py-2.5 rounded-lg border-2 border-slate-900 text-[11px] font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{expenseCategoryLabel(cat)}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={expense.amount || ''}
                  onChange={(e) => updateDraftExpense(i, 'amount', Number(e.target.value))}
                  placeholder="금액"
                  min={0}
                  className="flex-1 min-w-0 px-2 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                />
                {localCurrency && currencyOptions.length > 1 ? (
                  <select
                    value={expense.currency || 'KRW'}
                    onChange={(e) => updateDraftExpense(i, 'currency', e.target.value)}
                    className="w-16 shrink-0 px-1 py-2.5 rounded-lg border-2 border-slate-900 text-[10px] font-bold bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                  >
                    {currencyOptions.map((opt) => (
                      <option key={opt.code} value={opt.code}>{opt.code}</option>
                    ))}
                  </select>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeDraftExpense(i)}
                  aria-label="경비 항목 삭제"
                  className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer mt-0.5 bg-transparent border-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Row 2: 설명 */}
              <div className="pl-0">
                <input
                  type="text"
                  value={expense.label}
                  onChange={(e) => updateDraftExpense(i, 'label', e.target.value)}
                  placeholder="설명 (선택)"
                  className="w-full px-2 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-xs font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-slate-900"
                />
              </div>
              {/* KRW 환산 표시 (현지 통화 입력 시) */}
              {expense.currency && expense.currency !== 'KRW' && expense.amount > 0 && exchangeRate && (
                <p className="text-[10px] font-medium text-[#0d9488] pl-1">
                  = {formatCurrency(toKRW(expense.amount))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <SaveCancelButtons onSave={handleSave} onCancel={onDone} saving={saving} />
    </div>
  );
}
