import { describe, expect, it } from 'vitest';
import { stormShape, planStorm } from '../src/sim/storm';
import { STORM } from '../src/sim/stormConfig';
import { createWorld } from '../src/sim/world';

describe('seeded storms', () => {
  it('seed 0 is the standard storm', () => {
    expect(stormShape(0, 1)).toMatchObject({ offset: STORM.targetOffset, arrival: 0 });
  });

  it('a seed shapes its storm the same way every time, and differently from another seed', () => {
    const plan = (seed: number) => {
      const w = createWorld(seed);
      w.storm.armed = true;
      planStorm(w);
      return w.storm.far.map(b => [Math.round(b.radius * 10), Math.round(b.health * 100)]);
    };
    expect(plan(11)).toEqual(plan(11));
    expect(plan(11)).not.toEqual(plan(12));
  }, 30000);

  it('stays fair for every seed: the zone keeps off the pad, the first storm is never tougher, and it comes in the same part of the day', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const one = stormShape(seed, 1);
      expect(Math.abs(one.offset)).toBeGreaterThanOrEqual(100);
      expect(Math.abs(one.arrival)).toBeLessThanOrEqual(40);
      for (let i = 0; i < STORM.aim.length; i++) {
        expect(one.tough(i)).toBeLessThanOrEqual(1);
        expect(one.size(i)).toBeGreaterThan(0.8);
        expect(one.size(i)).toBeLessThan(1.2);
      }
    }
  });
});
