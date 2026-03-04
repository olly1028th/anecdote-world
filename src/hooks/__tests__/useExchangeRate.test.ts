import { describe, it, expect } from 'vitest';
import { detectCurrency } from '../useExchangeRate';

describe('detectCurrency', () => {
  it('detects JPY for Japanese destinations', () => {
    expect(detectCurrency('도쿄, 일본')).toBe('JPY');
  });

  it('detects EUR for European countries', () => {
    expect(detectCurrency('파리, 프랑스')).toBe('EUR');
    expect(detectCurrency('로마, 이탈리아')).toBe('EUR');
  });

  it('detects USD for USA', () => {
    expect(detectCurrency('뉴욕, 미국')).toBe('USD');
  });

  it('returns null for Korean destinations', () => {
    expect(detectCurrency('서울, 한국')).toBeNull();
    expect(detectCurrency('제주')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectCurrency('')).toBeNull();
  });

  it('returns null for unknown destinations', () => {
    expect(detectCurrency('우주')).toBeNull();
  });
});
