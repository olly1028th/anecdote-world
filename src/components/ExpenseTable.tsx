import type { Expense } from '../types/trip';
import { formatCurrency, formatAmount, formatDate, expenseCategoryLabel, totalExpensesInKRW } from '../utils/format';
import { getCurrencySymbol } from '../hooks/useExchangeRate';

interface Props {
  expenses: Expense[];
  isEstimate?: boolean;
  budget?: number;
  startDate?: string;
  localCurrency?: string;
  exchangeRate?: number;    // KRW→localCurrency rate
  currencySymbol?: string;
  title?: string;
}

const categoryIcons: Record<string, string> = {
  flight: '✈️',
  hotel: '🏨',
  food: '🍽️',
  transport: '🚕',
  activity: '🎭',
  shopping: '🛍️',
  other: '📦',
};

/** KRW 환산 */
function toKRW(amount: number, currency: string | undefined, rate: number | undefined): number {
  if (!currency || currency === 'KRW') return amount;
  if (!rate || rate === 0) return amount;
  return Math.round(amount / rate);
}

/** 일자별 그룹핑 */
function groupByDate(expenses: Expense[], startDate?: string) {
  const hasAnyDate = expenses.some((e) => e.spentAt);
  if (!hasAnyDate) return null; // 날짜 없으면 그룹핑 안 함

  const groups = new Map<string, Expense[]>();
  const undated: Expense[] = [];

  for (const e of expenses) {
    if (e.spentAt) {
      const key = e.spentAt;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    } else {
      undated.push(e);
    }
  }

  // 날짜순 정렬
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Day 번호 계산
  const startMs = startDate ? new Date(startDate).getTime() : null;
  const result = sorted.map(([date, items]) => {
    let dayNum: number | null = null;
    if (startMs) {
      const diff = Math.floor((new Date(date).getTime() - startMs) / (1000 * 60 * 60 * 24));
      dayNum = diff + 1;
    }
    return { date, dayNum, items };
  });

  return { groups: result, undated };
}

export default function ExpenseTable({ expenses, isEstimate = false, budget, startDate, exchangeRate, currencySymbol, title }: Props) {
  const hasMultiCurrency = expenses.some((e) => e.currency && e.currency !== 'KRW');
  const total = hasMultiCurrency
    ? totalExpensesInKRW(expenses, exchangeRate)
    : expenses.reduce((s, e) => s + e.amount, 0);

  // 카테고리별 합계 (KRW 환산)
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    const krw = toKRW(e.amount, e.currency, exchangeRate);
    acc[e.category] = (acc[e.category] || 0) + krw;
    return acc;
  }, {});
  const maxCategoryAmount = Math.max(...Object.values(categoryTotals), 1);

  // 일자별 그룹핑
  const grouped = groupByDate(expenses, startDate);

  /** 단일 경비 항목 렌더 */
  const renderExpenseRow = (expense: Expense, i: number) => {
    const isLocal = expense.currency && expense.currency !== 'KRW';
    const sym = isLocal ? (currencySymbol || getCurrencySymbol(expense.currency!)) : undefined;
    return (
      <div key={i} className="flex items-center justify-between bg-[#F9F4E8] dark:bg-slate-700 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{categoryIcons[expense.category] || '📦'}</span>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              {expenseCategoryLabel(expense.category)}
            </span>
            {expense.label && (
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{expense.label}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {isLocal ? formatAmount(expense.amount, expense.currency, sym) : formatCurrency(expense.amount)}
          </span>
          {isLocal && (
            <p className="text-[10px] text-[#0d9488] font-medium">
              ={formatCurrency(toKRW(expense.amount, expense.currency, exchangeRate))}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
        {title || (isEstimate ? 'Est. Budget' : 'Expenses')}
      </h3>

      {/* 예산 한도 진행률 */}
      {budget != null && budget > 0 && (
        <div className="mb-4 p-3 bg-[#F9F4E8] dark:bg-slate-700 rounded-xl border-2 border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Budget Usage</span>
            <span className={`text-xs font-bold ${total > budget ? 'text-[#f43f5e]' : 'text-[#0d9488]'}`}>
              {Math.round((total / budget) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden border border-slate-300 dark:border-slate-500">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                total > budget ? 'bg-[#f43f5e]' : total > budget * 0.8 ? 'bg-[#eab308]' : 'bg-[#0d9488]'
              }`}
              style={{ width: `${Math.min((total / budget) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-400 font-medium">{formatCurrency(total)}</span>
            <span className="text-[10px] text-slate-400 font-medium">/ {formatCurrency(budget)}</span>
          </div>
          {total > budget && (
            <p className="text-[10px] font-bold text-[#f43f5e] mt-1.5">
              예산 초과 {formatCurrency(total - budget)}
            </p>
          )}
        </div>
      )}

      {/* 일자별 그룹 또는 플랫 리스트 */}
      {grouped ? (
        <div className="space-y-4">
          {grouped.groups.map(({ date, dayNum, items }) => {
            const dayTotal = totalExpensesInKRW(items, exchangeRate);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25]">
                    {dayNum != null && dayNum > 0 ? `Day ${dayNum}` : ''} ({formatDate(date)})
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{formatCurrency(dayTotal)}</span>
                </div>
                <div className="space-y-2">
                  {items.map((expense, i) => renderExpenseRow(expense, i))}
                </div>
              </div>
            );
          })}
          {grouped.undated.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">날짜 미지정</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {formatCurrency(totalExpensesInKRW(grouped.undated, exchangeRate))}
                </span>
              </div>
              <div className="space-y-2">
                {grouped.undated.map((expense, i) => renderExpenseRow(expense, i))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {expenses.map((expense, i) => renderExpenseRow(expense, i))}
        </div>
      )}

      {/* 카테고리별 비율 바 */}
      {expenses.length > 1 && Object.keys(categoryTotals).length > 1 && (
        <div className="mt-4 pt-3 border-t-2 border-slate-200 dark:border-slate-600 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">By Category</span>
          {Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs w-6 shrink-0">{categoryIcons[cat] || '📦'}</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#f48c25] rounded-full transition-all"
                    style={{ width: `${(amount / maxCategoryAmount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500 w-16 text-right shrink-0">
                  {formatCurrency(amount)}
                </span>
              </div>
            ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t-2 border-slate-200 dark:border-slate-600 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {isEstimate ? 'Total Budget' : 'Total'}
        </span>
        <span className="text-lg font-bold text-[#f48c25]">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
