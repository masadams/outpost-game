import { describe, expect, it } from 'vitest';
import { REFERENCE_MASS, turnAgility } from '../src/sim/handling';

describe('ship handling', () => {
  it('is neutral at the reference mass', () => {
    expect(turnAgility(REFERENCE_MASS)).toBeCloseTo(1, 6);
  });
  it('turns a light ship faster than a laden one', () => {
    expect(turnAgility(REFERENCE_MASS * 0.6)).toBeGreaterThan(turnAgility(REFERENCE_MASS * 1.8));
  });
  it('stays inside a gentle range', () => {
    expect(turnAgility(1)).toBeLessThanOrEqual(1.08);
    expect(turnAgility(1e9)).toBeGreaterThanOrEqual(0.92);
  });
});
