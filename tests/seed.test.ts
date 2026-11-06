import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { createSurfaceDeposits } from '../src/sim/geology';
import { childSeed } from '../src/sim/seed';
import { oldImpactOre } from '../src/sim/rockFall';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { newWorld, worldSeed } from '../src/preferences/sun';

describe('world seed', () => {
  it('seed 0 is the standard layout, unchanged', () => {
    expect(createWorld(0)).toEqual(createWorld());
    expect(createWorld().surfaceDeposits[0]).toMatchObject({ resource: 'iron', initial: 180 });
  });

  it('the same seed gives the same world; a different seed gives a different one', () => {
    expect(createWorld(12345)).toEqual(createWorld(12345));
    const a = createWorld(12345);
    const b = createWorld(777);
    expect(a.surfaceDeposits.map(d => d.initial)).not.toEqual(b.surfaceDeposits.map(d => d.initial));
    expect(a.asteroids.map(r => r.mass)).not.toEqual(b.asteroids.map(r => r.mass));
    expect(a.surfaceDeposits.map(d => d.initial)).not.toEqual(createWorld(0).surfaceDeposits.map(d => d.initial));
  });

  it('every seed starts fair: the seams near the pad are never smaller than standard, and no seam vanishes', () => {
    const standard = createSurfaceDeposits();
    for (let seed = 1; seed <= 200; seed++) {
      const varied = createSurfaceDeposits(undefined, 'home', seed);
      expect(varied).toHaveLength(standard.length);
      for (let i = 0; i < 3; i++) expect(varied[i].initial).toBeGreaterThanOrEqual(standard[i].initial);
      for (let i = 0; i < varied.length; i++) {
        expect(varied[i].initial).toBeGreaterThan(standard[i].initial * 0.7);
        expect(varied[i].resource).toBe(standard[i].resource);
        expect(varied[i].angle).toBe(standard[i].angle);
      }
    }
  });

  it('parts of the world have their own streams, so one cannot change another', () => {
    expect(childSeed(5, 'belt/frost')).not.toBe(childSeed(5, 'belt/copper'));
    expect(childSeed(5, 'belt/frost')).toBe(childSeed(5, 'belt/frost'));
    const w = createWorld(99);
    const before = w.outposts.cinder.surfaceDeposits.map(d => d.initial);
    expect(createWorld(99).outposts.cinder.surfaceDeposits.map(d => d.initial)).toEqual(before);
  });

  it('the starting ore varies a little but never runs short', () => {
    const w = createWorld(31);
    const standard = oldImpactOre(() => 1, w.system, 0).map(o => o.mass);
    const varied = oldImpactOre(() => 1, w.system, 31).map(o => o.mass);
    varied.forEach((mass, i) => expect(mass).toBeGreaterThanOrEqual(Math.round(standard[i] * 0.8)));
  });

  it('is kept in the save and a day-cycle game picks its own, repeatable by ?seed', () => {
    const w = createWorld(4242);
    expect(decodeCheckpoint(encodeCheckpoint(w)).seed).toBe(4242);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.surfaceDeposits).toEqual(w.surfaceDeposits);
    expect(newWorld(0).seed).toBe(0);
    expect(newWorld(88).seed).toBe(88);
    expect(worldSeed()).toBeGreaterThan(0);
  });
});
