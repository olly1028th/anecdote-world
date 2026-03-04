import { useState, useMemo } from 'react';
import { saveExpenses, updateDemoTrip } from '../hooks/useTrips';
import { useExchangeRate, detectCurrency, getCurrencySymbol } from '../hooks/useExchangeRate';
import { useToast } from '../contexts/ToastContext';
import { SaveCancelButtons } from './InlineEditButtons';
import { EXPENSE_CATEGORIES } from '../constants/tripConstants';
import { expenseCategoryLabel, formatCurrency, formatDate, totalExpensesInKRW } from '../utils/format';
import type { Expense } from '../types/trip';

interface Props {
  tripId: string;
  isDemo: boolean;
  initialExpenses: Expense[];
  otherExpenses?: Expense[];
  onDone: () => void;
  refetch: () => void;
  destination?: string;
  startDate?: string;
  endDate?: string;
}

interface DayOption {
  date: string;
  dayNum: number;
  label: string;
}

export default function InlineDailySpendingEditor({
  tripId, isDemo, initialExpenses, otherExpenses = [], onDone, refetch, destination, startDate, endDate,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [draftExpenses, setDraftExpenses] = useState<Expense[]>(
    initialExpenses.length > 0 ? [...initialExpenses] : [],
  );

  // 목적지 기반 현지 통화 감지
  const localCurrency = destination ? detectCurrency(destination) : null;
  const { rate: exchangeRate } = useExchangeRate(destination);
  const localSymbol = localCurrency ? getCurrencySymbol(localCurrency) : '';

  // 여행 일자 목록 생성
  const dayOptions = useMemo<DayOption[]>(() => {
    if (!startDate) return [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const opts: DayOption[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      opts.push({
        date: dateStr,
        dayNum: i + 1,
        label: `Day ${i + 1}`,
      });
    }
    return opts;
  }, [startDate, endDate]);

  // 날짜별 그룹핑 (정렬 포함)
  const groupedByDay = useMemo(() => {
    const groups = new Map<string, { items: Expense[]; indices: number[] }>();
    draftExpenses.forEach((e, idx) => {
      const key = e.spentAt || 'undated';
      if (!groups.has(key)) groups.set(key, { items: [], indices: [] });
      groups.get(key)!.items.push(e);
      groups.get(key)!.indices.push(idx);
    });
    // 날짜순 정렬
    const sorted = [...groups.entries()].sort(([a], [b]) => {
      if (a === 'undated') return 1;
      if (b === 'undated') return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [draftExpenses]);

  // 통화 옵션
  const currencyOptions: { code: string }[] = [{ code: 'KRW' }];
  if (localCurrency && localCurrency !== 'KRW') {
    currencyOptions.push({ code: localCurrency });
  }

  const toKRW = (amount: number): number => {
    if (!exchangeRate?.rate || exchangeRate.rate === 0) return 0;
    return Math.round(amount / exchangeRate.rate);
  };

  // 특정 Day에 항목 추가
  const addItemToDay = (date: string) => {
    setDraftExpenses([...draftExpenses, {
      category: 'food',
      amount: 0,
      currency: localCurrency || 'KRW',
      label: '',
      spentAt: date,
    }]);
  };

  // 새 Day 추가 (다음 사용 가능한 날짜)
  const addNewDay = () => {
    const usedDates = new Set(draftExpenses.map((e) => e.spentAt).filter(Boolean));
    const nextDay = dayOptions.find((d) => !usedDates.has(d.date));
    const date = nextDay?.date || dayOptions[0]?.date || (startDate || new Date().toISOString().split('T')[0]);
    addItemToDay(date);
  };

  const removeItem = (idx: number) => {
    setDraftExpenses(draftExpenses.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof Expense, value: string | number) => {
    setDraftExpenses(draftExpenses.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const handleSave = async () => {
    const valid = draftExpenses.filter((e) => e.amount > 0 && e.spentAt);
    const allExpenses = [...otherExpenses, ...valid];
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
      toast(sbOk ? '일일 지출이 저장되었습니다' : '서버 저장 실패 — 로컬에 임시 저장되었습니다', sbOk ? 'success' : 'error');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Day 번호 찾기
  const getDayNum = (date: string): number | null => {
    const opt = dayOptions.find((d) => d.date === date);
    return opt?.dayNum ?? null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-[#0d9488] retro-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#0d9488]">Daily Spending</h3>
        <button
          type="button"
          onClick={addNewDay}
          className="text-[10px] font-bold uppercase tracking-widest text-[#0d9488] hover:text-[#0b7c72] cursor-pointer border-2 border-[#0d9488] px-3 py-1 rounded-full hover:bg-[#0d9488]/10 transition-colors bg-transparent"
        >
          + Day
        </button>
      </div>

      {/* 환율 안내 */}
      {localCurrency && exchangeRate && (
        <div className="mb-3 px-3 py-2 bg-[#0d9488]/10 rounded-lg border border-[#0d9488]/20 flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#0d9488] uppercase tracking-wider">Rate</span>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            {localSymbol}1 = {formatCurrency(Math.round(1 / exchangeRate.rate))}
          </span>
        </div>
      )}

      {draftExpenses.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-slate-400 font-medium mb-2">아직 일일 지출이 없습니다</p>
          <p className="text-[10px] text-slate-300">위 "+ Day" 버튼으로 지출을 기록해보세요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map(([dateKey, { indices }]) => {
            const dayNum = dateKey !== 'undated' ? getDayNum(dateKey) : null;
            const dayItems = indices.map((idx) => ({ idx, expense: draftExpenses[idx] }));
            const dayTotal = totalExpensesInKRW(
              dayItems.map((d) => d.expense),
              exchangeRate?.rate,
            );

            return (
              <div key={dateKey} className="space-y-2">
                {/* Day 헤더 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#0d9488]">
                      {dayNum ? `Day ${dayNum}` : '날짜 미지정'}
                    </span>
                    {dateKey !== 'undated' && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        ({formatDate(dateKey)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{formatCurrency(dayTotal)}</span>
                    <button
                      type="button"
                      onClick={() => addItemToDay(dateKey !== 'undated' ? dateKey : dayOptions[0]?.date || '')}
                      className="text-[9px] font-bold text-[#0d9488] hover:text-[#0b7c72] cursor-pointer bg-transparent border-0 p-0"
                    >
                      + 항목
                    </button>
                  </div>
                </div>

                {/* Day 항목들 */}
                <div className="space-y-2 pl-2 border-l-2 border-[#0d9488]/20">
                  {dayItems.map(({ idx, expense }) => (
                    <div key={idx} className="space-y-1">
                      {/* Row 1: 카테고리 + 금액 + 통화 + 삭제 */}
                      <div className="flex items-start gap-1.5">
                        <select
                          value={expense.category}
                          onChange={(e) => updateItem(idx, 'category', e.target.value)}
                          className="w-[72px] shrink-0 px-1 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-[10px] font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488]"
                        >
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{expenseCategoryLabel(cat)}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={expense.amount || ''}
                          onChange={(e) => updateItem(idx, 'amount', Number(e.target.value))}
                          placeholder="금액"
                          min={0}
                          className="flex-1 min-w-0 px-2 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-xs font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488]"
                        />
                        {currencyOptions.length > 1 && (
                          <select
                            value={expense.currency || 'KRW'}
                            onChange={(e) => updateItem(idx, 'currency', e.target.value)}
                            className="w-14 shrink-0 px-1 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-[10px] font-bold bg-white dark:bg-[#2a1f15] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488]"
                          >
                            {currencyOptions.map((opt) => (
                              <option key={opt.code} value={opt.code}>{opt.code}</option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="shrink-0 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer mt-0.5 bg-transparent border-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {/* Row 2: 설명 */}
                      <input
                        type="text"
                        value={expense.label}
                        onChange={(e) => updateItem(idx, 'label', e.target.value)}
                        placeholder="어디서 뭘 샀는지"
                        className="w-full px-2 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-[11px] font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488]"
                      />
                      {/* KRW 환산 */}
                      {expense.currency && expense.currency !== 'KRW' && expense.amount > 0 && exchangeRate && (
                        <p className="text-[10px] font-medium text-[#0d9488]">
                          = {formatCurrency(toKRW(expense.amount))}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SaveCancelButtons onSave={handleSave} onCancel={onDone} saving={saving} />
    </div>
  );
}
