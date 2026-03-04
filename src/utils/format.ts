export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function calcDuration(start: string, end: string): string {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const nights = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return `${nights}박 ${nights + 1}일`;
}

export function totalExpenses(expenses: { amount: number }[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/** 통화 기호 포함 금액 포맷 */
export function formatAmount(amount: number, currency?: string, symbol?: string): string {
  if (!currency || currency === 'KRW') {
    return amount.toLocaleString('ko-KR') + '원';
  }
  const s = symbol || currency;
  return s + amount.toLocaleString('ko-KR');
}

/** 다중 통화 경비 합계 (KRW 환산, exchangeRate = KRW→LOCAL rate) */
export function totalExpensesInKRW(
  expenses: { amount: number; currency?: string }[],
  exchangeRate?: number,
): number {
  return expenses.reduce((sum, e) => {
    if (!e.currency || e.currency === 'KRW') return sum + e.amount;
    if (!exchangeRate || exchangeRate === 0) return sum + e.amount;
    return sum + Math.round(e.amount / exchangeRate);
  }, 0);
}

export function expenseCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    flight: '항공',
    hotel: '숙박',
    food: '식비',
    transport: '교통',
    activity: '관광/활동',
    shopping: '쇼핑',
    other: '기타',
  };
  return labels[category] || category;
}
