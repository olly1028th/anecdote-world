import { describe, it, expect } from 'vitest';
import { tripStatusToPinStatus } from '../statusConvert';

describe('tripStatusToPinStatus', () => {
  it('converts completed to visited', () => {
    expect(tripStatusToPinStatus('completed')).toBe('visited');
  });

  it('converts wishlist to wishlist', () => {
    expect(tripStatusToPinStatus('wishlist')).toBe('wishlist');
  });

  it('converts planned to planned', () => {
    expect(tripStatusToPinStatus('planned')).toBe('planned');
  });
});
