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
    <div className="border-4 border-[#2D3436] rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_0px_#2D3436]">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-black italic uppercase tracking-tighter text-[#2D3436]">
          {isEstimate ? 'Budget' : 'Expenses'}
        </h3>
        <div className="h-[3px] flex-1 bg-[#2D3436]/10 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {expenses.map((expense, i) => (
          <div key={i} className="flex items-center justify-between bg-[#F9F4E8] p-3 rounded-xl border-2 border-[#2D3436]/10">
            <div className="flex items-center gap-2.5">
              <span className="text-base">{categoryIcons[expense.category] || '📦'}</span>
              <div>
                <span className="text-xs font-black text-[#2D3436] uppercase tracking-wider">
                  {expenseCategoryLabel(expense.category)}
                </span>
                {expense.label && (
                  <p className="text-[10px] text-[#2D3436]/40 font-medium mt-0.5">{expense.label}</p>
                )}
              </div>
            </div>
            <span className="text-sm font-black text-[#2D3436]">
              {formatCurrency(expense.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t-4 border-[#2D3436]/10 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-[#2D3436]/50">
          {isEstimate ? 'Total Budget' : 'Total'}
        </span>
        <span className="text-lg font-black text-[#FF6B6B]">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
