import { useState } from 'react';
import { saveExpenses, updateDemoTrip } from '../hooks/useTrips';
import { useToast } from '../contexts/ToastContext';
import { SaveCancelButtons } from './InlineEditButtons';
import { EXPENSE_CATEGORIES } from '../constants/tripConstants';
import { expenseCategoryLabel } from '../utils/format';
import type { Expense } from '../types/trip';

interface Props {
  tripId: string;
  isDemo: boolean;
  isCompleted: boolean;
  initialExpenses: Expense[];
  onDone: () => void;
  refetch: () => void;
}

export default function InlineExpenseEditor({ tripId, isDemo, isCompleted, initialExpenses, onDone, refetch }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [draftExpenses, setDraftExpenses] = useState<Expense[]>(
    initialExpenses.length > 0 ? [...initialExpenses] : [],
  );

  const addDraftExpense = () => setDraftExpenses([...draftExpenses, { category: 'other', amount: 0, label: '' }]);
  const removeDraftExpense = (i: number) => setDraftExpenses(draftExpenses.filter((_, idx) => idx !== i));
  const updateDraftExpense = (i: number, field: keyof Expense, value: string | number) => {
    setDraftExpenses(draftExpenses.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };

  const handleSave = async () => {
    const valid = draftExpenses.filter((e) => e.amount > 0);
    try {
      setSaving(true);
      let sbOk = true;
      if (isDemo) {
        updateDemoTrip(tripId, { expenses: valid });
      } else {
        try {
          await saveExpenses(tripId, valid);
        } catch (err) {
          sbOk = false;
          console.error('[saveExpenses] Supabase 실패, 로컬 저장 fallback:', err);
          updateDemoTrip(tripId, { expenses: valid });
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
      {draftExpenses.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4 font-medium">아직 경비 항목이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {draftExpenses.map((expense, i) => (
            <div key={i} className="flex items-start gap-2">
              <select
                value={expense.category}
                onChange={(e) => updateDraftExpense(i, 'category', e.target.value)}
                className="w-24 shrink-0 px-2 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
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
                className="w-24 shrink-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
              />
              <input
                type="text"
                value={expense.label}
                onChange={(e) => updateDraftExpense(i, 'label', e.target.value)}
                placeholder="설명"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
              />
              <button
                type="button"
                onClick={() => removeDraftExpense(i)}
                className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer mt-0.5 bg-transparent border-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <SaveCancelButtons onSave={handleSave} onCancel={onDone} saving={saving} />
    </div>
  );
}
