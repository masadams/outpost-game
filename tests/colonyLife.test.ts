import { describe, expect, it } from 'vitest';
import { cartShare, lampAngles, type LifeView } from '../src/render/colonyLife';

const view = (angles: number[]): LifeView => ({
  radius: 1800,
  buildings: angles.map(angle => ({ angle, hauls: true, lit: true })),
  dark: 1,
  powered: true,
});

describe('colony life', () => {
  it('runs a cart from the pad to its building and back, never beyond either', () => {
    let min = 1;
    let max = 0;
    for (let t = 0; t < 200; t += 0.25) {
      const s = cartShare(t, 120, 0.3);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
      min = Math.min(min, s);
      max = Math.max(max, s);
    }
    expect(min).toBeLessThan(0.05);
    expect(max).toBeGreaterThan(0.95);
  });

  it('puts lamp posts in the gaps between buildings, and none across open ground', () => {
    // 90 m and 180 m from the pad: two gaps of 90 m.
    const near = lampAngles(view([0.05, 0.1]));
    expect(near.length).toBeGreaterThanOrEqual(3);
    // None stand on the landing pad.
    for (const a of near) expect(a * 1800).toBeGreaterThan(38);
    // A building a kilometre away gets no line of lamps to it.
    expect(lampAngles(view([0.6]))).toEqual([]);
  });

  it('caps the number of lamps on a very large base', () => {
    const many = Array.from({ length: 80 }, (_, i) => 0.05 * (i + 1));
    expect(lampAngles(view(many)).length).toBeLessThanOrEqual(40);
  });
});
