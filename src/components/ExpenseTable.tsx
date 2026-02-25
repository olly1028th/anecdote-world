import type { Expense } from '../types/trip';
import { formatCurrency, expenseCategoryLabel, totalExpenses } from '../utils/format';

interface Props {
  expenses: Expense[];
  isEstimate?: boolean;
  budget?: number;
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

export default function ExpenseTable({ expenses, isEstimate = false, budget }: Props) {
  const total = totalExpenses(expenses);

  // 카테고리별 합계
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const maxCategoryAmount = Math.max(...Object.values(categoryTotals), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
        {isEstimate ? 'Est. Budget' : 'Expenses'}
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

      <div className="space-y-2.5">
        {expenses.map((expense, i) => (
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
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(expense.amount)}
            </span>
          </div>
        ))}
      </div>

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
