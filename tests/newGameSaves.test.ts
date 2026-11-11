import { describe, expect, it } from 'vitest';
import { newWorld } from '../src/preferences/sun';
import { stepWorld } from '../src/sim/world';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

describe('a new game', () => {
  // New games pick any seed up to 2^32 - 1; every one must save from the start and after a while.
  for (const seed of [1, 999_999_999, 1_000_000_001, 1_586_763_694, 3_978_916_274, 4_294_967_295]) {
    it(`saves and loads with seed ${seed}`, () => {
      const w = newWorld(seed);
      expect(() => encodeCheckpoint(w)).not.toThrow();
      for (let i = 0; i < 120; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.5);
      const loaded = decodeCheckpoint(encodeCheckpoint(w));
      expect(loaded.seed).toBe(seed);
    });
  }
});

describe('saving a base whose stores have shrunk', () => {
  it('still saves when materials, ore and power sit above what the stores now hold', async () => {
    const { createWorld: make } = await import('../src/sim/world');
    const { encodeCheckpoint: encode, decodeCheckpoint: decode, saveProblem } = await import('../src/persistence/checkpoint');
    const w = make(4242);
    // As after a storage building and a battery were demolished or cut off from the grid.
    w.colony.products.alloy = 260;
    w.depot.iron = 900;
    w.colony.energy = 5000;
    const loaded = decode(encode(w));
    expect(loaded.colony.products.alloy).toBe(260);
    expect(loaded.depot.iron).toBe(900);
    // Power is settled to what the store holds; it would be on the next step anyway.
    expect(loaded.colony.energy).toBeLessThanOrEqual(5000);
    expect(saveProblem(w)).toBeDefined();
  });

  it('names the part of the game that stops a save', async () => {
    const { createWorld: make } = await import('../src/sim/world');
    const { encodeCheckpoint: encode, SaveRefused } = await import('../src/persistence/checkpoint');
    const w = make(4242);
    w.colony.products.alloy = Number.NaN;
    let area = '';
    try {
      encode(w);
    } catch (error) {
      area = error instanceof SaveRefused ? error.area : 'not refused';
    }
    expect(area).toBe('stored materials');
  });
});
