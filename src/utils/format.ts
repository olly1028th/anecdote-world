export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function calcDuration(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const nights = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return `${nights}박 ${nights + 1}일`;
}

export function totalExpenses(expenses: { amount: number }[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function expenseCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    flight: '항공',
    hotel: '숙박',
    food: '식비',
    transport: '교통',
    activity: '관광/활동',
    other: '기타',
  };
  return labels[category] || category;
}
