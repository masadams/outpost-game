import { describe, expect, it } from 'vitest';
import { natureOf, onWater, seasOf, treesOf } from '../src/sim/nature';
import { BODIES, bodyExists } from '../src/sim/celestial';
import { createWorld } from '../src/sim/world';
import { placementError } from '../src/sim/colony';
import { colonyWorld } from '../src/sim/localWorld';
import { wrap } from '../src/sim/math';

describe('living worlds', () => {
  it('only some seeds have each new world, and the mix varies', () => {
    const mixes = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      mixes.add(['verdant', 'tide', 'murk'].map(id => (bodyExists(id as 'verdant', { time: 0, binary: true, seed }) ? 1 : 0)).join(''));
    }
    expect(mixes.size).toBeGreaterThan(4);
    expect(bodyExists('verdant', { time: 0, binary: true, seed: 0 })).toBe(false);
  });
  it('have seas that cover about their share of the surface and never the pad', () => {
    for (const seed of [3, 17, 99]) {
      for (const id of ['verdant', 'tide'] as const) {
        const seas = seasOf(id, seed);
        expect(seas.length).toBeGreaterThan(1);
        expect(onWater(id, seed, 0)).toBe(false);
        const covered = seas.reduce((n, s) => n + 2 * s.half, 0) / (2 * Math.PI);
        expect(covered).toBeGreaterThan(natureOf(id).water * 0.5);
        expect(covered).toBeLessThanOrEqual(natureOf(id).water + 1e-9);
      }
      expect(seasOf('murk', seed)).toEqual([]);
      expect(seasOf('home', seed)).toEqual([]);
    }
  });
  it('grow trees only on dry land', () => {
    const trees = treesOf('verdant', 5);
    expect(trees.length).toBeGreaterThan(40);
    expect(trees.every(t => !onWater('verdant', 5, t.angle))).toBe(true);
    expect(treesOf('murk', 5)).toEqual([]);
  });
  it('keep ore seams on dry land', () => {
    for (const seed of [3, 17, 99]) {
      const w = createWorld(seed);
      for (const id of ['verdant', 'tide'] as const) {
        for (const d of w.outposts[id].surfaceDeposits) expect(onWater(id, seed, wrap(d.angle))).toBe(false);
      }
    }
  });
  it('do not let you build on water', () => {
    const w = createWorld(17);
    const site = colonyWorld(w, 'tide');
    const sea = seasOf('tide', 17)[0];
    expect(placementError(site, 'solar', sea.angle, { remote: true })).toBe('Cannot build on water');
  });
  it('have thicker air than home, and Murk the thickest', () => {
    expect(BODIES.murk.air!.surfaceDensity).toBeGreaterThan(BODIES.verdant.air!.surfaceDensity);
    expect(BODIES.verdant.air!.surfaceDensity).toBeGreaterThan(BODIES.home.air!.surfaceDensity);
    expect(natureOf('murk').haze).toBeLessThan(natureOf('verdant').haze);
  });
});
