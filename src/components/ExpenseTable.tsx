import type { Expense } from '../types/trip';
import { formatCurrency, expenseCategoryLabel, totalExpenses } from '../utils/format';

interface Props {
  expenses: Expense[];
  isEstimate?: boolean;
}

export default function ExpenseTable({ expenses, isEstimate = false }: Props) {
  const total = totalExpenses(expenses);

  return (
    <div className="bg-white rounded-xl p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        {isEstimate ? '예상 경비' : '경비 내역'}
      </h3>
      <div className="space-y-3">
        {expenses.map((expense, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">
                {expenseCategoryLabel(expense.category)}
              </span>
              {expense.label && (
                <span className="text-xs text-gray-400">({expense.label})</span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(expense.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          {isEstimate ? '총 예상' : '총합'}
        </span>
        <span className="text-lg font-bold text-gray-900">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
