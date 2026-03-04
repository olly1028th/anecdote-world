import { describe, it, expect } from 'vitest';
import { getCountryFlagUrl } from '../countryFlag';

describe('getCountryFlagUrl', () => {
  it('returns flag URL for Korean country names', () => {
    expect(getCountryFlagUrl('일본')).toBe('https://flagcdn.com/w160/jp.png');
    expect(getCountryFlagUrl('미국')).toBe('https://flagcdn.com/w160/us.png');
  });

  it('returns flag URL for English country names', () => {
    expect(getCountryFlagUrl('Japan')).toBe('https://flagcdn.com/w160/jp.png');
    expect(getCountryFlagUrl('france')).toBe('https://flagcdn.com/w160/fr.png');
  });

  it('extracts country from comma-separated destination', () => {
    expect(getCountryFlagUrl('도쿄, 일본')).toBe('https://flagcdn.com/w160/jp.png');
  });

  it('supports custom width', () => {
    expect(getCountryFlagUrl('한국', 80)).toBe('https://flagcdn.com/w80/kr.png');
  });

  it('returns empty string for empty input', () => {
    expect(getCountryFlagUrl('')).toBe('');
  });

  it('returns empty string for unknown country', () => {
    expect(getCountryFlagUrl('알 수 없는 나라')).toBe('');
  });
});
