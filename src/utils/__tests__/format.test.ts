import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, calcDuration, totalExpenses, expenseCategoryLabel } from '../format';

describe('formatCurrency', () => {
  it('formats number with Korean locale and 원 suffix', () => {
    expect(formatCurrency(1000)).toBe('1,000원');
    expect(formatCurrency(0)).toBe('0원');
    expect(formatCurrency(1234567)).toBe('1,234,567원');
  });
});

describe('formatDate', () => {
  it('formats YYYY-MM-DD to YYYY.MM.DD', () => {
    expect(formatDate('2024-03-15')).toBe('2024.03.15');
    expect(formatDate('2024-01-01')).toBe('2024.01.01');
  });

  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('calcDuration', () => {
  it('calculates nights and days', () => {
    expect(calcDuration('2024-03-01', '2024-03-05')).toBe('4박 5일');
    expect(calcDuration('2024-03-01', '2024-03-02')).toBe('1박 2일');
  });

  it('returns empty string when either date is missing', () => {
    expect(calcDuration('', '2024-03-05')).toBe('');
    expect(calcDuration('2024-03-01', '')).toBe('');
  });

  it('returns empty string for invalid dates', () => {
    expect(calcDuration('invalid', '2024-03-05')).toBe('');
  });
});

describe('totalExpenses', () => {
  it('sums expense amounts', () => {
    expect(totalExpenses([{ amount: 100 }, { amount: 200 }, { amount: 300 }])).toBe(600);
  });

  it('returns 0 for empty array', () => {
    expect(totalExpenses([])).toBe(0);
  });
});

describe('expenseCategoryLabel', () => {
  it('returns Korean label for known categories', () => {
    expect(expenseCategoryLabel('flight')).toBe('항공');
    expect(expenseCategoryLabel('hotel')).toBe('숙박');
    expect(expenseCategoryLabel('food')).toBe('식비');
  });

  it('returns raw value for unknown categories', () => {
    expect(expenseCategoryLabel('unknown')).toBe('unknown');
  });
});
