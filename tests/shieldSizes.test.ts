import { describe, expect, it } from 'vitest';
import { SHIELDS } from '../src/sim/shieldConfig';

describe('shield coverage', () => {
  it('lets a few small domes or one or two large ones cover an ordinary base', () => {
    // An ordinary base spreads about 400 to 500 m along the ground.
    expect(SHIELDS.shieldSmall.radius).toBe(120);
    expect(SHIELDS.shieldLarge.radius).toBe(240);
    expect(SHIELDS.shieldSmall.radius * 2 * 2).toBeGreaterThanOrEqual(450);
    expect(SHIELDS.shieldLarge.radius * 2).toBeGreaterThanOrEqual(450);
  });
});
