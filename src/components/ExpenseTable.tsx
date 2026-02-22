import type { Expense } from '../types/trip';
import { formatCurrency, expenseCategoryLabel, totalExpenses } from '../utils/format';

interface Props {
  expenses: Expense[];
  isEstimate?: boolean;
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

export default function ExpenseTable({ expenses, isEstimate = false }: Props) {
  const total = totalExpenses(expenses);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
        {isEstimate ? 'Est. Budget' : 'Expenses'}
      </h3>
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
