import { describe, expect, it } from 'vitest';
import { kickForBreak, kickForHit } from '../src/render/effects';
import { streakAt } from '../src/render/ambient';
import type { Area } from '../src/audio/soundscape';

describe('camera kicks', () => {
  it('a rock breaking close thuds more than one far away, and none past the reach', () => {
    expect(kickForBreak(40, 20)).toBeGreaterThan(kickForBreak(300, 20));
    expect(kickForBreak(500, 20)).toBe(0);
    expect(kickForBreak(60, 40)).toBeGreaterThan(kickForBreak(60, 8));
    expect(kickForBreak(0, 100)).toBeLessThanOrEqual(0.5);
  });

  it('a bigger hit rattles harder and longer, within bounds', () => {
    const small = kickForHit(2);
    const big = kickForHit(40);
    expect(big.strength).toBeGreaterThan(small.strength);
    expect(big.seconds).toBeGreaterThan(small.seconds);
    expect(big.strength).toBeLessThanOrEqual(1);
  });
});

describe('shooting stars', () => {
  it('are the same every time for the same moment, stay on screen, and come every few seconds', () => {
    let seen = 0;
    for (let t = 0; t < 120; t += 0.1) {
      const s = streakAt(t);
      expect(streakAt(t)).toEqual(s);
      if (!s) continue;
      seen++;
      for (const v of [s.x0, s.x1]) expect(v).toBeGreaterThan(0);
      for (const v of [s.x0, s.x1]) expect(v).toBeLessThan(1);
      expect(s.alpha).toBeGreaterThanOrEqual(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
    expect(seen).toBeGreaterThan(80);
    expect(seen).toBeLessThan(200);
  });
});

